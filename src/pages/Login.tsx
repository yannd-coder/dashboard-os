import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { PinPad } from '@/components/auth/PinPad';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

export function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const [prenom, setPrenom] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Auto-submit quand PIN atteint 4 chiffres
  useEffect(() => {
    if (pin.length !== 4) return;
    if (!prenom.trim()) {
      setError('Renseigne ton prénom.');
      setPin('');
      return;
    }
    setError(null);
    setSubmitting(true);
    login(prenom, pin).then((res) => {
      setSubmitting(false);
      if (res.ok) {
        navigate('/');
      } else {
        setError(res.error ?? 'Erreur inconnue.');
        setPin('');
      }
    });
  }, [pin, prenom, login, navigate]);

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-bg-base px-6">
      <div className="pointer-events-none fixed inset-0 hero-bg" />
      <div className="pointer-events-none fixed inset-0 grid-bg opacity-30" />

      <div className="relative w-full max-w-sm">
        <div className="rounded-2xl border border-border-subtle bg-bg-surface/80 p-8 shadow-card backdrop-blur-xl">
          <div className="mb-6 flex flex-col items-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-lg font-bold text-black">
              Y
            </div>
            <div className="text-base font-semibold tracking-wide text-text-primary">YANN OS</div>
            <div className="text-xs text-text-tertiary">Connexion</div>
          </div>

          <div className="mb-6">
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Prénom</label>
            <input
              type="text"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              autoFocus
              autoComplete="given-name"
              disabled={submitting}
              placeholder="ex. Yann"
              className="h-10 w-full rounded-lg border border-border-subtle bg-bg-surface2 px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-border-violet focus:outline-none focus:ring-2 focus:ring-accent-violet/30 disabled:opacity-50"
            />
          </div>

          <div className="mb-2 text-center text-xs font-medium text-text-secondary">PIN</div>
          <PinPad value={pin} onChange={setPin} disabled={submitting} />

          {error && (
            <div className="mt-5 rounded-lg border border-accent-red/30 bg-accent-red/10 px-3 py-2 text-center text-xs text-accent-red">
              {error}
            </div>
          )}

          <div className="mt-6 flex items-center justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setPin('');
                setError(null);
              }}
              disabled={submitting || pin.length === 0}
            >
              Effacer
            </Button>
          </div>
        </div>

        <div className="mt-4 text-center text-[11px] text-text-muted">
          Demande un accès à un admin si tu n'as pas encore de compte.
        </div>
      </div>
    </div>
  );
}
