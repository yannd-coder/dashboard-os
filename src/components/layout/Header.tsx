import { Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

export function Header() {
  const { user } = useAuth();
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 6 ? 'Bonne nuit' : hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border-subtle bg-bg-base/80 px-8 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div>
          <div className="text-sm font-medium text-text-primary">
            {greeting}, {user?.prenom ?? ''}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-green animate-pulse-soft" />
            Tous les systèmes opérationnels
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            type="search"
            placeholder="Rechercher…"
            className="h-9 w-64 rounded-lg border border-border-subtle bg-bg-surface pl-9 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-border-violet focus:outline-none focus:ring-2 focus:ring-accent-violet/30"
          />
        </div>
        <Button variant="ghost" size="md" icon={<Bell size={16} />} aria-label="Notifications">
          <span className="ml-0 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-pink px-1 text-[10px] font-semibold text-white">
            3
          </span>
        </Button>
      </div>
    </header>
  );
}
