import { supabase } from './supabase';
import type { AdminUserRow, AppUser, Role } from '@/types/auth';

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
