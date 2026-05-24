import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/layout/PageHeader';
import { AgentCard } from '@/components/cards/AgentCard';
import { agents } from '@/data/agents';
import { cn } from '@/lib/utils';

type Filter = 'all' | 'coliver' | 'seo' | 'global';

const filters: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'coliver', label: 'Coliver' },
  { id: 'seo', label: 'SEO' },
  { id: 'global', label: 'Global' },
];

export function Agents() {
  const [filter, setFilter] = useState<Filter>('all');
  const filtered = filter === 'all' ? agents : agents.filter((a) => a.domain === filter);

  return (
    <div>
      <PageHeader
        title="Agents"
        subtitle={`${agents.length} agents IA · ${agents.filter((a) => a.status === 'live').length} live · ${agents.filter((a) => a.status === 'building').length} en build`}
        actions={
          <Button variant="primary" icon={<Plus size={16} />}>
            Nouvel agent
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {filters.map((f) => {
          const count =
            f.id === 'all' ? agents.length : agents.filter((a) => a.domain === f.id).length;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                filter === f.id
                  ? 'border-border-violet bg-accent-violet-soft text-accent-violet'
                  : 'border-border-subtle bg-bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary',
              )}
            >
              {f.label}
              <span className="rounded-md bg-bg-elevated px-1.5 py-0.5 text-[11px] font-semibold">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((a) => (
          <AgentCard key={a.id} agent={a} />
        ))}
      </div>
    </div>
  );
}
