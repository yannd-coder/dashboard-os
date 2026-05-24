import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { IconSquare } from '@/components/ui/IconSquare';
import type { Stat } from '@/types';
import { cn } from '@/lib/utils';

export function StatCard({ stat }: { stat: Stat }) {
  const isDown = stat.trend === 'down';
  return (
    <div className="card card-hover p-5">
      <div className="flex items-start justify-between">
        <IconSquare icon={stat.icon} gradient={stat.gradient} size="md" />
        {stat.delta && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-xs font-medium',
              isDown ? 'text-accent-red' : 'text-accent-green',
            )}
          >
            {isDown ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
            {stat.delta}
          </span>
        )}
      </div>
      <div className="mt-5">
        <div className="text-3xl font-bold tracking-tight text-text-primary">{stat.value}</div>
        <div className="mt-1 text-xs uppercase tracking-wider text-text-tertiary">{stat.label}</div>
      </div>
    </div>
  );
}
