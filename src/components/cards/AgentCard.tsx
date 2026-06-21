import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { IconSquare } from '@/components/ui/IconSquare';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { Agent } from '@/types';
import { formatRelativeTime } from '@/lib/utils';

export function AgentCard({ agent }: { agent: Agent }) {
  return (
    <Link
      to={`/agents/${agent.code}`}
      className="card card-hover group relative block overflow-hidden p-5 transition-transform hover:scale-[1.01]"
    >
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

      {agent.description && (
        <p className="mt-4 text-sm leading-relaxed text-text-secondary line-clamp-2">
          {agent.description}
        </p>
      )}

      {agent.channels.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {agent.channels.map((c) => (
            <span
              key={c}
              className="rounded-md border border-border-subtle bg-bg-base/40 px-2 py-0.5 text-[11px] font-medium text-text-secondary"
            >
              {c}
            </span>
          ))}
        </div>
      )}

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

      <div className="mt-4 flex items-center justify-end gap-1.5 text-xs font-medium text-accent-violet opacity-70 transition-opacity group-hover:opacity-100">
        <MessageSquare size={12} />
        Parler à {agent.name}
      </div>
    </Link>
  );
}
