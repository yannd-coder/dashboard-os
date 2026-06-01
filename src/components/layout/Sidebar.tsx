import { ChevronLeft, LogOut } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { navItems } from '@/data/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

const ROLE_LABEL: Record<string, string> = {
  superadmin: 'Superadmin',
  admin: 'Admin',
  user: 'Utilisateur',
};

export function Sidebar({ collapsed, onToggle }: Props) {
  const { user, logout } = useAuth();
  const visibleItems = navItems.filter(
    (i) => !i.roles || (user && i.roles.includes(user.role)),
  );
  return (
    <aside
      className={cn(
        'sticky top-0 flex h-screen shrink-0 flex-col border-r border-border-subtle bg-bg-base/80 backdrop-blur-xl transition-[width] duration-200',
        collapsed ? 'w-[72px]' : 'w-[240px]',
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-black font-bold">
            Y
          </div>
          {!collapsed && (
            <div className="text-sm font-semibold tracking-wide text-text-primary">
              YANN OS
            </div>
          )}
        </div>
        <button
          onClick={onToggle}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-md text-text-tertiary hover:bg-bg-surface hover:text-text-primary',
            collapsed && 'rotate-180',
          )}
          aria-label="Toggle sidebar"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="space-y-1">
          {visibleItems.map((item) => (
            <li key={item.href}>
              <NavLink
                to={item.href}
                end={item.href === '/'}
                className={({ isActive }) =>
                  cn(
                    'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent-violet-soft text-accent-violet'
                      : 'text-text-secondary hover:bg-bg-surface hover:text-text-primary',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-accent-violet" />
                    )}
                    <item.icon size={18} className="shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User footer */}
      <div className="border-t border-border-subtle p-3">
        <div className="flex items-center gap-3 rounded-lg p-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-violet-pink font-semibold text-white">
            {user?.prenom?.[0]?.toUpperCase() ?? '?'}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-text-primary">
                {user?.prenom ?? '—'}
              </div>
              <div className="truncate text-xs text-text-tertiary">
                {user ? ROLE_LABEL[user.role] : ''}
              </div>
            </div>
          )}
          {!collapsed && (
            <button
              type="button"
              onClick={logout}
              className="rounded-md p-1.5 text-text-tertiary hover:bg-bg-surface hover:text-text-primary"
              aria-label="Se déconnecter"
              title="Se déconnecter"
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
