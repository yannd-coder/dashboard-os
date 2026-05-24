import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GradientName } from '@/types';

const gradientMap: Record<GradientName, string> = {
  'violet-pink': 'bg-gradient-violet-pink',
  orange: 'bg-gradient-orange',
  pink: 'bg-gradient-pink',
  cyan: 'bg-gradient-cyan',
  green: 'bg-gradient-green',
  violet: 'bg-gradient-violet',
  blue: 'bg-gradient-blue',
};

interface Props {
  icon: LucideIcon;
  gradient: GradientName;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  muted?: boolean;
}

const sizeMap = {
  sm: 'h-9 w-9 rounded-lg',
  md: 'h-12 w-12 rounded-xl',
  lg: 'h-14 w-14 rounded-2xl',
  xl: 'h-20 w-20 rounded-2xl',
};

const iconSizeMap = {
  sm: 18,
  md: 22,
  lg: 26,
  xl: 36,
};

export function IconSquare({ icon: Icon, gradient, size = 'md', className, muted }: Props) {
  return (
    <div
      className={cn(
        'flex items-center justify-center text-white shadow-lg shadow-black/40',
        sizeMap[size],
        muted ? 'bg-bg-elevated text-text-tertiary' : gradientMap[gradient],
        className,
      )}
    >
      <Icon size={iconSizeMap[size]} strokeWidth={2} />
    </div>
  );
}
