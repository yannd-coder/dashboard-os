import { useState, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function Layout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="relative flex min-h-screen bg-bg-base">
      {/* Decorative background */}
      <div className="pointer-events-none fixed inset-0 hero-bg" />
      <div className="pointer-events-none fixed inset-0 grid-bg opacity-40" />

      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
