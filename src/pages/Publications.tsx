import { useCallback, useEffect, useState } from 'react';
import { Facebook, Instagram, Loader2, Lock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  fetchPublishOverview,
  rpcUpdatePublishSchedule,
  type PublishTargetOverview,
  type PublishedDraftLite,
} from '@/lib/api';
import { cn, formatRelativeTime } from '@/lib/utils';

const BRAND_LABEL: Record<string, string> = {
  coworking: 'Coworking',
  coliving: 'Coliving',
};

export function Publications() {
  const [targets, setTargets] = useState<PublishTargetOverview[]>([]);
  const [recent, setRecent] = useState<PublishedDraftLite[]>([]);
  const [failed, setFailed] = useState<PublishedDraftLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchPublishOverview();
      setTargets(data.targets);
      setRecent(data.recentPublished);
      setFailed(data.failed);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <div className="card p-12 text-center text-text-tertiary">Chargement…</div>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Publications"
        subtitle="Pilotage de la publication automatique FB + Instagram (4 comptes)"
        actions={
          <Button variant="ghost" size="sm" icon={<RefreshCw size={14} />} onClick={() => void load()}>
            Actualiser
          </Button>
        }
      />

      <div className="card flex items-start gap-3 border-accent-orange/40 bg-accent-orange/5 p-4 text-sm">
        <Lock size={16} className="mt-0.5 shrink-0 text-accent-orange" />
        <div className="text-text-secondary">
          <span className="font-semibold text-accent-orange">Publication automatique verrouillée.</span>{' '}
          Les drafts approuvés s'accumulent dans le réservoir de chaque compte mais rien ne part sur
          les réseaux. L'activation se fait sur ta demande explicite (via Claude Code) — ensuite le
          robot publiera au rythme réglé ci-dessous, à l'heure choisie (heure Réunion).
        </div>
      </div>

      {err && (
        <div className="card border-accent-red/40 bg-accent-red/5 p-4 text-sm text-accent-red">{err}</div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {targets.map((t) => (
          <TargetCard key={t.id} target={t} onSaved={load} />
        ))}
      </div>

      <section>
        <PageHeader title="Dernières publications" subtitle={recent.length ? `${recent.length} post(s)` : undefined} />
        {recent.length === 0 ? (
          <div className="card p-8 text-center text-text-tertiary">
            Aucun post publié pour l'instant — normal, la publication est verrouillée.
          </div>
        ) : (
          <div className="card divide-y divide-border-subtle">
            {recent.map((d) => (
              <DraftRow key={d.id} draft={d} />
            ))}
          </div>
        )}
      </section>

      {failed.length > 0 && (
        <section>
          <PageHeader title="Échecs de publication" subtitle={`${failed.length} draft(s) en erreur`} />
          <div className="card divide-y divide-border-subtle">
            {failed.map((d) => (
              <DraftRow key={d.id} draft={d} showError />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TargetCard({
  target,
  onSaved,
}: {
  target: PublishTargetOverview;
  onSaved: () => Promise<void> | void;
}) {
  const Icon = target.platform === 'facebook' ? Facebook : Instagram;
  const [ppw, setPpw] = useState(target.postsPerWeek);
  const [hour, setHour] = useState(target.publishHour);
  const [minInt, setMinInt] = useState(target.minIntervalHours);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const dirty =
    ppw !== target.postsPerWeek || hour !== target.publishHour || minInt !== target.minIntervalHours;

  async function save() {
    setSaving(true);
    try {
      await rpcUpdatePublishSchedule(target.id, ppw, hour, minInt);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  const reservoirEmpty = target.reservoirCount === 0;

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon
            size={18}
            className={target.platform === 'facebook' ? 'text-[#1877F2]' : 'text-[#E1306C]'}
          />
          <div>
            <div className="text-sm font-semibold text-text-primary">
              {BRAND_LABEL[target.brand]} · {target.platform === 'facebook' ? 'Facebook' : 'Instagram'}
            </div>
            <div className="text-xs text-text-tertiary">{target.handle}</div>
          </div>
        </div>
        <span
          className={cn(
            'rounded-full px-2.5 py-1 text-xs font-medium',
            reservoirEmpty ? 'bg-accent-orange/10 text-accent-orange' : 'bg-accent-green/10 text-accent-green',
          )}
        >
          Réservoir : {target.reservoirCount}
        </span>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-bg-base/60 p-2">
          <div className="text-lg font-semibold text-text-primary">
            {target.publishedLast7d}/{target.postsPerWeek}
          </div>
          <div className="text-[11px] text-text-tertiary">publiés / 7 jours</div>
        </div>
        <div className="rounded-lg bg-bg-base/60 p-2">
          <div className="text-lg font-semibold text-text-primary">{target.publishHour}h</div>
          <div className="text-[11px] text-text-tertiary">heure Réunion</div>
        </div>
        <div className="rounded-lg bg-bg-base/60 p-2">
          <div className="text-lg font-semibold text-text-primary">
            {target.lastPublishedAt ? formatRelativeTime(target.lastPublishedAt) : '—'}
          </div>
          <div className="text-[11px] text-text-tertiary">dernier post</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <label className="text-[11px] text-text-tertiary">
          Posts / semaine
          <select
            value={ppw}
            onChange={(e) => setPpw(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-border-subtle bg-bg-surface2 px-2 py-1.5 text-sm text-text-primary focus:border-border-violet focus:outline-none"
          >
            {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>
                {n === 0 ? '0 (pause)' : n}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[11px] text-text-tertiary">
          Heure
          <select
            value={hour}
            onChange={(e) => setHour(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-border-subtle bg-bg-surface2 px-2 py-1.5 text-sm text-text-primary focus:border-border-violet focus:outline-none"
          >
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {h}h
              </option>
            ))}
          </select>
        </label>
        <label className="text-[11px] text-text-tertiary">
          Écart min (h)
          <select
            value={minInt}
            onChange={(e) => setMinInt(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-border-subtle bg-bg-surface2 px-2 py-1.5 text-sm text-text-primary focus:border-border-violet focus:outline-none"
          >
            {[12, 24, 48, 72].map((n) => (
              <option key={n} value={n}>
                {n}h
              </option>
            ))}
          </select>
        </label>
      </div>

      {(dirty || saved || target.failedCount > 0) && (
        <div className="mt-3 flex items-center justify-between">
          <div className="text-[11px]">
            {target.failedCount > 0 && (
              <span className="text-accent-red">{target.failedCount} échec(s) — voir en bas de page</span>
            )}
            {saved && <span className="text-accent-green">Cadence enregistrée ✓</span>}
          </div>
          {dirty && (
            <Button variant="primary" size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 size={13} className="animate-spin" /> : 'Enregistrer'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function DraftRow({ draft, showError }: { draft: PublishedDraftLite; showError?: boolean }) {
  const Icon = draft.network === 'facebook' ? Facebook : Instagram;
  const firstLine =
    draft.content
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.toLowerCase().startsWith('réserve ton pass'))[0] ?? draft.content;
  return (
    <div className="flex items-start gap-3 p-3">
      <Icon
        size={15}
        className={cn(
          'mt-0.5 shrink-0',
          draft.network === 'facebook' ? 'text-[#1877F2]' : 'text-[#E1306C]',
        )}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-text-secondary">{firstLine}</div>
        <div className="text-[11px] text-text-tertiary">
          {draft.publishedAt ? `publié ${formatRelativeTime(draft.publishedAt)}` : 'non publié'}
          {draft.publishedPostId && <> · id {draft.publishedPostId}</>}
        </div>
        {showError && draft.publishError && (
          <div className="mt-1 rounded bg-accent-red/10 px-2 py-1 text-[11px] text-accent-red">
            {draft.publishError}
          </div>
        )}
      </div>
    </div>
  );
}
