import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Facebook,
  Instagram,
  Loader2,
  Play,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/layout/PageHeader';
import { RunsHistory } from '@/components/machines/RunsHistory';
import { MachineDetailM02 } from '@/pages/MachineDetailM02';
import { useMachines } from '@/hooks/useMachines';
import { useMachineRuns } from '@/hooks/useMachineRuns';
import { useDrafts } from '@/hooks/useDrafts';
import { useAuth } from '@/hooks/useAuth';
import { isN8nConfigured, triggerMachine } from '@/lib/n8n';
import { rpcDecideDraft } from '@/lib/api';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { DraftNetwork, PostDraft } from '@/types';

const networkConfig: Record<DraftNetwork, { label: string; icon: typeof Facebook; color: string }> = {
  facebook: { label: 'Facebook', icon: Facebook, color: 'text-[#1877F2]' },
  instagram: { label: 'Instagram', icon: Instagram, color: 'text-[#E1306C]' },
};

export function MachineDetail() {
  const { code } = useParams<{ code: string }>();
  const machineCode = (code ?? '').toUpperCase();
  const { user } = useAuth();
  const { machines, loading: loadingMachine } = useMachines();
  const machine = useMemo(
    () => machines.find((m) => m.code.toUpperCase() === machineCode),
    [machines, machineCode],
  );

  const { runs, loading: loadingRuns, refetch: refetchRuns } = useMachineRuns(machineCode);
  const {
    drafts: pendingDrafts,
    loading: loadingPending,
    refetch: refetchPending,
  } = useDrafts(machineCode, 'pending');
  const { drafts: decidedDrafts, refetch: refetchDecided } = useDrafts(machineCode, undefined, 20);

  const [triggering, setTriggering] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(
    null,
  );
  const [deciding, setDeciding] = useState<string | null>(null);

  const canTrigger = isN8nConfigured() && !triggering;

  async function handleTrigger() {
    setTriggering(true);
    setFeedback(null);
    try {
      await triggerMachine({ machineCode, triggeredBy: user?.id });
      setFeedback({
        kind: 'success',
        message: 'Run lancé — les drafts apparaîtront dans quelques secondes.',
      });
      // Le workflow n8n met ~10-15s (2 appels Claude) → refetch échelonnés
      for (const ms of [4000, 9000, 15000, 22000]) {
        setTimeout(() => {
          void refetchRuns();
          void refetchPending();
          void refetchDecided();
        }, ms);
      }
    } catch (e) {
      setFeedback({
        kind: 'error',
        message: e instanceof Error ? e.message : 'Erreur inconnue',
      });
    } finally {
      setTriggering(false);
    }
  }

  async function handleDecide(draftId: string, decision: 'approved' | 'rejected') {
    if (!user) return;
    setDeciding(draftId);
    try {
      await rpcDecideDraft(draftId, decision, user.id);
      await Promise.all([refetchPending(), refetchDecided()]);
    } catch (e) {
      setFeedback({
        kind: 'error',
        message: e instanceof Error ? e.message : 'Erreur lors de la décision',
      });
    } finally {
      setDeciding(null);
    }
  }

  if (loadingMachine) {
    return <div className="card p-12 text-center text-text-tertiary">Chargement…</div>;
  }
  if (!machine) {
    return (
      <div className="card p-12 text-center">
        <p className="text-text-secondary">Machine <code>{machineCode}</code> introuvable.</p>
        <Link to="/machines" className="mt-4 inline-block text-accent-violet hover:underline">
          ← Retour aux machines
        </Link>
      </div>
    );
  }

  if (machine.code.toUpperCase() === 'M02') {
    return <MachineDetailM02 machine={machine} />;
  }

  const recentDecidedDrafts = decidedDrafts.filter((d) => d.status !== 'pending').slice(0, 10);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2 text-sm text-text-tertiary">
        <Link to="/machines" className="inline-flex items-center gap-1 hover:text-text-primary">
          <ArrowLeft size={14} /> Machines
        </Link>
        <span>/</span>
        <span className="text-text-secondary">{machine.code}</span>
      </div>

      <PageHeader
        title={`${machine.code} · ${machine.name}`}
        subtitle={machine.description || `${machine.category}`}
        actions={
          <Button
            variant="primary"
            icon={triggering ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            disabled={!canTrigger}
            onClick={handleTrigger}
          >
            {triggering ? 'Lancement…' : 'Lancer maintenant'}
          </Button>
        }
      />

      {!isN8nConfigured() && (
        <div className="card border-accent-orange/40 bg-accent-orange/5 p-4 text-sm text-accent-orange">
          Webhook n8n non configuré. Définis <code>VITE_N8N_WEBHOOK_URL</code> et{' '}
          <code>VITE_N8N_WEBHOOK_SECRET</code> dans les secrets GitHub Actions.
        </div>
      )}

      {feedback && (
        <div
          className={cn(
            'card p-4 text-sm',
            feedback.kind === 'success'
              ? 'border-accent-green/40 bg-accent-green/5 text-accent-green'
              : 'border-accent-red/40 bg-accent-red/5 text-accent-red',
          )}
        >
          {feedback.message}
        </div>
      )}

      {/* Drafts en attente */}
      <section>
        <PageHeader
          title="Drafts en attente"
          subtitle={
            loadingPending
              ? 'Chargement…'
              : `${pendingDrafts.length} draft${pendingDrafts.length > 1 ? 's' : ''} à approuver`
          }
        />
        {pendingDrafts.length === 0 && !loadingPending && (
          <div className="card p-8 text-center text-text-tertiary">
            Aucun draft en attente. Lance la machine pour générer 2 nouveaux posts (FB + IG).
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {pendingDrafts.map((d) => (
            <DraftCard
              key={d.id}
              draft={d}
              loading={deciding === d.id}
              onApprove={() => handleDecide(d.id, 'approved')}
              onReject={() => handleDecide(d.id, 'rejected')}
            />
          ))}
        </div>
      </section>

      <RunsHistory runs={runs} loading={loadingRuns} />

      {/* Drafts décidés (récents) */}
      {recentDecidedDrafts.length > 0 && (
        <section>
          <PageHeader
            title="Drafts décidés"
            subtitle={`${recentDecidedDrafts.length} récents`}
          />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {recentDecidedDrafts.map((d) => (
              <DraftCard key={d.id} draft={d} readonly />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function DraftCard({
  draft,
  onApprove,
  onReject,
  loading,
  readonly,
}: {
  draft: PostDraft;
  onApprove?: () => void;
  onReject?: () => void;
  loading?: boolean;
  readonly?: boolean;
}) {
  const cfg = networkConfig[draft.network];
  const Icon = cfg.icon;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border-subtle bg-bg-base/40 p-4">
        <div className="flex items-center gap-2">
          <Icon size={18} className={cfg.color} />
          <span className="text-sm font-semibold text-text-primary">{cfg.label}</span>
          <span className="text-xs text-text-tertiary">{draft.accountHandle}</span>
        </div>
        <DraftStatusBadge status={draft.status} />
      </div>
      {draft.imageUrls?.square && (
        <div className="aspect-square w-full overflow-hidden bg-bg-base">
          <img
            src={draft.imageUrls.square}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <div className="p-4">
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-text-secondary">
          {draft.content}
        </pre>
        <div className="mt-3 text-xs text-text-tertiary">
          Généré {formatRelativeTime(draft.createdAt)}
          {draft.decidedAt && (
            <> · décidé {formatRelativeTime(draft.decidedAt)}</>
          )}
        </div>
      </div>
      {!readonly && draft.status === 'pending' && (
        <div className="flex border-t border-border-subtle">
          <button
            type="button"
            onClick={onReject}
            disabled={loading}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 text-sm font-medium text-accent-red hover:bg-accent-red/10 disabled:opacity-50"
          >
            <X size={14} /> Rejeter
          </button>
          <div className="w-px bg-border-subtle" />
          <button
            type="button"
            onClick={onApprove}
            disabled={loading}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 text-sm font-medium text-accent-green hover:bg-accent-green/10 disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Approuver
          </button>
        </div>
      )}
    </div>
  );
}

const draftStatusConfig: Record<
  PostDraft['status'],
  { label: string; text: string; bg: string }
> = {
  pending: { label: 'En attente', text: 'text-accent-orange', bg: 'bg-accent-orange/10' },
  approved: { label: 'Approuvé', text: 'text-accent-green', bg: 'bg-accent-green/10' },
  rejected: { label: 'Rejeté', text: 'text-accent-red', bg: 'bg-accent-red/10' },
  published: { label: 'Publié', text: 'text-accent-violet', bg: 'bg-accent-violet/10' },
};

function DraftStatusBadge({ status }: { status: PostDraft['status'] }) {
  const c = draftStatusConfig[status];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
        c.bg,
        c.text,
      )}
    >
      {c.label}
    </span>
  );
}
