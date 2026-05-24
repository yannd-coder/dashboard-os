import { ArrowUpRight, Github, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/cards/StatCard';
import { AgentCard } from '@/components/cards/AgentCard';
import { MachineCard } from '@/components/cards/MachineCard';
import { ActivityFeed } from '@/components/feed/ActivityFeed';
import { dashboardStats } from '@/data/stats';
import { agents } from '@/data/agents';
import { machines } from '@/data/machines';
import { activityFeed } from '@/data/activity';

export function Dashboard() {
  const topMachines = machines.filter((m) => m.status === 'live').slice(0, 6);

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-border-violet/40 bg-gradient-to-br from-accent-violet/15 via-accent-pink/5 to-transparent p-8">
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border-violet/40 bg-bg-base/40 px-3 py-1 text-xs font-medium text-accent-violet">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-violet animate-pulse-soft" />
              YANN OS · v0.1
            </span>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-text-primary">
              Ton cockpit IA.
            </h1>
            <p className="mt-2 text-base text-text-secondary">
              Tous tes agents, machines et automatisations Coliver + SEO réunis dans un seul tableau de bord.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="primary" icon={<Sparkles size={16} />}>Lancer Nova</Button>
            <Button variant="outline" icon={<Github size={16} />}>GitHub</Button>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-accent-violet/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-8 h-48 w-48 rounded-full bg-accent-pink/15 blur-3xl" />
      </section>

      {/* Stats */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {dashboardStats.map((s) => (
          <StatCard key={s.label} stat={s} />
        ))}
      </section>

      {/* Agents */}
      <section>
        <PageHeader
          title="Agents"
          subtitle="5 agents IA spécialisés pour Coliver et SEO"
          actions={
            <Link to="/agents">
              <Button variant="ghost" size="sm" icon={<ArrowUpRight size={14} />}>
                Tout voir
              </Button>
            </Link>
          }
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {agents.map((a) => (
            <AgentCard key={a.id} agent={a} />
          ))}
        </div>
      </section>

      {/* Machines + Activity */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <PageHeader
            title="Machines live"
            subtitle="Automatisations actives en production"
            actions={
              <Link to="/machines">
                <Button variant="ghost" size="sm" icon={<ArrowUpRight size={14} />}>
                  Voir les 13
                </Button>
              </Link>
            }
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {topMachines.map((m) => (
              <MachineCard key={m.id} machine={m} />
            ))}
          </div>
        </div>

        <div>
          <PageHeader title="Activité" subtitle="Stream en direct" />
          <ActivityFeed items={activityFeed.slice(0, 6)} />
        </div>
      </section>
    </div>
  );
}
