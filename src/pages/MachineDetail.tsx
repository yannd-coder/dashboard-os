import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Download,
  Facebook,
  Instagram,
  Loader2,
  Pencil,
  Play,
  RefreshCw,
  Settings2,
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
import {
  fetchMachineSettings,
  rpcDecideDraft,
  rpcUpdateDraft,
  rpcUpdateMachineSettings,
} from '@/lib/api';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { DraftNetwork, DraftStatus, MachineSettings, PostDraft } from '@/types';

type DraftFilter = 'all' | DraftStatus;

const DRAFT_FILTERS: Array<{ key: DraftFilter; label: string }> = [
  { key: 'pending', label: 'En attente' },
  { key: 'approved', label: 'Approuvés' },
  { key: 'rejected', label: 'Rejetés' },
  { key: 'published', label: 'Publiés' },
  { key: 'all', label: 'Tout' },
];

function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Visuel à afficher/exporter selon le réseau : IG → portrait 4:5 si dispo, sinon carré */
function draftVisualUrl(draft: PostDraft): string | undefined {
  if (draft.network === 'instagram') {
    return draft.imageUrls?.portrait ?? draft.imageUrls?.square;
  }
  return draft.imageUrls?.square;
}

async function exportDraft(draft: PostDraft) {
  const networkShort = draft.network === 'facebook' ? 'FB' : 'IG';
  const dateStr = draft.createdAt.toISOString().slice(0, 10);
  const idShort = draft.id.slice(0, 8);
  const baseName = `coliver_${networkShort}_${dateStr}_${idShort}`;

  // 1. Image (depuis Supabase Storage) — format adapté au réseau
  const visualUrl = draftVisualUrl(draft);
  if (visualUrl) {
    try {
      const res = await fetch(visualUrl);
      if (res.ok) {
        const blob = await res.blob();
        triggerBrowserDownload(blob, `${baseName}.jpg`);
      }
    } catch {
      // Si le fetch image échoue, on continue avec le .txt
    }
  }

  // 2. Texte du post
  const txtBlob = new Blob([draft.content], { type: 'text/plain;charset=utf-8' });
  triggerBrowserDownload(txtBlob, `${baseName}.txt`);
}

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
    drafts: allDrafts,
    loading: loadingDrafts,
    refetch: refetchDrafts,
  } = useDrafts(machineCode, undefined, 50);

  const [triggering, setTriggering] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(
    null,
  );
  const [deciding, setDeciding] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<PostDraft | null>(null);
  const [draftFilter, setDraftFilter] = useState<DraftFilter>('pending');

  const draftCounts = useMemo(() => ({
    all: allDrafts.length,
    pending: allDrafts.filter((d) => d.status === 'pending').length,
    approved: allDrafts.filter((d) => d.status === 'approved').length,
    rejected: allDrafts.filter((d) => d.status === 'rejected').length,
    published: allDrafts.filter((d) => d.status === 'published').length,
  }), [allDrafts]);

  const displayedDrafts = useMemo(
    () => (draftFilter === 'all' ? allDrafts : allDrafts.filter((d) => d.status === draftFilter)),
    [allDrafts, draftFilter],
  );

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
          void refetchDrafts();
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
      await refetchDrafts();
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

      {(machineCode === 'M01' || machineCode === 'M06') && (
        <MachineSettingsPanel machineCode={machineCode} />
      )}

      {/* Drafts avec filtre par statut */}
      <section>
        <PageHeader
          title="Drafts"
          subtitle={
            loadingDrafts
              ? 'Chargement…'
              : `${displayedDrafts.length} draft${displayedDrafts.length > 1 ? 's' : ''}${
                  draftFilter === 'all' ? ' au total' : ''
                }`
          }
        />

        <div className="mb-6 flex flex-wrap gap-2">
          {DRAFT_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setDraftFilter(f.key)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                draftFilter === f.key
                  ? 'border-border-violet bg-accent-violet-soft text-accent-violet'
                  : 'border-border-subtle bg-bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary',
              )}
            >
              {f.label}
              <span className="rounded-md bg-bg-elevated px-1.5 py-0.5 text-[11px] font-semibold">
                {draftCounts[f.key]}
              </span>
            </button>
          ))}
        </div>

        {displayedDrafts.length === 0 && !loadingDrafts && (
          <div className="card p-8 text-center text-text-tertiary">
            {draftFilter === 'pending'
              ? 'Aucun draft en attente. Lance la machine pour générer de nouvelles créas (réglables ci-dessus).'
              : 'Aucun draft avec ce statut.'}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {displayedDrafts.map((d) => (
            <DraftCard
              key={d.id}
              draft={d}
              loading={deciding === d.id}
              readonly={d.status !== 'pending'}
              onApprove={d.status === 'pending' ? () => handleDecide(d.id, 'approved') : undefined}
              onReject={d.status === 'pending' ? () => handleDecide(d.id, 'rejected') : undefined}
              onEdit={d.status === 'pending' ? () => setEditingDraft(d) : undefined}
            />
          ))}
        </div>
      </section>

      <RunsHistory runs={runs} loading={loadingRuns} />

      {editingDraft && user && (
        <EditDraftModal
          draft={editingDraft}
          userId={user.id}
          onClose={() => setEditingDraft(null)}
          onSaved={async () => {
            setEditingDraft(null);
            await refetchDrafts();
          }}
        />
      )}
    </div>
  );
}

