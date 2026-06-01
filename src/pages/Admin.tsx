import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { rpcCreateUser, rpcDeleteUser, rpcListUsers, rpcUpdateUser } from '@/lib/api';
import type { AdminUserRow, Role } from '@/types/auth';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const ROLES: Role[] = ['superadmin', 'admin', 'user'];

function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export function Admin() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await rpcListUsers();
      setUsers(rows);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateRow = async (id: string, isApproved: boolean, role: Role) => {
    setError(null);
    try {
      await rpcUpdateUser(id, isApproved, role);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const deleteRow = async (id: string, prenom: string) => {
    if (!confirm(`Supprimer le compte ${prenom} ?`)) return;
    setError(null);
    try {
      await rpcDeleteUser(id);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-2xl font-semibold text-text-primary">Admin · Utilisateurs</div>
          <div className="mt-1 text-sm text-text-tertiary">
            Approuve les nouveaux comptes, change les rôles, supprime.
          </div>
        </div>
        <Button
          variant="primary"
          size="md"
          icon={<Plus size={16} />}
          onClick={() => setShowCreate(true)}
        >
          Créer un user
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-accent-red/30 bg-accent-red/10 px-4 py-2 text-xs text-accent-red">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border-subtle bg-bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-bg-surface2 text-left text-xs uppercase tracking-wide text-text-tertiary">
            <tr>
              <th className="px-4 py-3 font-medium">Prénom</th>
              <th className="px-4 py-3 font-medium">Rôle</th>
              <th className="px-4 py-3 font-medium">Approuvé</th>
              <th className="px-4 py-3 font-medium">PIN temp.</th>
              <th className="px-4 py-3 font-medium">Créé</th>
              <th className="px-4 py-3 font-medium">Dernier login</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-text-tertiary">
                  Chargement…
                </td>
              </tr>
            )}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-text-tertiary">
                  Aucun utilisateur.
                </td>
              </tr>
            )}
            {!loading &&
              users.map((u) => {
                const isSelf = u.id === me?.id;
                return (
                  <tr key={u.id} className="text-text-primary">
                    <td className="px-4 py-3 font-medium">
                      {u.prenom} {isSelf && <span className="text-xs text-text-tertiary">(toi)</span>}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        disabled={isSelf}
                        onChange={(e) => updateRow(u.id, u.is_approved, e.target.value as Role)}
                        className="h-8 rounded-md border border-border-subtle bg-bg-surface2 px-2 text-xs disabled:opacity-50"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={isSelf}
                        onClick={() => updateRow(u.id, !u.is_approved, u.role)}
                        className={cn(
                          'inline-flex h-6 items-center rounded-full px-2 text-[11px] font-medium',
                          u.is_approved
                            ? 'bg-accent-green-soft text-accent-green'
                            : 'bg-bg-surface2 text-text-tertiary',
                          'disabled:opacity-50 disabled:cursor-not-allowed',
                        )}
                      >
                        {u.is_approved ? 'oui' : 'non'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-text-tertiary">
                      {u.must_change_pin ? 'à changer' : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-tertiary">{fmtDate(u.created_at)}</td>
                    <td className="px-4 py-3 text-xs text-text-tertiary">
                      {fmtDate(u.last_login_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={isSelf}
                        onClick={() => deleteRow(u.id, u.prenom)}
                        className="rounded-md p-1.5 text-text-tertiary hover:bg-bg-surface2 hover:text-accent-red disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function CreateUserModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [prenom, setPrenom] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState<Role>('user');
  const [approved, setApproved] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!prenom.trim()) {
      setError('Prénom requis.');
      return;
    }
    if (!/^[0-9]{4}$/.test(pin)) {
      setError('PIN : 4 chiffres exactement.');
      return;
    }
    setSubmitting(true);
    try {
      await rpcCreateUser(prenom.trim(), pin, role, approved);
      onCreated();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border-subtle bg-bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm font-semibold text-text-primary">Créer un utilisateur</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-text-tertiary hover:bg-bg-surface2 hover:text-text-primary"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Prénom</label>
            <input
              type="text"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              autoFocus
              className="h-9 w-full rounded-lg border border-border-subtle bg-bg-surface2 px-3 text-sm text-text-primary focus:border-border-violet focus:outline-none focus:ring-2 focus:ring-accent-violet/30"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              PIN temporaire (4 chiffres)
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className="h-9 w-full rounded-lg border border-border-subtle bg-bg-surface2 px-3 text-sm tracking-widest text-text-primary focus:border-border-violet focus:outline-none focus:ring-2 focus:ring-accent-violet/30"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Rôle</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="h-9 w-full rounded-lg border border-border-subtle bg-bg-surface2 px-2 text-sm text-text-primary"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs text-text-secondary">
            <input
              type="checkbox"
              checked={approved}
              onChange={(e) => setApproved(e.target.checked)}
              className="rounded border-border-subtle bg-bg-surface2"
            />
            Approuvé immédiatement
          </label>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-accent-red/30 bg-accent-red/10 px-3 py-2 text-xs text-accent-red">
            {error}
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button variant="primary" size="sm" onClick={submit} disabled={submitting}>
            {submitting ? 'Création…' : 'Créer'}
          </Button>
        </div>
      </div>
    </div>
  );
}
