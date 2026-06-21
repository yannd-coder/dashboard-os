import { useCallback, useEffect, useRef, useState } from 'react';
import {
  rpcCreateAgentConversation,
  rpcGetAgentMessages,
  rpcListAgentConversations,
  rpcArchiveAgentConversation,
  rpcRenameAgentConversation,
} from '@/lib/api';
import type { AgentConversation, AgentMessage } from '@/types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const EDGE_URL = `${SUPABASE_URL}/functions/v1/chat-agent`;

export interface UseAgentChatState {
  conversations: AgentConversation[];
  activeConversationId: string | null;
  messages: AgentMessage[];
  loadingConversations: boolean;
  loadingMessages: boolean;
  streaming: boolean;
  error: string | null;
}

export function useAgentChat(agentCode: string, userId: string | undefined) {
  const [conversations, setConversations] = useState<AgentConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const refreshConversations = useCallback(async () => {
    if (!userId) return;
    setLoadingConversations(true);
    try {
      const list = await rpcListAgentConversations(userId, agentCode);
      setConversations(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur conversations');
    } finally {
      setLoadingConversations(false);
    }
  }, [userId, agentCode]);

  const loadMessages = useCallback(async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const msgs = await rpcGetAgentMessages(conversationId);
      setMessages(msgs);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur messages');
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  useEffect(() => {
    if (activeConversationId) loadMessages(activeConversationId);
    else setMessages([]);
  }, [activeConversationId, loadMessages]);

  const openConversation = useCallback((id: string) => {
    setActiveConversationId(id);
    setError(null);
  }, []);

  const newConversation = useCallback(async () => {
    if (!userId) return;
    try {
      const id = await rpcCreateAgentConversation(agentCode, userId);
      await refreshConversations();
      setActiveConversationId(id);
      setMessages([]);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur création conversation');
    }
  }, [userId, agentCode, refreshConversations]);

  const renameConversation = useCallback(
    async (id: string, title: string) => {
      try {
        await rpcRenameAgentConversation(id, title);
        await refreshConversations();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur renommage');
      }
    },
    [refreshConversations],
  );

  const archiveConversation = useCallback(
    async (id: string) => {
      try {
        await rpcArchiveAgentConversation(id);
        if (activeConversationId === id) setActiveConversationId(null);
        await refreshConversations();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur archivage');
      }
    },
    [refreshConversations, activeConversationId],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!userId || !text.trim()) return;
      setError(null);
      let conversationId = activeConversationId;
      if (!conversationId) {
        try {
          conversationId = await rpcCreateAgentConversation(agentCode, userId, text.slice(0, 60));
          setActiveConversationId(conversationId);
          await refreshConversations();
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Erreur création conversation');
          return;
        }
      }

      // Optimistic UI : ajoute le message user + une bulle assistant vide.
      // En cours de streaming on peut créer dynamiquement de nouvelles bulles assistant/tool
      // pour refléter chaque round du loop tool_use.
      const tempUserId = `temp-user-${Date.now()}`;
      let currentAssistantId = `temp-assistant-${Date.now()}-r1`;
      setMessages((prev) => [
        ...prev,
        {
          id: tempUserId,
          role: 'user',
          content: text,
          createdAt: new Date(),
        },
        {
          id: currentAssistantId,
          role: 'assistant',
          content: '',
          createdAt: new Date(),
        },
      ]);

      setStreaming(true);
      const abort = new AbortController();
      abortRef.current = abort;

      try {
        const resp = await fetch(EDGE_URL, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            apikey: SUPABASE_ANON_KEY,
            authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            conversationId,
            agentCode,
            userMessage: text,
            userId,
          }),
          signal: abort.signal,
        });

        if (!resp.ok || !resp.body) {
          const errText = await resp.text();
          throw new Error(`HTTP ${resp.status} ${errText}`);
        }

        const reader = resp.body.getReader();
        const dec = new TextDecoder();
        let buf = '';
        let currentEvent = '';

        // Parse SSE stream
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() ?? '';
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              const payload = line.slice(6).trim();
              if (!payload) continue;
              try {
                const data = JSON.parse(payload);
                if (currentEvent === 'token' && typeof data.text === 'string') {
                  setMessages((prev) => {
                    const copy = [...prev];
                    const idx = copy.findIndex((m) => m.id === currentAssistantId);
                    if (idx >= 0) {
                      copy[idx] = { ...copy[idx], content: copy[idx].content + data.text };
                    }
                    return copy;
                  });
                } else if (currentEvent === 'tool_call') {
                  // Crée ou met à jour la bulle "tool calls" associée au message assistant courant
                  setMessages((prev) => {
                    const copy = [...prev];
                    const idx = copy.findIndex((m) => m.id === currentAssistantId);
                    if (idx >= 0) {
                      const existing = (copy[idx].toolCalls as Array<{ id: string; name: string; input: unknown }>) ?? [];
                      copy[idx] = {
                        ...copy[idx],
                        toolCalls: [
                          ...existing,
                          { id: data.id, name: data.name, input: data.input },
                        ],
                      };
                    }
                    return copy;
                  });
                } else if (currentEvent === 'tool_result') {
                  // Crée/met à jour un message tool dédié, puis prépare une nouvelle bulle assistant pour le round suivant
                  setMessages((prev) => {
                    const copy = [...prev];
                    // Cherche un message tool déjà créé pour ce round, sinon en crée un
                    let toolIdx = copy.length - 1;
                    while (toolIdx >= 0 && copy[toolIdx].role !== 'tool') toolIdx--;
                    // Vérifie qu'on n'a pas un message assistant après le tool (sinon le tool appartient à un round précédent)
                    if (toolIdx < 0 || copy.slice(toolIdx + 1).some((m) => m.role === 'assistant')) {
                      copy.push({
                        id: `temp-tool-${Date.now()}-${data.tool_use_id}`,
                        role: 'tool',
                        content: '',
                        toolResults: [
                          { tool_use_id: data.tool_use_id, content: data.content, is_error: data.isError },
                        ],
                        createdAt: new Date(),
                      });
                    } else {
                      const existing = (copy[toolIdx].toolResults as Array<{ tool_use_id: string; content: string; is_error?: boolean }>) ?? [];
                      copy[toolIdx] = {
                        ...copy[toolIdx],
                        toolResults: [
                          ...existing,
                          { tool_use_id: data.tool_use_id, content: data.content, is_error: data.isError },
                        ],
                      };
                    }
                    return copy;
                  });
                  // Préparer le slot pour le prochain round (l'agent va probablement re-parler après avoir vu le résultat)
                  currentAssistantId = `temp-assistant-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: currentAssistantId,
                      role: 'assistant',
                      content: '',
                      createdAt: new Date(),
                    },
                  ]);
                } else if (currentEvent === 'error') {
                  setError(`${data.message ?? 'erreur'} ${data.detail ?? ''}`.trim());
                }
              } catch {
                // ignore malformed
              }
            } else if (line.trim() === '') {
              currentEvent = '';
            }
          }
        }

        // Refresh from server to get real IDs + persisted metadata
        if (conversationId) await loadMessages(conversationId);
        await refreshConversations();
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          setError(e instanceof Error ? e.message : 'Erreur streaming');
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [userId, agentCode, activeConversationId, refreshConversations, loadMessages],
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  }, []);

  return {
    conversations,
    activeConversationId,
    messages,
    loadingConversations,
    loadingMessages,
    streaming,
    error,
    openConversation,
    newConversation,
    renameConversation,
    archiveConversation,
    sendMessage,
    stopStreaming,
  };
}
