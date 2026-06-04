import { supabase } from './supabase';
import { resolveIcon } from './icons';
import type { AdminUserRow, AppUser, Role } from '@/types/auth';
import type {
  Agent,
  DraftNetwork,
  DraftStatus,
  GradientName,
  Machine,
  MachineRun,
  PostDraft,
  Status,
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
      'id, machine_run_id, machine_code, network, account_handle, content, status, decided_at, decided_by, notes, created_at',
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
