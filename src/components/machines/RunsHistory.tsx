import { Clock } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatRelativeTime } from '@/lib/utils';
import type { MachineRun, Status } from '@/types';

const runStatusToBadge: Record<MachineRun['status'], Status> = {
  running: 'building',
  success: 'live',
  error: 'error',
};

export function RunsHistory({ runs, loading }: { runs: MachineRun[]; loading: boolean }) {
  return (
    <section>
      <PageHeader title="Historique des runs" subtitle={`${runs.length} run(s) récents`} />
      {loading ? (
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
