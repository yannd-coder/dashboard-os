import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  FileText,
  Globe,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Play,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/layout/PageHeader';
import { RunsHistory } from '@/components/machines/RunsHistory';
import { useMachineRuns } from '@/hooks/useMachineRuns';
import { useResponseDrafts } from '@/hooks/useResponseDrafts';
import { useAuth } from '@/hooks/useAuth';
import { isN8nConfigured, triggerMachine } from '@/lib/n8n';
import { rpcDecideResponseDraft } from '@/lib/api';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { Machine, ProspectSource, ResponseDraft } from '@/types';

const sourceConfig: Record<ProspectSource, { label: string; icon: typeof Mail }> = {
  email: { label: 'Email', icon: Mail },
  lodgify: { label: 'Lodgify', icon: Globe },
  form: { label: 'Formulaire site', icon: FileText },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle },
  phone: { label: 'Téléphone', icon: Phone },
  other: { label: 'Autre', icon: Mail },
};

export function MachineDetailM02({ machine }: { machine: Machine }) {
  const { user } = useAuth();
  const { runs, loading: loadingRuns, refetch: refetchRuns } = useMachineRuns(machine.code);
  const {
    drafts: pendingDrafts,
    loading: loadingPending,
    refetch: refetchPending,
  } = useResponseDrafts('pending');
  const { drafts: allDrafts, refetch: refetchAll } = useResponseDrafts(undefined, 20);

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
      await triggerMachine({ machineCode: machine.code, triggeredBy: user?.id });
      setFeedback({
        kind: 'success',
        message: 'Relève des emails lancée — les réponses proposées apparaîtront sous peu.',
      });
      for (const ms of [4000, 9000, 15000, 22000]) {
        setTimeout(() => {
          void refetchRuns();
          void refetchPending();
          void refetchAll();
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
      await rpcDecideResponseDraft(draftId, decision, user.id);
      await Promise.all([refetchPending(), refetchAll()]);
    } catch (e) {
      setFeedback({
        kind: 'error',
        message: e instanceof Error ? e.message : 'Erreur lors de la décision',
      });
    } finally {
      setDeciding(null);
    }
  }

  const recentDecided = allDrafts.filter((d) => d.status !== 'pending').slice(0, 10);

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
        subtitle={machine.description || machine.category}
        actions={
          <Button
            variant="primary"
            icon={triggering ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            disabled={!canTrigger}
            onClick={handleTrigger}
          >
            {triggering ? 'Relève en cours…' : 'Relever les emails'}
          </Button>
        }
      />

      {!isN8nConfigured() && (
        <div className="card border-accent-orange/40 bg-accent-orange/5 p-4 text-sm text-accent-orange">
          Webhook n8n non configuré. Définis <code>VITE_N8N_WEBHOOK_URL</code> et{' '}
          <code>VITE_N8N_WEBHOOK_SECRET</code>.
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

      <section>
        <PageHeader
          title="Réponses en attente"
          subtitle={
            loadingPending
              ? 'Chargement…'
              : `${pendingDrafts.length} réponse${pendingDrafts.length > 1 ? 's' : ''} à valider`
          }
        />
        {pendingDrafts.length === 0 && !loadingPending && (
          <div className="card p-8 text-center text-text-tertiary">
            Aucune réponse en attente. Lance une relève des emails pour traiter les nouveaux
            prospects.
          </div>
        )}
        <div className="space-y-4">
          {pendingDrafts.map((d) => (
            <ResponseDraftCard
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

      {recentDecided.length > 0 && (
        <section>
          <PageHeader title="Réponses décidées" subtitle={`${recentDecided.length} récentes`} />
          <div className="space-y-4">
            {recentDecided.map((d) => (
              <ResponseDraftCard key={d.id} draft={d} readonly />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ResponseDraftCard({
  draft,
  onApprove,
  onReject,
  loading,
  readonly,
}: {
  draft: ResponseDraft;
  onApprove?: () => void;
  onReject?: () => void;
  loading?: boolean;
  readonly?: boolean;
}) {
  const prospect = draft.prospect;
  const src = sourceConfig[prospect?.source ?? 'other'];
  const SrcIcon = src.icon;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border-subtle bg-bg-base/40 p-4">
        <div className="flex items-center gap-2 min-w-0">
          <SrcIcon size={16} className="text-accent-cyan shrink-0" />
          <span className="text-sm font-semibold text-text-primary">{src.label}</span>
          {prospect?.emailFrom && (
            <span className="truncate text-xs text-text-tertiary">{prospect.emailFrom}</span>
          )}
        </div>
        <ResponseStatusBadge status={draft.status} />
      </div>

      {prospect && (
        <div className="border-b border-border-subtle p-4">
          <div className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
            Message du prospect{prospect.subject ? ` — ${prospect.subject}` : ''}
          </div>
          <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed text-text-secondary line-clamp-6">
            {prospect.body}
          </pre>
          {prospect.requestSummary && (
            <div className="mt-2 rounded-md bg-accent-violet/10 px-3 py-2 text-xs text-accent-violet">
              {prospect.requestSummary}
            </div>
          )}
        </div>
      )}

      <div className="p-4">
        <div className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
          Réponse proposée
        </div>
        <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed text-text-primary">
          {draft.content}
        </pre>
        <div className="mt-3 text-xs text-text-tertiary">
          Générée {formatRelativeTime(draft.createdAt)}
          {draft.decidedAt && <> · décidée {formatRelativeTime(draft.decidedAt)}</>}
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

const responseStatusConfig: Record<
  ResponseDraft['status'],
  { label: string; text: string; bg: string }
> = {
  pending: { label: 'En attente', text: 'text-accent-orange', bg: 'bg-accent-orange/10' },
  approved: { label: 'Approuvée', text: 'text-accent-green', bg: 'bg-accent-green/10' },
  rejected: { label: 'Rejetée', text: 'text-accent-red', bg: 'bg-accent-red/10' },
  sent: { label: 'Envoyée', text: 'text-accent-violet', bg: 'bg-accent-violet/10' },
};

function ResponseStatusBadge({ status }: { status: ResponseDraft['status'] }) {
  const c = responseStatusConfig[status];
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
