// Tools dont disposent les agents (V0.8 étape 2).
// Chaque tool a (1) un schema JSON Anthropic, (2) un handler Deno qui appelle Supabase ou n8n.
//
// Convention : tous les handlers reçoivent un { ctx: { userId, supabaseUrl, supabaseKey } }
// pour pouvoir appeler les RPC en tant qu'un user identifié.

export interface ToolContext {
  userId: string;
  supabaseUrl: string;
  supabaseKey: string;
  n8nWebhookUrl: string | undefined;
  n8nWebhookSecret: string | undefined;
}

export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

async function sb<T>(ctx: ToolContext, fn: string, params: Record<string, unknown>): Promise<T> {
  const r = await fetch(`${ctx.supabaseUrl}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: ctx.supabaseKey,
      authorization: `Bearer ${ctx.supabaseKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(params),
  });
  if (!r.ok) throw new Error(`RPC ${fn} failed: ${r.status} ${await r.text()}`);
  return r.json() as Promise<T>;
}

async function sbSelect<T>(
  ctx: ToolContext,
  table: string,
  query: string,
): Promise<T[]> {
  const url = `${ctx.supabaseUrl}/rest/v1/${table}?${query}`;
  const r = await fetch(url, {
    headers: {
      apikey: ctx.supabaseKey,
      authorization: `Bearer ${ctx.supabaseKey}`,
    },
  });
  if (!r.ok) throw new Error(`SELECT ${table} failed: ${r.status} ${await r.text()}`);
  return r.json() as Promise<T[]>;
}

// ============================================================================
// Schemas
// ============================================================================

export const TOOL_DEFINITIONS: AnthropicTool[] = [
  {
    name: 'list_machines',
    description:
      "Liste les machines automatisées de Yann (M01 = posts FB/IG Coliver, M02 = réponse prospects, M03/M04 placeholders). Utilise quand l'utilisateur veut un aperçu des automatisations dispo ou leur statut.",
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'list_recent_drafts',
    description:
      "Liste les derniers drafts d'une machine. M01 = drafts de posts FB/IG en attente d'approbation. À utiliser pour répondre à 'quels posts sont en attente' ou 'montre-moi les drafts récents'.",
    input_schema: {
      type: 'object',
      properties: {
        machine_code: { type: 'string', description: "Code de la machine, ex 'M01'." },
        status: {
          type: 'string',
          enum: ['pending', 'approved', 'rejected', 'published'],
          description: 'Filtre par statut (optionnel).',
        },
        limit: { type: 'integer', description: 'Nb max de drafts à retourner (défaut 5, max 20).' },
      },
      required: ['machine_code'],
    },
  },
  {
    name: 'list_recent_runs',
    description:
      "Historique des derniers runs d'une machine (lancements, succès, erreurs, sources de trigger). Utile pour 'la machine a-t-elle tourné aujourd'hui' ou 'y a eu des erreurs'.",
    input_schema: {
      type: 'object',
      properties: {
        machine_code: { type: 'string', description: "Code (ex M01). Si vide, toutes les machines." },
        limit: { type: 'integer', description: 'Nb max (défaut 5, max 20).' },
      },
    },
  },
  {
    name: 'list_campaign_photos',
    description:
      "Liste les photos disponibles dans la bibliothèque visuelle Coliver (utilisée par M01 pour générer des posts). Filtrable par tag (ex 'plage', 'coworking', 'communaute').",
    input_schema: {
      type: 'object',
      properties: {
        tag: { type: 'string', description: 'Filtre par tag (optionnel).' },
        limit: { type: 'integer', description: 'Nb max (défaut 10, max 30).' },
      },
    },
  },
  {
    name: 'approve_draft',
    description:
      "Approuve un draft. Note: l'approbation ne publie PAS automatiquement le post — elle marque juste le draft comme validé en attendant la publication manuelle. Toujours demander confirmation explicite à Yann avant d'utiliser ce tool.",
    input_schema: {
      type: 'object',
      properties: {
        draft_id: { type: 'string', description: "UUID du draft." },
        notes: { type: 'string', description: 'Note optionnelle.' },
      },
      required: ['draft_id'],
    },
  },
  {
    name: 'reject_draft',
    description:
      "Rejette un draft. Toujours demander confirmation explicite à Yann avant d'utiliser ce tool.",
    input_schema: {
      type: 'object',
      properties: {
        draft_id: { type: 'string', description: "UUID du draft." },
        notes: { type: 'string', description: "Raison du rejet (optionnel mais recommandé)." },
      },
      required: ['draft_id'],
    },
  },
  {
    name: 'list_knowledge_docs',
    description:
      "Liste les documents disponibles dans la base de connaissance Coliver (PDFs, briefs, descriptions, archives uploadés par Yann). Chaque doc a un résumé en 1 phrase qui te permet de savoir quoi chercher dedans. Utilise ce tool en premier quand Yann pose une question sur Coliver dont la réponse pourrait être dans un document métier (thèmes éditoriaux, tarifs, description du lieu, archives de posts, etc.).",
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'read_knowledge_doc',
    description:
      "Lit le contenu complet d'un document de la base de connaissance. À appeler APRÈS list_knowledge_docs pour récupérer le texte d'un doc précis (utilise l'ID retourné). Le texte peut être tronqué à 50000 caractères si le doc est très long.",
    input_schema: {
      type: 'object',
      properties: {
        doc_id: { type: 'string', description: "UUID du document à lire (obtenu via list_knowledge_docs)." },
      },
      required: ['doc_id'],
    },
  },
  {
    name: 'trigger_machine',
    description:
      "Déclenche un run d'une machine (M01 = génère 1 post FB + 1 post IG, M02 = vérifie les nouveaux prospects). À utiliser quand Yann dit explicitement 'lance M01' / 'fais tourner la machine' / 'génère un nouveau post'. Demander confirmation si la demande est ambiguë.",
    input_schema: {
      type: 'object',
      properties: {
        machine_code: { type: 'string', description: "Code (ex M01)." },
      },
      required: ['machine_code'],
    },
  },
];

