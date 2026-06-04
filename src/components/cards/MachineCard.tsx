import { Link } from 'react-router-dom';
import { IconSquare } from '@/components/ui/IconSquare';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { Machine } from '@/types';

export function MachineCard({ machine }: { machine: Machine }) {
  const isIdle = machine.status === 'idle';
  return (
    <Link to={`/machines/${machine.code}`} className="card card-hover relative block p-5">
      <div className="flex items-start gap-4">
        <IconSquare
          icon={machine.icon}
          gradient={machine.gradient}
          size="md"
          muted={isIdle}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
                {machine.code}
              </div>
              <h3 className="mt-0.5 text-base font-semibold text-text-primary truncate">
                {machine.name}
              </h3>
            </div>
            <StatusBadge status={machine.status} />
          </div>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary line-clamp-2">
            {machine.description}
          </p>
        </div>
      </div>
    </Link>
  );
}
