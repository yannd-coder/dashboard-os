import { Delete } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  value: string;
  maxLength?: number;
  onChange: (v: string) => void;
  disabled?: boolean;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

export function PinPad({ value, maxLength = 4, onChange, disabled }: Props) {
  const press = (k: string) => {
    if (disabled) return;
    if (value.length >= maxLength) return;
    onChange(value + k);
  };

  const remove = () => {
    if (disabled) return;
    onChange(value.slice(0, -1));
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Dots */}
      <div className="flex items-center gap-3">
        {Array.from({ length: maxLength }).map((_, i) => (
          <span
            key={i}
            className={cn(
              'h-3 w-3 rounded-full border transition-colors',
              i < value.length
                ? 'border-accent-violet bg-accent-violet'
                : 'border-border-subtle bg-transparent',
            )}
          />
        ))}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3">
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => press(k)}
            disabled={disabled}
            className={cn(
              'flex h-14 w-14 items-center justify-center rounded-xl border border-border-subtle bg-bg-surface text-lg font-medium text-text-primary',
              'transition-all hover:border-border-violet hover:bg-bg-surface2 active:scale-95',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {k}
          </button>
        ))}
        <div />
        <button
          type="button"
          onClick={() => press('0')}
          disabled={disabled}
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-xl border border-border-subtle bg-bg-surface text-lg font-medium text-text-primary',
            'transition-all hover:border-border-violet hover:bg-bg-surface2 active:scale-95',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          0
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={disabled || value.length === 0}
          aria-label="Effacer"
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-xl border border-border-subtle bg-bg-surface text-text-secondary',
            'transition-all hover:border-border-violet hover:text-text-primary active:scale-95',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          <Delete size={18} />
        </button>
      </div>
    </div>
  );
}
