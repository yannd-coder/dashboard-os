// chat-agent — V0.8 étape 2
// POST { conversationId, agentCode, userMessage, userId }
// → streams SSE :
//     event: token          { text }                       (texte assistant streamé)
//     event: tool_call      { id, name, input }            (annonce d'un tool call)
//     event: tool_result    { tool_use_id, content, isError } (résultat d'un tool call)
//     event: done           { messageId, usage, rounds }
//     event: error          { message, detail }
//
// Loop multi-round : tant que stop_reason === 'tool_use', exécute les tools côté
// Deno et rebouclle avec Anthropic. Persiste chaque round (assistant + tool) en DB.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { getSystemPrompt } from './prompts.ts';
import { TOOL_DEFINITIONS, TOOL_HANDLERS, type ToolContext } from './tools.ts';

const ANTHROPIC_API_KEY = Deno.env.get('DASHBOARD_AGENTS_ANTHROPIC_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const N8N_WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL');
const N8N_WEBHOOK_SECRET = Deno.env.get('N8N_WEBHOOK_SECRET');
const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 4096;
const MAX_ROUNDS = 8; // garde-fou : pas plus de 8 round-trips tool_use dans un seul turn

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// Types
// ============================================================================

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean };

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

interface DbMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls: Array<{ id: string; name: string; input: unknown }> | null;
  tool_results: Array<{ tool_use_id: string; content: string; is_error?: boolean }> | null;
}

// ============================================================================
// Supabase helpers
// ============================================================================

async function rpc<T>(fn: string, params: Record<string, unknown>): Promise<T> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(params),
  });
  if (!r.ok) throw new Error(`RPC ${fn} failed: ${r.status} ${await r.text()}`);
  return r.json() as Promise<T>;
}