const TONES = [
  { value: 'ami', label: 'Ami (tutoiement chaleureux)' },
  { value: 'inspirant', label: 'Inspirant (aspirationnel)' },
  { value: 'factuel', label: 'Factuel (direct, informatif)' },
  { value: 'humour', label: 'Humour (léger, complice)' },
];

function MachineSettingsPanel({ machineCode }: { machineCode: string }) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<MachineSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchMachineSettings(machineCode)
      .then(setSettings)
      .catch((e) => setErr(e instanceof Error ? e.message : 'Erreur de chargement des réglages'));
  }, [machineCode]);

  function patch(p: Partial<MachineSettings>) {
    setSettings((s) => (s ? { ...s, ...p } : s));
    setMsg(null);
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    setErr(null);
    try {
      await rpcUpdateMachineSettings(machineCode, settings);
      setMsg('Réglages enregistrés — appliqués dès le prochain run (bouton ou cron).');
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur d'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-bg-base/40"
      >
        <div className="flex items-center gap-2">
          <Settings2 size={16} className="text-accent-violet" />
          <span className="text-sm font-semibold text-text-primary">Réglages de génération</span>
          {settings && (
            <span className="text-xs text-text-tertiary">
              {settings.pairs_per_run} créa{settings.pairs_per_run > 1 ? 's' : ''}/run · police ×
              {settings.fontscale} · ton {settings.tone}
            </span>
          )}
        </div>
        <ChevronDown size={16} className={cn('text-text-tertiary transition-transform', open && 'rotate-180')} />
      </button>

      {open && settings && (
        <div className="space-y-5 border-t border-border-subtle p-4">
          <div className="grid gap-5 md:grid-cols-2">
            {/* Nb de créas par run */}
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Créas générées par run (paires FB + IG)
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => patch({ pairs_per_run: n })}
                    className={cn(
                      'h-9 w-9 rounded-lg border text-sm font-semibold transition-colors',
                      settings.pairs_per_run === n
                        ? 'border-border-violet bg-accent-violet-soft text-accent-violet'
                        : 'border-border-subtle bg-bg-surface2 text-text-secondary hover:border-border-strong',
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-text-tertiary">
                Chaque créa = 1 visuel commun (carré FB + portrait IG) + 2 textes adaptés.
              </p>
            </div>

            {/* Taille de police */}
            <div>
              <label className="mb-1 flex items-center justify-between text-xs font-medium text-text-secondary">
                <span>Taille de l'accroche sur le visuel</span>
                <span className="text-text-tertiary">×{settings.fontscale}</span>
              </label>
              <input
                type="range"
                min={0.7}
                max={1.4}
                step={0.05}
                value={settings.fontscale}
                onChange={(e) => patch({ fontscale: Number(e.target.value) })}
                className="w-full accent-[#8b5cf6]"
              />
              <div className="flex justify-between text-[11px] text-text-tertiary">
                <span>Discret</span>
                <span>Normal</span>
                <span>XXL</span>
              </div>
            </div>

            {/* Ton */}
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">Ton des textes</label>
              <select
                value={settings.tone}
                onChange={(e) => patch({ tone: e.target.value })}
                className="w-full rounded-lg border border-border-subtle bg-bg-surface2 px-3 py-2 text-sm text-text-primary focus:border-border-violet focus:outline-none"
              >
                {TONES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Thème */}
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">Thème</label>
              <div className="flex gap-2">
                <select
                  value={settings.theme_mode}
                  onChange={(e) => patch({ theme_mode: e.target.value as MachineSettings['theme_mode'] })}
                  className="rounded-lg border border-border-subtle bg-bg-surface2 px-3 py-2 text-sm text-text-primary focus:border-border-violet focus:outline-none"
                >
                  <option value="auto">Varié (auto)</option>
                  <option value="fixed">Imposé</option>
                </select>
                {settings.theme_mode === 'fixed' && (
                  <input
                    type="text"
                    value={settings.theme_fixed}
                    onChange={(e) => patch({ theme_fixed: e.target.value })}
                    placeholder="ex : la fibre + les visios face au jardin"
                    className="flex-1 rounded-lg border border-border-subtle bg-bg-surface2 px-3 py-2 text-sm text-text-primary focus:border-border-violet focus:outline-none"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Consignes libres */}
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              Consignes libres pour ARIA (optionnel)
            </label>
            <textarea
              value={settings.extra_instructions}
              onChange={(e) => patch({ extra_instructions: e.target.value })}
              rows={2}
              placeholder="ex : mentionne l'événement CoworkDay de vendredi ; évite le mot 'paradis'"
              className="w-full resize-none rounded-lg border border-border-subtle bg-bg-surface2 px-3 py-2 text-sm text-text-primary focus:border-border-violet focus:outline-none"
            />
          </div>

          {(msg || err) && (
            <div
              className={cn(
                'rounded-lg border px-3 py-2 text-xs',
                err
                  ? 'border-accent-red/30 bg-accent-red/10 text-accent-red'
                  : 'border-accent-green/30 bg-accent-green/10 text-accent-green',
              )}
            >
              {err || msg}
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={save} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer les réglages'}
            </Button>
          </div>
        </div>
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
          <button
            type="button"
            onClick={() => exportDraft(draft)}
            className="rounded-md p-1.5 text-text-tertiary hover:bg-bg-surface2 hover:text-text-primary"
            aria-label="Exporter"
            title="Télécharger l'image (.jpg) + le texte (.txt) dans Téléchargements"
          >
            <Download size={13} />
          </button>
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
      {(() => {
        const url = draftVisualUrl(draft);
        const isPortrait = draft.network === 'instagram' && Boolean(draft.imageUrls?.portrait);
        if (url) {
          return (
            <div
              className={cn(
                'w-full overflow-hidden bg-bg-base',
                isPortrait ? 'aspect-[4/5]' : 'aspect-square',
              )}
            >
              <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
            </div>
          );
        }
        if (draft.status === 'pending') {
          return (
            <div className="flex aspect-square w-full items-center justify-center bg-bg-base">
              <div className="flex items-center gap-2 text-xs text-text-tertiary">
                <Loader2 size={14} className="animate-spin" />
                Visuel en cours de génération… (recharge la page dans quelques secondes)
              </div>
            </div>
          );
        }
        return null;
      })()}
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
  const [previewUrl, setPreviewUrl] = useState(draftVisualUrl(draft) ?? '');
  const isPortrait = draft.network === 'instagram' && Boolean(draft.imageUrls?.portrait);
  const [savingText, setSavingText] = useState(false);
  const [regen, setRegen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const accrocheDirty = (draft.visualAccroche ?? '') !== accroche.trim();
  const contentDirty = draft.content !== content;
  const needsRegen = accrocheDirty && accroche.trim().length > 0;
  const dirty = contentDirty || accrocheDirty;

  async function saveAll() {
    if (!accroche.trim() && accrocheDirty) {
      setErr("L'accroche ne peut pas être vide.");
      return;
    }
    setErr(null);
    setInfo(null);
    setSavingText(true);
    try {
      // 1. Sauve les champs texte (content + accroche) si modifiés
      if (contentDirty || accrocheDirty) {
        await rpcUpdateDraft(draft.id, userId, {
          content: contentDirty ? content : undefined,
          visualAccroche: accrocheDirty ? accroche : undefined,
        });
      }

      // 2. Si l'accroche a changé, regénère le visuel en chaîne
      if (needsRegen) {
        setRegen(true);
        const res = await rerenderDraftVisual({
          draftId: draft.id,
          userId,
          newAccroche: accroche.trim(),
        });
        if (res.image_url) {
          // Cache-bust pour forcer le browser à reload la nouvelle image
          setPreviewUrl(res.image_url + (res.image_url.includes('?') ? '&' : '?') + 'v=' + Date.now());
        }
      }

      setInfo(needsRegen ? 'Modifications enregistrées + visuel régénéré.' : 'Modifications enregistrées.');
      await onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur d'enregistrement");
    } finally {
      setSavingText(false);
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
              Aperçu visuel · {isPortrait ? 'portrait 4:5 (Instagram)' : 'carré (Facebook)'}
            </label>
            <div
              className={cn(
                'w-full overflow-hidden rounded-lg border border-border-subtle bg-bg-base',
                isPortrait ? 'aspect-[4/5]' : 'aspect-square',
              )}
            >
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
              {accrocheDirty && (
                <div className="mt-2 flex items-start gap-1.5 text-[11px] text-accent-violet">
                  <RefreshCw size={11} className="mt-0.5 shrink-0" />
                  <span>
                    L'accroche a changé — les visuels de la <strong>paire FB + IG</strong> (carré +
                    portrait) seront regénérés automatiquement à l'enregistrement.
                  </span>
                </div>
              )}
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
            onClick={saveAll}
            disabled={savingText || regen || !dirty}
          >
            {regen
              ? 'Régénération du visuel…'
              : savingText
              ? 'Enregistrement…'
              : needsRegen
              ? 'Enregistrer + régénérer le visuel'
              : 'Enregistrer'}
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
