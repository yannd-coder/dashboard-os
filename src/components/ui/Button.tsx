import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

const variantMap: Record<Variant, string> = {
  primary:
    'bg-accent-violet-soft text-accent-violet border border-border-violet hover:bg-accent-violet/25 hover:shadow-glow',
  secondary: 'bg-bg-surface2 text-text-primary border border-border hover:bg-bg-hover',
  ghost: 'text-text-secondary hover:text-text-primary hover:bg-bg-surface',
  outline: 'border border-border text-text-primary hover:border-border-strong hover:bg-bg-surface',
};

const sizeMap: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  children,
  className,
  ...props
}: Props) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-all',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantMap[variant],
        sizeMap[size],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
