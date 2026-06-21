import { supabase } from './supabase';
import { resolveIcon } from './icons';
import type { AdminUserRow, AppUser, Role } from '@/types/auth';
import type {
  Agent,
  CampaignPhoto,
  DraftNetwork,
  DraftStatus,
  GradientName,
  Machine,
  MachineRun,
  PostDraft,
  Prospect,
  ProspectSource,
  ProspectStatus,
  ResponseDraft,
  ResponseDraftStatus,
  Status,
  AgentConversation,
  AgentMessage,
  AgentMessageRole,
  KnowledgeDoc,
} from '@/types';

type DashboardAgentRow = {
  id: string;
  code: string;
  name: string;
  role: string;
  description: string;
  status: Status;
  domain: 'coliver' | 'seo' | 'global';
  channels: string[] | null;
  gradient: GradientName;
  icon: string;
  runs: number;
  success_rate: number;
  avg_time: string;
  last_run: string | null;
};

type DashboardMachineRow = {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  category_icon: string;
  status: Status;
  gradient: GradientName;
  icon: string;
  last_run: string | null;
};

export async function fetchAgents(): Promise<Agent[]> {
  const { data, error } = await supabase
    .from('dashboard_agents')
    .select(
      'id, code, name, role, description, status, domain, channels, gradient, icon, runs, success_rate, avg_time, last_run',
    )
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: DashboardAgentRow) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    role: row.role,
    description: row.description,
    status: row.status,
    domain: row.domain,
    channels: row.channels ?? [],
    gradient: row.gradient,
    icon: resolveIcon(row.icon),
    stats: {
      runs: row.runs,
      success: row.success_rate,
      avgTime: row.avg_time,
    },
    lastRun: row.last_run ? new Date(row.last_run) : undefined,
  }));
}

type DashboardMachineRunRow = {
  id: string;
  machine_code: string;
  trigger_source: MachineRun['triggerSource'];
  status: MachineRun['status'];
  summary: string | null;
  error: string | null;
  triggered_by: string | null;
  started_at: string;
  ended_at: string | null;
};

type DashboardDraftRow = {
  id: string;
  machine_run_id: string | null;
  machine_code: string;
  network: DraftNetwork;
  account_handle: string;
  content: string;
  image_urls: { square?: string; story?: string; banner?: string } | null;
  visual_accroche: string | null;
  visual_photo_url: string | null;
  status: DraftStatus;
  decided_at: string | null;
  decided_by: string | null;
  notes: string | null;
  created_at: string;
};

export async function fetchMachineRuns(machineCode: string, limit = 20): Promise<MachineRun[]> {
  const { data, error } = await supabase
    .from('dashboard_machine_runs')
    .select(
      'id, machine_code, trigger_source, status, summary, error, triggered_by, started_at, ended_at',
    )
    .eq('machine_code', machineCode)
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row: DashboardMachineRunRow) => ({
    id: row.id,
    machineCode: row.machine_code,
    triggerSource: row.trigger_source,
    status: row.status,
    summary: row.summary,
    error: row.error,
    triggeredBy: row.triggered_by,
    startedAt: new Date(row.started_at),
    endedAt: row.ended_at ? new Date(row.ended_at) : null,
  }));
}

export async function fetchDrafts(
  machineCode: string,
  status?: DraftStatus,
  limit = 30,
): Promise<PostDraft[]> {
  let query = supabase
    .from('dashboard_posts_drafts')
    .select(
      'id, machine_run_id, machine_code, network, account_handle, content, image_urls, visual_accroche, visual_photo_url, status, decided_at, decided_by, notes, created_at',
    )
    .eq('machine_code', machineCode)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row: DashboardDraftRow) => ({
    id: row.id,
    machineRunId: row.machine_run_id,
    machineCode: row.machine_code,
    network: row.network,
    accountHandle: row.account_handle,
    content: row.content,
    imageUrls: row.image_urls,
    visualAccroche: row.visual_accroche,
    visualPhotoUrl: row.visual_photo_url,
    status: row.status,
    decidedAt: row.decided_at ? new Date(row.decided_at) : null,
    decidedBy: row.decided_by,
    notes: row.notes,
    createdAt: new Date(row.created_at),
  }));
}