// ============================================================================
// Handlers
// ============================================================================

type ToolHandler = (input: Record<string, unknown>, ctx: ToolContext) => Promise<unknown>;

function clamp(n: unknown, def: number, max: number): number {
  const v = typeof n === 'number' ? n : def;
  return Math.max(1, Math.min(max, Math.floor(v)));
}

export const TOOL_HANDLERS: Record<string, ToolHandler> = {
  async list_machines(_input, ctx) {
    const rows = await sbSelect<{
      code: string;
      name: string;
      description: string;
      category: string;
      status: string;
      last_run: string | null;
    }>(ctx, 'dashboard_machines', 'select=code,name,description,category,status,last_run&order=code.asc');
    return { machines: rows };
  },

  async list_recent_drafts(input, ctx) {
    const code = String(input.machine_code ?? '').toUpperCase();
    if (!code) throw new Error('machine_code requis');
    const limit = clamp(input.limit, 5, 20);
    const status = input.status ? `&status=eq.${input.status}` : '';
    const rows = await sbSelect<{
      id: string;
      network: string;
      account_handle: string;
      content: string;
      visual_accroche: string | null;
      status: string;
      created_at: string;
    }>(
      ctx,
      'dashboard_posts_drafts',
      `select=id,network,account_handle,content,visual_accroche,status,created_at&machine_code=eq.${code}${status}&order=created_at.desc&limit=${limit}`,
    );
    return { count: rows.length, drafts: rows };
  },

  async list_recent_runs(input, ctx) {
    const limit = clamp(input.limit, 5, 20);
    const codeFilter = input.machine_code
      ? `&machine_code=eq.${String(input.machine_code).toUpperCase()}`
      : '';
    const rows = await sbSelect<{
      id: string;
      machine_code: string;
      trigger_source: string;
      status: string;
      summary: string | null;
      error: string | null;
      started_at: string;
      ended_at: string | null;
    }>(
      ctx,
      'dashboard_machine_runs',
      `select=id,machine_code,trigger_source,status,summary,error,started_at,ended_at${codeFilter}&order=started_at.desc&limit=${limit}`,
    );
    return { count: rows.length, runs: rows };
  },

  async list_campaign_photos(input, ctx) {
    const limit = clamp(input.limit, 10, 30);
    const tagFilter = input.tag
      ? `&tags=cs.{${encodeURIComponent(String(input.tag))}}`
      : '';
    const rows = await sbSelect<{
      id: string;
      public_url: string;
      alt: string | null;
      tags: string[] | null;
      is_active: boolean;
      uploaded_at: string;
    }>(
      ctx,
      'dashboard_campaign_photos',
      `select=id,public_url,alt,tags,is_active,uploaded_at&is_active=eq.true${tagFilter}&order=uploaded_at.desc&limit=${limit}`,
    );
    return { count: rows.length, photos: rows };
  },

  async approve_draft(input, ctx) {
    const draftId = String(input.draft_id ?? '');
    if (!draftId) throw new Error('draft_id requis');
    const ok = await sb<boolean>(ctx, 'dashboard_decide_draft', {
      p_draft_id: draftId,
      p_decision: 'approved',
      p_user_id: ctx.userId,
      p_notes: input.notes ?? null,
    });
    return { success: ok, draft_id: draftId, decision: 'approved' };
  },

  async reject_draft(input, ctx) {
    const draftId = String(input.draft_id ?? '');
    if (!draftId) throw new Error('draft_id requis');
    const ok = await sb<boolean>(ctx, 'dashboard_decide_draft', {
      p_draft_id: draftId,
      p_decision: 'rejected',
      p_user_id: ctx.userId,
      p_notes: input.notes ?? null,
    });
    return { success: ok, draft_id: draftId, decision: 'rejected' };
  },

  async list_knowledge_docs(_input, ctx) {
    const rows = await sbSelect<{
      id: string;
      filename: string;
      summary: string | null;
      char_count: number;
      uploaded_at: string;
    }>(
      ctx,
      'dashboard_knowledge_docs',
      'select=id,filename,summary,char_count,uploaded_at&order=uploaded_at.desc&limit=100',
    );
    return { count: rows.length, docs: rows };
  },

  async read_knowledge_doc(input, ctx) {
    const docId = String(input.doc_id ?? '');
    if (!docId) throw new Error('doc_id requis');
    const rows = await sb<Array<{
      id: string;
      filename: string;
      summary: string | null;
      char_count: number;
      extracted_text: string;
    }>>(ctx, 'dashboard_get_knowledge_doc_text', { p_doc_id: docId });
    if (!rows || rows.length === 0) {
      return { error: 'doc_introuvable', doc_id: docId };
    }
    const row = rows[0];
    const MAX = 50000;
    const text = row.extracted_text ?? '';
    const truncated = text.length > MAX;
    return {
      id: row.id,
      filename: row.filename,
      summary: row.summary,
      char_count: row.char_count,
      content: truncated ? text.slice(0, MAX) + '\n\n[... document tronqué — ' + (text.length - MAX) + ' caractères supplémentaires non affichés ...]' : text,
      truncated,
    };
  },

  async trigger_machine(input, ctx) {
    const code = String(input.machine_code ?? '').toUpperCase();
    if (!code) throw new Error('machine_code requis');
    if (!ctx.n8nWebhookUrl || !ctx.n8nWebhookSecret) {
      return {
        success: false,
        error:
          "Webhook n8n non configuré côté edge function (les secrets N8N_WEBHOOK_URL et N8N_WEBHOOK_SECRET doivent être ajoutés à Supabase).",
      };
    }
    // Dérive l'URL : si base = .../m01-trigger, on remplace par /{code}-trigger
    const url = ctx.n8nWebhookUrl.replace(/[^/]+$/, `${code.toLowerCase()}-trigger`);
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-webhook-secret': ctx.n8nWebhookSecret,
        },
        body: JSON.stringify({
          machine_code: code,
          trigger_source: 'manual',
          triggered_by: ctx.userId,
        }),
        // Timeout court — si le VPS est null-routé, on ne veut pas attendre 60s
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) {
        return { success: false, error: `n8n a renvoyé ${r.status}: ${await r.text()}` };
      }
      return { success: true, machine_code: code, message: 'Run lancé — les drafts apparaîtront dans /machines/' + code };
    } catch (e) {
      const msg = String(e);
      if (msg.includes('timeout') || msg.includes('TimeoutError') || msg.includes('TypeError')) {
        return {
          success: false,
          error: "Le VPS Hostinger ne répond pas (probablement toujours null-routé par Hostinger). Réessaie plus tard, ou contacte le support Hostinger.",
        };
      }
      return { success: false, error: msg };
    }
  },
};
