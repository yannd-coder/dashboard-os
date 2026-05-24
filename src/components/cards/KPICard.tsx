import type { LucideIcon } from 'lucide-react';
import type { GradientName } from '@/types';
import { cn } from '@/lib/utils';

interface Props {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  gradient: GradientName;
}

const tintMap: Record<GradientName, string> = {
  'violet-pink':
    'from-accent-violet/25 via-accent-pink/15 to-transparent border-accent-violet/30',
  pink: 'from-accent-pink/25 via-accent-pink/10 to-transparent border-accent-pink/30',
  orange: 'from-accent-orange/25 via-accent-orange/10 to-transparent border-accent-orange/30',
  cyan: 'from-accent-cyan/25 via-accent-cyan/10 to-transparent border-accent-cyan/30',
  green: 'from-accent-green/25 via-accent-green/10 to-transparent border-accent-green/30',
  violet: 'from-accent-violet/25 via-accent-violet/10 to-transparent border-accent-violet/30',
  blue: 'from-accent-blue/25 via-accent-blue/10 to-transparent border-accent-blue/30',
};

const iconColorMap: Record<GradientName, string> = {
  'violet-pink': 'text-accent-violet',
  pink: 'text-accent-pink',
  orange: 'text-accent-orange',
  cyan: 'text-accent-cyan',
  green: 'text-accent-green',
  violet: 'text-accent-violet',
  blue: 'text-accent-blue',
};

export function KPICard({ icon: Icon, label, value, sub, gradient }: Props) {
  return (
    <div
      className={cn(
        'relative rounded-2xl border bg-gradient-to-br p-5',
        tintMap[gradient],
      )}
    >
      <div className={cn('flex items-center gap-2 text-xs uppercase tracking-wider', iconColorMap[gradient])}>
        <Icon size={16} />
        <span>{label}</span>
      </div>
      <div className="mt-3 text-4xl font-bold tracking-tight text-text-primary">{value}</div>
      {sub && <div className="mt-1 text-xs text-text-secondary">{sub}</div>}
    </div>
  );
}
