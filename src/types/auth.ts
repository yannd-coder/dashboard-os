export type Role = 'superadmin' | 'admin' | 'user';

export interface AppUser {
  id: string;
  prenom: string;
  role: Role;
  is_approved: boolean;
  must_change_pin: boolean;
}

export interface AdminUserRow extends AppUser {
  created_at: string;
  last_login_at: string | null;
}
