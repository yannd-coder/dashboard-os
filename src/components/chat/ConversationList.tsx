import { useState } from 'react';
import { MessageSquare, Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';
import type { AgentConversation } from '@/types';

interface Props {
  conversations: AgentConversation[];
  activeId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => void;
  onArchive: (id: string) => void;
}

export function ConversationList({
  conversations,
  activeId,
  loading,
  onSelect,
  onNew,
  onRename,
  onArchive,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  function startEdit(c: AgentConversation) {
    setEditingId(c.id);
    setEditValue(c.title);
  }

  function commitEdit(id: string) {
    const v = editValue.trim();
    if (v) onRename(id, v);
    setEditingId(null);
  }

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-border-subtle bg-bg-base/50">
      <div className="p-3">
        <button
          onClick={onNew}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border-violet bg-accent-violet-soft px-3 py-2 text-sm font-medium text-accent-violet transition-colors hover:bg-accent-violet/25"
        >
          <Plus size={14} />
          Nouvelle conversation
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2">
        {loading && (
          <div className="px-3 py-6 text-center text-xs text-text-tertiary">Chargement…</div>
        )}
        {!loading && conversations.length === 0 && (
          <div className="px-3 py-6 text-center text-xs text-text-tertiary">
            Aucune conversation. Lance-toi avec le bouton ci-dessus.
          </div>
        )}
        <ul className="space-y-1">
          {conversations.map((c) => {
            const isActive = c.id === activeId;
            const isEditing = editingId === c.id;
            return (
              <li key={c.id}>
                <div
                  className={cn(
                    'group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors',
                    isActive
                      ? 'bg-accent-violet-soft text-text-primary'
                      : 'text-text-secondary hover:bg-bg-surface',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => !isEditing && onSelect(c.id)}
                    className="flex flex-1 items-center gap-2 truncate text-left"
                  >
                    <MessageSquare size={13} className="shrink-0 text-text-tertiary" />
                    {isEditing ? (
                      <input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitEdit(c.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="flex-1 rounded border border-border-subtle bg-bg-base px-1 py-0.5 text-xs"
                      />
                    ) : (
                      <span className="truncate" title={c.title}>
                        {c.title}
                      </span>
                    )}
                  </button>
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => commitEdit(c.id)}
                        className="rounded p-1 text-accent-green hover:bg-bg-surface2"
                        title="Valider"
                      >
                        <Check size={12} />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded p-1 text-text-tertiary hover:bg-bg-surface2"
                        title="Annuler"
                      >
                        <X size={12} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEdit(c)}
                        className="rounded p-1 text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100 hover:bg-bg-surface2 hover:text-text-primary"
                        title="Renommer"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Archiver cette conversation ?')) onArchive(c.id);
                        }}
                        className="rounded p-1 text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100 hover:bg-bg-surface2 hover:text-accent-pink"
                        title="Archiver"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
                {!isEditing && (
                  <div className="px-2 pb-1 text-[10px] text-text-tertiary">
                    {formatRelativeTime(c.updatedAt)}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
