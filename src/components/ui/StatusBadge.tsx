import { cn } from '@/lib/utils';
import type { Status } from '@/types';

interface Props {
  status: Status;
  className?: string;
}

const config: Record<Status, { label: string; dot: string; text: string; bg: string }> = {
  live: {
    label: 'Live',
    dot: 'bg-accent-green',
    text: 'text-accent-green',
    bg: 'bg-accent-green/10',
  },
  building: {
    label: 'En build',
    dot: 'bg-accent-orange',
    text: 'text-accent-orange',
    bg: 'bg-accent-orange/10',
  },
  idle: {
    label: 'Inactif',
    dot: 'bg-text-tertiary',
    text: 'text-text-tertiary',
    bg: 'bg-text-tertiary/10',
  },
  error: {
    label: 'Erreur',
    dot: 'bg-accent-red',
    text: 'text-accent-red',
    bg: 'bg-accent-red/10',
  },
};

export function StatusBadge({ status, className }: Props) {
  const c = config[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        c.bg,
        c.text,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full animate-pulse-soft', c.dot)} />
      {c.label}
    </span>
  );
}