export async function rpcDecideDraft(
  draftId: string,
  decision: 'approved' | 'rejected',
  userId: string,
  notes?: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('dashboard_decide_draft', {
    p_draft_id: draftId,
    p_decision: decision,
    p_user_id: userId,
    p_notes: notes ?? null,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function rpcUpdateDraft(
  draftId: string,
  userId: string,
  patch: { content?: string; visualAccroche?: string },
): Promise<boolean> {
  const { data, error } = await supabase.rpc('dashboard_update_draft', {
    p_draft_id: draftId,
    p_user_id: userId,
    p_content: patch.content ?? null,
    p_visual_accroche: patch.visualAccroche ?? null,
    p_image_urls: null,
  });
  if (error) throw error;
  return Boolean(data);
}

type DashboardProspectRow = {
  id: string;
  source: ProspectSource;
  email_from: string | null;
  subject: string | null;
  body: string;
  request_summary: string | null;
  status: ProspectStatus;
  received_at: string | null;
  created_at: string;
};

type DashboardResponseDraftRow = {
  id: string;
  content: string;
  status: ResponseDraftStatus;
  decided_at: string | null;
  notes: string | null;
  created_at: string;
  prospect: DashboardProspectRow | null;
};

function mapProspect(row: DashboardProspectRow): Prospect {
  return {
    id: row.id,
    source: row.source,
    emailFrom: row.email_from,
    subject: row.subject,
    body: row.body,
    requestSummary: row.request_summary,
    status: row.status,
    receivedAt: row.received_at ? new Date(row.received_at) : null,
    createdAt: new Date(row.created_at),
  };
}

export async function fetchResponseDrafts(
  status?: ResponseDraftStatus,
  limit = 30,
): Promise<ResponseDraft[]> {
  let query = supabase
    .from('dashboard_response_drafts')
    .select(
      'id, content, status, decided_at, notes, created_at, prospect:dashboard_prospects(id, source, email_from, subject, body, request_summary, status, received_at, created_at)',
    )
    .eq('machine_code', 'M02')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as unknown as DashboardResponseDraftRow[]).map((row) => ({
    id: row.id,
    content: row.content,
    status: row.status,
    decidedAt: row.decided_at ? new Date(row.decided_at) : null,
    notes: row.notes,
    createdAt: new Date(row.created_at),
    prospect: row.prospect ? mapProspect(row.prospect) : null,
  }));
}

export async function rpcDecideResponseDraft(
  draftId: string,
  decision: 'approved' | 'rejected',
  userId: string,
  notes?: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('dashboard_decide_response_draft', {
    p_draft_id: draftId,
    p_decision: decision,
    p_user_id: userId,
    p_notes: notes ?? null,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function fetchMachines(): Promise<Machine[]> {
  const { data, error } = await supabase
    .from('dashboard_machines')
    .select(
      'id, code, name, description, category, category_icon, status, gradient, icon, last_run',
    )
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: DashboardMachineRow) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    category: row.category,
    categoryIcon: row.category_icon,
    status: row.status,
    gradient: row.gradient,
    icon: resolveIcon(row.icon),
    lastRun: row.last_run ? new Date(row.last_run) : undefined,
  }));
}

export async function rpcLogin(prenom: string, pin: string): Promise<AppUser | null> {
  const { data, error } = await supabase.rpc('dashboard_login', {
    p_prenom: prenom,
    p_pin: pin,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row ?? null;
}

export async function rpcGetUser(userId: string): Promise<AppUser | null> {
  const { data, error } = await supabase.rpc('dashboard_get_user', {
    p_user_id: userId,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row ?? null;
}

export async function rpcChangePin(
  userId: string,
  oldPin: string,
  newPin: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('dashboard_change_pin', {
    p_user_id: userId,
    p_old_pin: oldPin,
    p_new_pin: newPin,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function rpcListUsers(): Promise<AdminUserRow[]> {
  const { data, error } = await supabase.rpc('dashboard_list_users');
  if (error) throw error;
  return (data ?? []) as AdminUserRow[];
}

export async function rpcCreateUser(
  prenom: string,
  pin: string,
  role: Role,
  isApproved: boolean,
): Promise<string> {
  const { data, error } = await supabase.rpc('dashboard_create_user', {
    p_prenom: prenom,
    p_pin: pin,
    p_role: role,
    p_is_approved: isApproved,
  });
  if (error) throw error;
  return data as string;
}

export async function rpcUpdateUser(
  userId: string,
  isApproved: boolean,
  role: Role,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('dashboard_update_user', {
    p_user_id: userId,
    p_is_approved: isApproved,
    p_role: role,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function rpcDeleteUser(userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('dashboard_delete_user', {
    p_user_id: userId,
  });
  if (error) throw error;
  return Boolean(data);
}

// === Campaign Photos (V0.6 — bibliothèque visuelle M01) ===

type DashboardCampaignPhotoRow = {
  id: string;
  storage_path: string;
  public_url: string;
  alt: string | null;
  tags: string[] | null;
  is_active: boolean;
  uploaded_by: string | null;
  uploaded_at: string;
};

function mapCampaignPhoto(row: DashboardCampaignPhotoRow): CampaignPhoto {
  return {
    id: row.id,
    storagePath: row.storage_path,
    publicUrl: row.public_url,
    alt: row.alt,
    tags: row.tags ?? [],
    isActive: row.is_active,
    uploadedBy: row.uploaded_by,
    uploadedAt: new Date(row.uploaded_at),
  };
}

export async function fetchCampaignPhotos(): Promise<CampaignPhoto[]> {
  const { data, error } = await supabase
    .from('dashboard_campaign_photos')
    .select('id, storage_path, public_url, alt, tags, is_active, uploaded_by, uploaded_at')
    .order('uploaded_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: DashboardCampaignPhotoRow) => mapCampaignPhoto(row));
}

export async function uploadCampaignPhoto(
  userId: string,
  blob: Blob,
  alt: string | null,
  tags: string[],
): Promise<CampaignPhoto> {
  const ext =
    blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
  const storagePath = `${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from('campaign-photos')
    .upload(storagePath, blob, {
      contentType: blob.type || 'image/jpeg',
      cacheControl: '31536000',
      upsert: false,
    });
  if (upErr) throw upErr;

  const { data: urlData } = supabase.storage
    .from('campaign-photos')
    .getPublicUrl(storagePath);

  const { data, error } = await supabase.rpc('dashboard_create_campaign_photo', {
    p_user_id: userId,
    p_storage_path: storagePath,
    p_public_url: urlData.publicUrl,
    p_alt: alt,
    p_tags: tags,
  });
  if (error) {
    await supabase.storage.from('campaign-photos').remove([storagePath]).catch(() => undefined);
    throw error;
  }
  return mapCampaignPhoto(data as DashboardCampaignPhotoRow);
}

export async function rpcUpdateCampaignPhoto(
  userId: string,
  photoId: string,
  patch: { alt?: string | null; tags?: string[]; isActive?: boolean },
): Promise<CampaignPhoto> {
  const { data, error } = await supabase.rpc('dashboard_update_campaign_photo', {
    p_user_id: userId,
    p_photo_id: photoId,
    p_alt: patch.alt ?? null,
    p_tags: patch.tags ?? null,
    p_is_active: patch.isActive ?? null,
  });
  if (error) throw error;
  return mapCampaignPhoto(data as DashboardCampaignPhotoRow);
}

export async function rpcDeleteCampaignPhoto(
  userId: string,
  photoId: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('dashboard_delete_campaign_photo', {
    p_user_id: userId,
    p_photo_id: photoId,
  });
  if (error) throw error;
  return Boolean(data);
}

// ============================================================================
// Agent Chat (V0.8 étape 1)
// ============================================================================

type DashboardAgentConversationRow = {
  id: string;
  agent_code: string;
  title: string;
  created_at: string;
  updated_at: string;
};

type DashboardAgentMessageRow = {
  id: string;
  role: AgentMessageRole;
  content: string | null;
  tool_calls: unknown | null;
  tool_results: unknown | null;
  metadata: AgentMessage['metadata'] | null;
  created_at: string;
};

function mapConversation(r: DashboardAgentConversationRow): AgentConversation {
  return {
    id: r.id,
    agentCode: r.agent_code,
    title: r.title,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  };
}

function mapMessage(r: DashboardAgentMessageRow): AgentMessage {
  return {
    id: r.id,
    role: r.role,
    content: r.content ?? '',
    toolCalls: r.tool_calls ?? undefined,
    toolResults: r.tool_results ?? undefined,
    metadata: r.metadata ?? undefined,
    createdAt: new Date(r.created_at),
  };
}

export async function rpcCreateAgentConversation(
  agentCode: string,
  userId: string,
  title = 'Nouvelle conversation',
): Promise<string> {
  const { data, error } = await supabase.rpc('dashboard_create_agent_conversation', {
    p_agent_code: agentCode,
    p_user_id: userId,
    p_title: title,
  });
  if (error) throw error;
  return data as string;
}

export async function rpcListAgentConversations(
  userId: string,
  agentCode?: string,
  limit = 50,
): Promise<AgentConversation[]> {
  const { data, error } = await supabase.rpc('dashboard_list_agent_conversations', {
    p_user_id: userId,
    p_agent_code: agentCode ?? null,
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []).map(mapConversation);
}

export async function rpcGetAgentMessages(conversationId: string): Promise<AgentMessage[]> {
  const { data, error } = await supabase.rpc('dashboard_get_agent_messages', {
    p_conversation_id: conversationId,
  });
  if (error) throw error;
  return (data ?? []).map(mapMessage);
}

export async function rpcRenameAgentConversation(
  conversationId: string,
  title: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('dashboard_rename_agent_conversation', {
    p_conversation_id: conversationId,
    p_title: title,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function rpcArchiveAgentConversation(conversationId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('dashboard_archive_agent_conversation', {
    p_conversation_id: conversationId,
  });
  if (error) throw error;
  return Boolean(data);
}

// ============================================================================
// Knowledge docs (V0.8 étape 3)
// ============================================================================

type DashboardKnowledgeDocRow = {
  id: string;
  filename: string;
  storage_path: string;
  mime: string;
  size_bytes: number;
  summary: string | null;
  char_count: number;
  uploaded_at: string;
};

function mapKnowledgeDoc(r: DashboardKnowledgeDocRow): KnowledgeDoc {
  return {
    id: r.id,
    filename: r.filename,
    storagePath: r.storage_path,
    mime: r.mime,
    sizeBytes: r.size_bytes,
    summary: r.summary,
    charCount: r.char_count,
    uploadedAt: new Date(r.uploaded_at),
  };
}

export async function fetchKnowledgeDocs(): Promise<KnowledgeDoc[]> {
  const { data, error } = await supabase
    .from('dashboard_knowledge_docs')
    .select('id, filename, storage_path, mime, size_bytes, summary, char_count, uploaded_at')
    .order('uploaded_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []).map((row) => mapKnowledgeDoc(row as DashboardKnowledgeDocRow));
}

export async function uploadKnowledgeDoc(
  userId: string,
  file: File,
): Promise<{ docId: string; summary: string; charCount: number }> {
  const ext = file.name.includes('.') ? file.name.split('.').pop() : '';
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${Date.now()}-${safeName}`;

  // 1. Upload vers Storage
  const { error: upErr } = await supabase.storage
    .from('knowledge-docs')
    .upload(storagePath, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    });
  if (upErr) throw upErr;

  // 2. Appeler l'edge function ingest-knowledge
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ingest-knowledge`;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: anonKey,
      authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({
      storagePath,
      filename: file.name,
      mime: file.type || (ext ? `application/${ext}` : 'application/octet-stream'),
      sizeBytes: file.size,
      userId,
    }),
  });

  const json = await resp.json().catch(() => ({}));
  if (!resp.ok || !json.success) {
    // Cleanup storage si l'ingestion a échoué
    await supabase.storage.from('knowledge-docs').remove([storagePath]).catch(() => undefined);
    throw new Error(json.error ? `${json.error}${json.detail ? ` — ${json.detail}` : ''}` : `HTTP ${resp.status}`);
  }
  return { docId: json.docId, summary: json.summary, charCount: json.charCount };
}

export async function rpcDeleteKnowledgeDoc(
  userId: string,
  docId: string,
  storagePath: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('dashboard_delete_knowledge_doc', {
    p_doc_id: docId,
    p_user_id: userId,
  });
  if (error) throw error;
  // Cleanup storage (non bloquant)
  await supabase.storage.from('knowledge-docs').remove([storagePath]).catch(() => undefined);
  return Boolean(data);
}
