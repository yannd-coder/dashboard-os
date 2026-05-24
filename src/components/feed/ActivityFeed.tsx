import {
  AlertCircle,
  CheckCircle2,
  Info,
  AlertTriangle,
} from 'lucide-react';
import type { ActivityItem } from '@/types';
import { cn, formatRelativeTime } from '@/lib/utils';

const statusConfig = {
  success: { icon: CheckCircle2, color: 'text-accent-green', bg: 'bg-accent-green/10' },
  error: { icon: AlertCircle, color: 'text-accent-red', bg: 'bg-accent-red/10' },
  warning: { icon: AlertTriangle, color: 'text-accent-orange', bg: 'bg-accent-orange/10' },
  info: { icon: Info, color: 'text-accent-cyan', bg: 'bg-accent-cyan/10' },
} as const;

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Activité récente</h3>
          <p className="text-xs text-text-tertiary">Live · auto-refresh</p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs text-text-tertiary">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-green animate-pulse-soft" />
          {items.length} événements
        </span>
      </div>

      <div className="divide-y divide-border-subtle">
        {items.map((item) => {
          const c = statusConfig[item.status];
          const Icon = c.icon;
          return (
            <div key={item.id} className="flex gap-4 px-5 py-4 hover:bg-bg-surface2/40 transition-colors">
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                  c.bg,
                  c.color,
                )}
              >
                <Icon size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary truncate">
                        {item.title}
                      </span>
                      {item.agentOrMachine && (
                        <span className="inline-flex shrink-0 rounded-md bg-bg-elevated px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-text-secondary">
                          {item.agentOrMachine}
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="mt-1 text-xs text-text-tertiary line-clamp-1">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-text-tertiary">
                    {formatRelativeTime(item.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
