import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Send, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  onSend: (text: string) => void;
  onStop?: () => void;
  streaming: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, onStop, streaming, disabled, placeholder }: Props) {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${Math.min(ref.current.scrollHeight, 180)}px`;
    }
  }, [value]);

  function submit() {
    const t = value.trim();
    if (!t || streaming || disabled) return;
    onSend(t);
    setValue('');
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="border-t border-border-subtle bg-bg-base/60 backdrop-blur px-4 py-3">
      <div className="mx-auto max-w-3xl">
        <div className="relative flex items-end gap-2 rounded-2xl border border-border-subtle bg-bg-surface px-3 py-2 focus-within:border-accent-violet">
          <textarea
            ref={ref}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKey}
            rows={1}
            disabled={disabled}
            placeholder={placeholder ?? 'Écris un message…'}
            className="flex-1 resize-none bg-transparent text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
            style={{ maxHeight: 180 }}
          />
          {streaming ? (
            <button
              type="button"
              onClick={onStop}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-xl',
                'bg-accent-pink/15 text-accent-pink border border-accent-pink/40 hover:bg-accent-pink/25',
              )}
              title="Arrêter le streaming"
            >
              <Square size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!value.trim() || disabled}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-xl transition-colors',
                value.trim() && !disabled
                  ? 'bg-accent-violet-soft text-accent-violet border border-border-violet hover:bg-accent-violet/25'
                  : 'bg-bg-surface2 text-text-tertiary border border-border-subtle cursor-not-allowed',
              )}
              title="Envoyer (Entrée)"
            >
              <Send size={14} />
            </button>
          )}
        </div>
        <div className="mt-1.5 text-center text-[10px] uppercase tracking-wider text-text-tertiary">
          Entrée pour envoyer · Maj+Entrée pour saut de ligne
        </div>
      </div>
    </div>
  );
}
