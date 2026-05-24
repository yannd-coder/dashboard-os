import { IconSquare } from '@/components/ui/IconSquare';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { Agent } from '@/types';
import { formatRelativeTime } from '@/lib/utils';

export function AgentCard({ agent }: { agent: Agent }) {
  return (
    <div className="card card-hover group relative overflow-hidden p-5">
      <div className="flex items-start gap-4">
        <IconSquare icon={agent.icon} gradient={agent.gradient} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
                {agent.code}
              </div>
              <h3 className="mt-0.5 text-lg font-semibold text-text-primary">{agent.name}</h3>
              <div className="text-sm text-text-secondary">{agent.role}</div>
            </div>
            <StatusBadge status={agent.status} />
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-text-secondary line-clamp-2">
        {agent.description}
      </p>

      <div className="mt-5 grid grid-cols-3 gap-3 rounded-xl border border-border-subtle bg-bg-base/40 p-3">
        <div>
          <div className="text-xs text-text-tertiary">Runs</div>
          <div className="text-sm font-semibold text-text-primary">{agent.stats.runs}</div>
        </div>
        <div>
          <div className="text-xs text-text-tertiary">Succès</div>
          <div className="text-sm font-semibold text-accent-green">{agent.stats.success} %</div>
        </div>
        <div>
          <div className="text-xs text-text-tertiary">Latence</div>
          <div className="text-sm font-semibold text-text-primary">{agent.stats.avgTime}</div>
        </div>
      </div>

      {agent.lastRun && (
        <div className="mt-3 text-xs text-text-tertiary">
          Dernier run · {formatRelativeTime(agent.lastRun)}
        </div>
      )}
    </div>
  );
}
