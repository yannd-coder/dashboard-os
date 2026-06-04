import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Clock,
  Facebook,
  Instagram,
  Loader2,
  Play,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useMachines } from '@/hooks/useMachines';
import { useMachineRuns } from '@/hooks/useMachineRuns';
import { useDrafts } from '@/hooks/useDrafts';
import { useAuth } from '@/hooks/useAuth';
import { isN8nConfigured, triggerMachine } from '@/lib/n8n';
import { rpcDecideDraft } from '@/lib/api';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { DraftNetwork, MachineRun, PostDraft, Status } from '@/types';

const networkConfig: Record<DraftNetwork, { label: string; icon: typeof Facebook; color: string }> = {
  facebook: { label: 'Facebook', icon: Facebook, color: 'text-[#1877F2]' },
  instagram: { label: 'Instagram', icon: Instagram, color: 'text-[#E1306C]' },
};

const runStatusToBadge: Record<MachineRun['status'], Status> = {
  running: 'building',
  success: 'live',
  error: 'error',
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
      setTimeout(() => {
        void refetchRuns();
        void refetchPending();
        void refetchDecided();
      }, 4000);
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

      {/* Historique runs */}
      <section>
        <PageHeader title="Historique des runs" subtitle={`${runs.length} run(s) récents`} />
        {loadingRuns ? (
          <div className="card p-8 text-center text-text-tertiary">Chargement…</div>
        ) : runs.length === 0 ? (
          <div className="card p-8 text-center text-text-tertiary">Aucun run pour le moment.</div>
        ) : (
          <div className="card divide-y divide-border-subtle overflow-hidden">
            {runs.map((r) => (
              <RunRow key={r.id} run={r} />
            ))}
          </div>
        )}
      </section>

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

function RunRow({ run }: { run: MachineRun }) {
  const duration = run.endedAt
    ? `${Math.round((run.endedAt.getTime() - run.startedAt.getTime()) / 1000)}s`
    : null;
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <div className="flex items-center gap-3 min-w-0">
        <Clock size={14} className="text-text-tertiary shrink-0" />
        <div className="min-w-0">
          <div className="text-sm text-text-primary">
            {formatRelativeTime(run.startedAt)} · {run.triggerSource}
          </div>
          {(run.summary || run.error) && (
            <div className="truncate text-xs text-text-tertiary">{run.error ?? run.summary}</div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {duration && <span className="text-xs text-text-tertiary">{duration}</span>}
        <StatusBadge status={runStatusToBadge[run.status]} />
      </div>
    </div>
  );
}
