import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import { rpcChangePin, rpcGetUser, rpcLogin } from '@/lib/api';
import type { AppUser } from '@/types/auth';

const STORAGE_KEY = 'dashboard_user_id';

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  login: (prenom: string, pin: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  refresh: () => Promise<void>;
  changePin: (oldPin: string, newPin: string) => Promise<{ ok: boolean; error?: string }>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Re-vérification à chaque mount : on relit l'utilisateur depuis la DB
  useEffect(() => {
    const id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      setLoading(false);
      return;
    }
    rpcGetUser(id)
      .then((u) => {
        if (u) setUser(u);
        else localStorage.removeItem(STORAGE_KEY);
      })
      .catch(() => localStorage.removeItem(STORAGE_KEY))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (prenom: string, pin: string) => {
    try {
      const u = await rpcLogin(prenom.trim(), pin);
      if (!u) return { ok: false, error: 'Prénom ou PIN incorrect.' };
      localStorage.setItem(STORAGE_KEY, u.id);
      setUser(u);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!user) return;
    const u = await rpcGetUser(user.id);
    if (u) setUser(u);
    else logout();
  }, [user, logout]);

  const changePin = useCallback(
    async (oldPin: string, newPin: string) => {
      if (!user) return { ok: false, error: 'Non connecté.' };
      try {
        const ok = await rpcChangePin(user.id, oldPin, newPin);
        if (!ok) return { ok: false, error: 'PIN actuel incorrect.' };
        const fresh = await rpcGetUser(user.id);
        if (fresh) setUser(fresh);
        return { ok: true };
      } catch (err) {
        return { ok: false, error: (err as Error).message };
      }
    },
    [user],
  );

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh, changePin }}>
      {children}
    </AuthContext.Provider>
  );
}