function sseEvent(type: string, payload: unknown): string {
  return `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
}

// ============================================================================
// History reconstruction : DB rows → Anthropic messages format
// ============================================================================

function dbToAnthropic(dbMessages: DbMessage[]): AnthropicMessage[] {
  const out: AnthropicMessage[] = [];
  for (const m of dbMessages) {
    if (m.role === 'user') {
      out.push({ role: 'user', content: m.content ?? '' });
    } else if (m.role === 'assistant') {
      const blocks: ContentBlock[] = [];
      if (m.content && m.content.trim()) {
        blocks.push({ type: 'text', text: m.content });
      }
      if (m.tool_calls && m.tool_calls.length > 0) {
        for (const tc of m.tool_calls) {
          blocks.push({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.input });
        }
      }
      // Anthropic requires non-empty content; fall back to a single text block if both empty
      out.push({
        role: 'assistant',
        content: blocks.length > 0 ? blocks : [{ type: 'text', text: '' }],
      });
    } else if (m.role === 'tool') {
      const blocks: ContentBlock[] = [];
      if (m.tool_results && m.tool_results.length > 0) {
        for (const tr of m.tool_results) {
          blocks.push({
            type: 'tool_result',
            tool_use_id: tr.tool_use_id,
            content: tr.content,
            is_error: tr.is_error ?? false,
          });
        }
      }
      if (blocks.length > 0) out.push({ role: 'user', content: blocks });
    }
  }
  return out;
}

// ============================================================================
// Stream one Anthropic round, collecting text + tool_use blocks
// ============================================================================

interface RoundResult {
  text: string;
  toolUses: Array<{ id: string; name: string; input: unknown }>;
  stopReason: string | null;
  usage: unknown;
}

async function streamRound(
  controller: ReadableStreamDefaultController<Uint8Array>,
  enc: TextEncoder,
  systemPrompt: string,
  messages: AnthropicMessage[],
): Promise<RoundResult> {
  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages,
      tools: TOOL_DEFINITIONS,
      stream: true,
    }),
  });

  if (!anthropicRes.ok || !anthropicRes.body) {
    const errText = await anthropicRes.text();
    throw new Error(`anthropic_${anthropicRes.status}: ${errText}`);
  }

  const reader = anthropicRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  let text = '';
  let stopReason: string | null = null;
  let usage: unknown = null;
  // Track open content blocks by index : text or tool_use with accumulated partial_json
  const openBlocks: Record<number, { type: 'text' | 'tool_use'; id?: string; name?: string; jsonBuffer?: string }> = {};
  const completedToolUses: Array<{ id: string; name: string; input: unknown }> = [];

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (!payload) continue;
      let evt: any;
      try {
        evt = JSON.parse(payload);
      } catch {
        continue;
      }
      const t = evt.type;
      if (t === 'content_block_start') {
        const idx = evt.index;
        const block = evt.content_block;
        if (block?.type === 'text') {
          openBlocks[idx] = { type: 'text' };
        } else if (block?.type === 'tool_use') {
          openBlocks[idx] = {
            type: 'tool_use',
            id: block.id,
            name: block.name,
            jsonBuffer: '',
          };
        }
      } else if (t === 'content_block_delta') {
        const idx = evt.index;
        const delta = evt.delta;
        if (delta?.type === 'text_delta' && openBlocks[idx]?.type === 'text') {
          text += delta.text;
          controller.enqueue(enc.encode(sseEvent('token', { text: delta.text })));
        } else if (delta?.type === 'input_json_delta' && openBlocks[idx]?.type === 'tool_use') {
          openBlocks[idx].jsonBuffer = (openBlocks[idx].jsonBuffer ?? '') + (delta.partial_json ?? '');
        }
      } else if (t === 'content_block_stop') {
        const idx = evt.index;
        const open = openBlocks[idx];
        if (open?.type === 'tool_use' && open.id && open.name) {
          let parsed: unknown = {};
          try {
            parsed = open.jsonBuffer ? JSON.parse(open.jsonBuffer) : {};
          } catch {
            parsed = { _raw: open.jsonBuffer };
          }
          completedToolUses.push({ id: open.id, name: open.name, input: parsed });
        }
        delete openBlocks[idx];
      } else if (t === 'message_delta') {
        if (evt.delta?.stop_reason) stopReason = evt.delta.stop_reason;
        if (evt.usage) usage = evt.usage;
      }
    }
  }

  return { text, toolUses: completedToolUses, stopReason, usage };
}

// ============================================================================
// Main handler
// ============================================================================

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST')
    return new Response('Method not allowed', { status: 405, headers: CORS });

  let body: { conversationId?: string; agentCode?: string; userMessage?: string; userId?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  }

  const { conversationId, agentCode, userMessage, userId } = body;
  if (!conversationId || !agentCode || !userMessage || !userId) {
    return new Response(
      JSON.stringify({ error: 'missing_fields', need: ['conversationId', 'agentCode', 'userMessage', 'userId'] }),
      { status: 400, headers: { ...CORS, 'content-type': 'application/json' } },
    );
  }

  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'anthropic_key_missing' }), {
      status: 500,
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  }

  // 1. Append user message to DB
  try {
    await rpc('dashboard_append_agent_message', {
      p_conversation_id: conversationId,
      p_role: 'user',
      p_content: userMessage,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'append_user_failed', detail: String(e) }), {
      status: 500,
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  }

  const toolCtx: ToolContext = {
    userId,
    supabaseUrl: SUPABASE_URL,
    supabaseKey: SUPABASE_ANON_KEY,
    n8nWebhookUrl: N8N_WEBHOOK_URL,
    n8nWebhookSecret: N8N_WEBHOOK_SECRET,
  };

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const systemPrompt = getSystemPrompt(agentCode);
      let lastAssistantMessageId: string | null = null;
      let totalUsage: unknown = null;
      let round = 0;

      try {
        while (round < MAX_ROUNDS) {
          round++;

          // Load full history from DB on each round (includes everything we appended)
          const dbRows = await rpc<DbMessage[]>('dashboard_get_agent_messages', {
            p_conversation_id: conversationId,
          });
          const anthropicMessages = dbToAnthropic(dbRows);

          console.log(`[chat-agent] round ${round} — ${anthropicMessages.length} messages, agent=${agentCode}`);

          const result = await streamRound(controller, enc, systemPrompt, anthropicMessages);
          totalUsage = result.usage;

          // Persist assistant message (text + tool_calls if any)
          lastAssistantMessageId = await rpc<string>('dashboard_append_agent_message', {
            p_conversation_id: conversationId,
            p_role: 'assistant',
            p_content: result.text,
            p_tool_calls: result.toolUses.length > 0 ? result.toolUses : null,
            p_metadata: { model: MODEL, usage: result.usage, round },
          });

          // If no tool calls, we're done
          if (result.stopReason !== 'tool_use' || result.toolUses.length === 0) {
            controller.enqueue(enc.encode(sseEvent('done', {
              messageId: lastAssistantMessageId,
              usage: totalUsage,
              rounds: round,
            })));
            controller.close();
            return;
          }

          // Execute tools in parallel; emit tool_call + tool_result events
          for (const tu of result.toolUses) {
            controller.enqueue(enc.encode(sseEvent('tool_call', {
              id: tu.id,
              name: tu.name,
              input: tu.input,
            })));
          }

          const toolResults = await Promise.all(
            result.toolUses.map(async (tu) => {
              const handler = TOOL_HANDLERS[tu.name];
              if (!handler) {
                return {
                  tool_use_id: tu.id,
                  name: tu.name,
                  content: JSON.stringify({ error: `unknown_tool: ${tu.name}` }),
                  is_error: true,
                };
              }
              try {
                const r = await handler(tu.input as Record<string, unknown>, toolCtx);
                return {
                  tool_use_id: tu.id,
                  name: tu.name,
                  content: JSON.stringify(r),
                  is_error: false,
                };
              } catch (e) {
                return {
                  tool_use_id: tu.id,
                  name: tu.name,
                  content: JSON.stringify({ error: String(e) }),
                  is_error: true,
                };
              }
            }),
          );

          for (const tr of toolResults) {
            controller.enqueue(enc.encode(sseEvent('tool_result', {
              tool_use_id: tr.tool_use_id,
              name: tr.name,
              content: tr.content,
              isError: tr.is_error,
            })));
          }

          // Persist tool message
          await rpc('dashboard_append_agent_message', {
            p_conversation_id: conversationId,
            p_role: 'tool',
            p_content: null,
            p_tool_results: toolResults.map((tr) => ({
              tool_use_id: tr.tool_use_id,
              content: tr.content,
              is_error: tr.is_error,
            })),
            p_metadata: { round },
          });
          // Loop continues — next round will re-load history including the tool results
        }

        // Safety net : we hit MAX_ROUNDS
        controller.enqueue(enc.encode(sseEvent('error', {
          message: 'max_rounds_reached',
          detail: `L'agent a fait ${MAX_ROUNDS} round-trips d'outils sans s'arrêter — boucle interrompue.`,
        })));
        controller.enqueue(enc.encode(sseEvent('done', {
          messageId: lastAssistantMessageId,
          usage: totalUsage,
          rounds: round,
        })));
        controller.close();
      } catch (e) {
        console.error('[chat-agent] error:', e);
        controller.enqueue(enc.encode(sseEvent('error', { message: 'stream_failed', detail: String(e) })));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...CORS,
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    },
  });
});
