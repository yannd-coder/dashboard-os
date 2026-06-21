import { useState } from 'react';
import { Wrench, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToolCall {
  id: string;
  name: string;
  input: unknown;
}

interface ToolResult {
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

interface Props {
  calls: ToolCall[];
  results?: ToolResult[];
  pending?: boolean;
}

function summarizeInput(input: unknown): string {
  if (!input || typeof input !== 'object') return '';
  const obj = input as Record<string, unknown>;
  const entries = Object.entries(obj);
  if (entries.length === 0) return '';
  return entries
    .map(([k, v]) => {
      const s = typeof v === 'string' ? `"${v}"` : JSON.stringify(v);
      return `${k}: ${s.length > 30 ? s.slice(0, 30) + '…' : s}`;
    })
    .join(', ');
}

function summarizeResult(content: string): string {
  try {
    const obj = JSON.parse(content);
    if (typeof obj === 'object' && obj !== null) {
      if ('error' in obj) return `❌ ${obj.error}`;
      if ('count' in obj) return `${obj.count} résultat${obj.count === 1 ? '' : 's'}`;
      if ('success' in obj) {
        if (obj.success === false && 'error' in obj) return `❌ ${obj.error}`;
        return obj.success ? '✓ OK' : '❌ échec';
      }
      // Cherche un array top-level → affiche son nom + taille
      for (const [k, v] of Object.entries(obj)) {
        if (Array.isArray(v)) return `${v.length} ${k}`;
      }
      return Object.keys(obj).slice(0, 2).join(', ') || '✓';
    }
  } catch {
    return content.length > 60 ? content.slice(0, 60) + '…' : content;
  }
  return '';
}

export function ToolCallBubble({ calls, results, pending }: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const findResult = (callId: string) =>
    results?.find((r) => r.tool_use_id === callId);

  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-bg-surface text-text-tertiary">
        <Wrench size={14} />
      </div>
      <div className="flex max-w-[78%] flex-col gap-1.5">
        <div className="text-xs text-text-tertiary">
          {pending ? 'En cours…' : 'Outils utilisés'}
        </div>
        <div className="flex flex-col gap-1">
          {calls.map((c, i) => {
            const r = findResult(c.id);
            const isError = r?.is_error === true;
            const isOpen = openIdx === i;
            return (
              <div
                key={c.id}
                className={cn(
                  'rounded-xl border text-sm',
                  isError
                    ? 'border-accent-pink/40 bg-accent-pink/10'
                    : 'border-border-subtle bg-bg-surface/70',
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left"
                >
                  {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  {isError && <AlertTriangle size={12} className="text-accent-pink" />}
                  <code className="font-mono text-[12px] text-text-primary">
                    {c.name}
                    {summarizeInput(c.input) && (
                      <span className="text-text-tertiary">({summarizeInput(c.input)})</span>
                    )}
                  </code>
                  <span className="ml-auto text-[11px] text-text-tertiary">
                    {r ? summarizeResult(r.content) : pending ? '…' : ''}
                  </span>
                </button>
                {isOpen && (
                  <div className="space-y-2 border-t border-border-subtle px-3 py-2 text-xs">
                    <div>
                      <div className="mb-1 font-semibold text-text-tertiary">Input</div>
                      <pre className="overflow-x-auto rounded bg-bg-base/60 p-2 text-[11px] text-text-secondary">
{JSON.stringify(c.input, null, 2)}
                      </pre>
                    </div>
                    {r && (
                      <div>
                        <div className="mb-1 font-semibold text-text-tertiary">
                          {isError ? 'Erreur' : 'Résultat'}
                        </div>
                        <pre className="overflow-x-auto rounded bg-bg-base/60 p-2 text-[11px] text-text-secondary">
{(() => {
  try { return JSON.stringify(JSON.parse(r.content), null, 2); }
  catch { return r.content; }
})()}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
