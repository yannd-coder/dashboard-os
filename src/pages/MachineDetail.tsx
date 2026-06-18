import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Facebook,
  Instagram,
  Loader2,
  Pencil,
  Play,
  RefreshCw,
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
import { isN8nConfigured, rerenderDraftVisual, triggerMachine } from '@/lib/n8n';
import { rpcDecideDraft, rpcUpdateDraft } from '@/lib/api';
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
  const [editingDraft, setEditingDraft] = useState<PostDraft | null>(null);

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
              onEdit={() => setEditingDraft(d)}
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

      {editingDraft && user && (
        <EditDraftModal
          draft={editingDraft}
          userId={user.id}
          onClose={() => setEditingDraft(null)}
          onSaved={async () => {
            setEditingDraft(null);
            await Promise.all([refetchPending(), refetchDecided()]);
          }}
        />
      )}
    </div>
  );
}

function DraftCard({
  draft,
  onApprove,
  onReject,
  onEdit,
  loading,
  readonly,
}: {
  draft: PostDraft;
  onApprove?: () => void;
  onReject?: () => void;
  onEdit?: () => void;
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
        <div className="flex items-center gap-2">
          <DraftStatusBadge status={draft.status} />
          {!readonly && draft.status === 'pending' && onEdit && (
            <button
              type="button"
              onClick={onEdit}
              disabled={loading}
              className="rounded-md p-1.5 text-text-tertiary hover:bg-bg-surface2 hover:text-text-primary disabled:opacity-50"
              aria-label="Éditer"
              title="Éditer le texte ou l'accroche du visuel"
            >
              <Pencil size={13} />
            </button>
          )}
        </div>
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

function EditDraftModal({
  draft,
  userId,
  onClose,
  onSaved,
}: {
  draft: PostDraft;
  userId: string;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [content, setContent] = useState(draft.content);
  const [accroche, setAccroche] = useState(draft.visualAccroche ?? '');
  const [previewUrl, setPreviewUrl] = useState(draft.imageUrls?.square ?? '');
  const [savingText, setSavingText] = useState(false);
  const [regen, setRegen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const accrocheDirty = (draft.visualAccroche ?? '') !== accroche.trim();
  const contentDirty = draft.content !== content;

  async function saveText() {
    setErr(null);
    setInfo(null);
    setSavingText(true);
    try {
      await rpcUpdateDraft(draft.id, userId, {
        content: contentDirty ? content : undefined,
        visualAccroche: accrocheDirty ? accroche : undefined,
      });
      setInfo('Modifications enregistrées.');
      await onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur d\'enregistrement');
    } finally {
      setSavingText(false);
    }
  }

  async function regenVisual() {
    if (!accroche.trim()) {
      setErr("L'accroche ne peut pas être vide.");
      return;
    }
    setErr(null);
    setInfo(null);
    setRegen(true);
    try {
      const res = await rerenderDraftVisual({
        draftId: draft.id,
        userId,
        newAccroche: accroche.trim(),
      });
      if (res.image_url) {
        setPreviewUrl(res.image_url);
        setInfo('Visuel regénéré.');
      }
      await onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur lors de la regénération');
    } finally {
      setRegen(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-border-subtle bg-bg-surface">
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <div className="text-sm font-semibold text-text-primary">
            Éditer le draft · {draft.network === 'facebook' ? 'Facebook' : 'Instagram'}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={savingText || regen}
            className="rounded-md p-1 text-text-tertiary hover:bg-bg-surface2 hover:text-text-primary disabled:opacity-50"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid gap-6 p-4 md:grid-cols-2">
          {/* Preview visuel à gauche */}
          <div>
            <label className="mb-2 block text-xs font-medium text-text-secondary">
              Aperçu visuel
            </label>
            <div className="aspect-square w-full overflow-hidden rounded-lg border border-border-subtle bg-bg-base">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt=""
                  className={cn(
                    'h-full w-full object-cover transition-opacity',
                    regen && 'opacity-30',
                  )}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-text-tertiary">
                  Pas de visuel
                </div>
              )}
              {regen && (
                <div className="-mt-[100%] flex h-full items-center justify-center">
                  <div className="flex items-center gap-2 rounded-full bg-bg-surface/90 px-3 py-1.5 text-xs text-text-primary backdrop-blur">
                    <Loader2 size={14} className="animate-spin" />
                    Regénération…
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Champs à droite */}
          <div className="space-y-4">
            <div>
              <label className="mb-1 flex items-center justify-between text-xs font-medium text-text-secondary">
                <span>Accroche du visuel</span>
                {accrocheDirty && (
                  <span className="text-accent-orange">modifiée</span>
                )}
              </label>
              <textarea
                value={accroche}
                onChange={(e) => setAccroche(e.target.value)}
                rows={3}
                placeholder="Ton bureau sous les palmiers"
                className="w-full resize-none rounded-lg border border-border-subtle bg-bg-surface2 px-3 py-2 text-sm text-text-primary focus:border-border-violet focus:outline-none focus:ring-2 focus:ring-accent-violet/30"
              />
              <div className="mt-1 flex items-center justify-between text-[11px] text-text-tertiary">
                <span>3-6 mots · retours ligne pour empiler</span>
                <span>{accroche.length} caractères</span>
              </div>
              <Button
                variant="primary"
                size="sm"
                className="mt-2 w-full"
                icon={
                  regen ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <RefreshCw size={14} />
                  )
                }
                onClick={regenVisual}
                disabled={regen || savingText || !accrocheDirty}
              >
                {regen ? 'Regénération…' : 'Regénérer le visuel'}
              </Button>
            </div>

            <div>
              <label className="mb-1 flex items-center justify-between text-xs font-medium text-text-secondary">
                <span>Texte du post</span>
                {contentDirty && <span className="text-accent-orange">modifié</span>}
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
                className="w-full resize-y rounded-lg border border-border-subtle bg-bg-surface2 px-3 py-2 text-sm text-text-primary focus:border-border-violet focus:outline-none focus:ring-2 focus:ring-accent-violet/30"
              />
              <div className="mt-1 text-[11px] text-text-tertiary">
                {content.length} caractères
              </div>
            </div>
          </div>
        </div>

        {(err || info) && (
          <div
            className={cn(
              'mx-4 mb-2 rounded-lg border px-3 py-2 text-xs',
              err
                ? 'border-accent-red/30 bg-accent-red/10 text-accent-red'
                : 'border-accent-green/30 bg-accent-green/10 text-accent-green',
            )}
          >
            {err || info}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-border-subtle px-4 py-3">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={savingText || regen}>
            Fermer
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={saveText}
            disabled={savingText || regen || (!contentDirty && !accrocheDirty)}
          >
            {savingText ? 'Enregistrement…' : 'Enregistrer le texte'}
          </Button>
        </div>
      </div>
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
