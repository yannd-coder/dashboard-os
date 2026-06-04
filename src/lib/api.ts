import { supabase } from './supabase';
import { resolveIcon } from './icons';
import type { AdminUserRow, AppUser, Role } from '@/types/auth';
import type { Agent, GradientName, Machine, Status } from '@/types';

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
