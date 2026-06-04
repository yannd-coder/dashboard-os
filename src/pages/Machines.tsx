import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/layout/PageHeader';
import { MachineCard } from '@/components/cards/MachineCard';
import { useMachines } from '@/hooks/useMachines';
import { cn } from '@/lib/utils';

export function Machines() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('Tous');
  const { machines, loading, error } = useMachines();

  const categories = useMemo(() => {
    const set = new Set(machines.map((m) => m.category));
    return ['Tous', ...Array.from(set)];
  }, [machines]);

  const filtered = useMemo(() => {
    return machines.filter((m) => {
      const matchQuery =
        m.name.toLowerCase().includes(query.toLowerCase()) ||
        m.description.toLowerCase().includes(query.toLowerCase());
      const matchCat = activeCategory === 'Tous' || m.category === activeCategory;
      return matchQuery && matchCat;
    });
  }, [machines, query, activeCategory]);

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, typeof filtered> = {};
    filtered.forEach((m) => {
      if (!groups[m.category]) groups[m.category] = [];
      groups[m.category].push(m);
    });
    return groups;
  }, [filtered]);

  const liveCount = machines.filter((m) => m.status === 'live').length;
  const buildCount = machines.filter((m) => m.status === 'building').length;
  const idleCount = machines.filter((m) => m.status === 'idle').length;

  return (
    <div>
      <PageHeader
        title="Machines"
        subtitle={`${machines.length} machines · ${liveCount} live · ${buildCount} en build · ${idleCount} à construire`}
        actions={
          <Button variant="primary" icon={<Plus size={16} />}>
            Nouvelle machine
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const count =
              c === 'Tous' ? machines.length : machines.filter((m) => m.category === c).length;
            return (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                  activeCategory === c
                    ? 'border-border-violet bg-accent-violet-soft text-accent-violet'
                    : 'border-border-subtle bg-bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary',
                )}
              >
                {c}
                <span className="rounded-md bg-bg-elevated px-1.5 py-0.5 text-[11px] font-semibold">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="relative ml-auto">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher…"
            className="h-9 w-64 rounded-lg border border-border-subtle bg-bg-surface pl-9 pr-3 text-sm placeholder:text-text-tertiary focus:border-border-violet focus:outline-none focus:ring-2 focus:ring-accent-violet/30"
          />
        </div>
      </div>

      {loading && (
        <div className="card p-12 text-center text-text-tertiary">Chargement…</div>
      )}
      {error && (
        <div className="card p-12 text-center text-accent-pink">
          Erreur : {error.message}
        </div>
      )}
      {!loading && !error && (
        <div className="space-y-8">
          {Object.entries(groupedByCategory).map(([cat, list]) => {
            const sample = list[0];
            return (
              <section key={cat}>
                <div className="mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-text-secondary">
                  <span>{sample.categoryIcon}</span>
                  <span>{cat}</span>
                  <span className="text-text-tertiary">{list.length}</span>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {list.map((m) => (
                    <MachineCard key={m.id} machine={m} />
                  ))}
                </div>
              </section>
            );
          })}

          {filtered.length === 0 && (
            <div className="card p-12 text-center text-text-tertiary">
              Aucune machine ne correspond à la recherche.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
