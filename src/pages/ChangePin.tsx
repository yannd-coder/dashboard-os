import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { PinPad } from '@/components/auth/PinPad';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

type Step = 'old' | 'new' | 'confirm';

const STEP_LABEL: Record<Step, string> = {
  old: 'PIN actuel',
  new: 'Nouveau PIN',
  confirm: 'Confirme le nouveau PIN',
};

export function ChangePin() {
  const { user, loading, changePin, logout } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('old');
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (step === 'old' && oldPin.length === 4) {
      setStep('new');
      setError(null);
    }
  }, [oldPin, step]);

  useEffect(() => {
    if (step !== 'new' || newPin.length !== 4) return;
    if (newPin === oldPin) {
      setError('Le nouveau PIN doit être différent.');
      setNewPin('');
      return;
    }
    setStep('confirm');
    setError(null);
  }, [newPin, oldPin, step]);

  useEffect(() => {
    if (step !== 'confirm' || confirmPin.length !== 4) return;
    if (confirmPin !== newPin) {
      setError('Les PIN ne correspondent pas.');
      setConfirmPin('');
      return;
    }
    setSubmitting(true);
    changePin(oldPin, newPin).then((res) => {
      setSubmitting(false);
      if (res.ok) {
        navigate('/');
      } else {
        setError(res.error ?? 'Erreur inconnue.');
        setStep('old');
        setOldPin('');
        setNewPin('');
        setConfirmPin('');
      }
    });
  }, [confirmPin, newPin, oldPin, step, changePin, navigate]);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const currentValue = step === 'old' ? oldPin : step === 'new' ? newPin : confirmPin;
  const setCurrent = step === 'old' ? setOldPin : step === 'new' ? setNewPin : setConfirmPin;

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-bg-base px-6">
      <div className="pointer-events-none fixed inset-0 hero-bg" />
      <div className="pointer-events-none fixed inset-0 grid-bg opacity-30" />

      <div className="relative w-full max-w-sm">
        <div className="rounded-2xl border border-border-subtle bg-bg-surface/80 p-8 shadow-card backdrop-blur-xl">
          <div className="mb-6 flex flex-col items-center">
            <div className="text-base font-semibold tracking-wide text-text-primary">
              Bonjour {user.prenom}
            </div>
            <div className="text-xs text-text-tertiary">Change ton PIN temporaire</div>
          </div>

          {/* Stepper */}
          <div className="mb-6 flex items-center justify-center gap-2">
            {(['old', 'new', 'confirm'] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                    s === step
                      ? 'bg-accent-violet text-white'
                      : i < (['old', 'new', 'confirm'] as Step[]).indexOf(step)
                        ? 'bg-accent-violet-soft text-accent-violet'
                        : 'border border-border-subtle text-text-tertiary'
                  }`}
                >
                  {i + 1}
                </div>
                {i < 2 && <div className="h-px w-6 bg-border-subtle" />}
              </div>
            ))}
          </div>

          <div className="mb-3 text-center text-xs font-medium text-text-secondary">
            {STEP_LABEL[step]}
          </div>

          <PinPad value={currentValue} onChange={setCurrent} disabled={submitting} />

          {error && (
            <div className="mt-5 rounded-lg border border-accent-red/30 bg-accent-red/10 px-3 py-2 text-center text-xs text-accent-red">
              {error}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={logout}>
              Se déconnecter
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCurrent('');
                setError(null);
              }}
              disabled={submitting || currentValue.length === 0}
            >
              Effacer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
