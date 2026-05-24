import { Plus, MapPin, Calendar, Users, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { KPICard } from '@/components/cards/KPICard';
import { coliverProperties } from '@/data/coliver';
import { cn, formatRelativeTime } from '@/lib/utils';

const typeLabel = {
  coliving: 'Coliving',
  coworking: 'Coworking',
  hybride: 'Hybride',
} as const;

export function Coliver() {
  const totalRevenue = coliverProperties.reduce((sum, p) => sum + p.monthlyRevenue, 0);
  const totalBeds = coliverProperties.reduce((sum, p) => sum + p.beds, 0);
  const avgOccupancy =
    coliverProperties.filter((p) => p.status === 'live').reduce((sum, p) => sum + p.occupancy, 0) /
    coliverProperties.filter((p) => p.status === 'live').length;

  return (
    <div>
      <PageHeader
        title="Coliver"
        subtitle="Gestion coliving + coworking · La Réunion"
        actions={
          <Button variant="primary" icon={<Plus size={16} />}>
            Nouveau lieu
          </Button>
        }
      />

      {/* KPI grid */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          icon={MapPin}
          label="Lieux"
          value={coliverProperties.length.toString()}
          sub={`${coliverProperties.filter((p) => p.status === 'live').length} live`}
          gradient="violet-pink"
        />
        <KPICard
          icon={Users}
          label="Lits"
          value={totalBeds.toString()}
          sub="capacité totale"
          gradient="cyan"
        />
        <KPICard
          icon={TrendingUp}
          label="Occupation"
          value={`${Math.round(avgOccupancy)} %`}
          sub="moyenne live"
          gradient="green"
        />
        <KPICard
          icon={Calendar}
          label="Revenus / mois"
          value={`${totalRevenue.toLocaleString('fr-FR')} €`}
          sub="MRR consolidé"
          gradient="orange"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {coliverProperties.map((p) => (
          <div key={p.id} className="card card-hover p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wider text-text-tertiary">
                  {typeLabel[p.type]}
                </div>
                <h3 className="mt-0.5 text-xl font-semibold text-text-primary">{p.name}</h3>
                <div className="mt-1 flex items-center gap-1.5 text-sm text-text-secondary">
                  <MapPin size={14} className="text-text-tertiary" />
                  {p.location}
                </div>
              </div>
              <StatusBadge status={p.status === 'preparing' ? 'building' : p.status === 'paused' ? 'idle' : 'live'} />
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-border-subtle bg-bg-base/40 p-3">
                <div className="text-xs text-text-tertiary">Lits</div>
                <div className="mt-1 text-lg font-semibold text-text-primary">{p.beds || '—'}</div>
              </div>
              <div className="rounded-xl border border-border-subtle bg-bg-base/40 p-3">
                <div className="text-xs text-text-tertiary">Occupation</div>
                <div
                  className={cn(
                    'mt-1 text-lg font-semibold',
                    p.occupancy >= 80
                      ? 'text-accent-green'
                      : p.occupancy >= 50
                        ? 'text-accent-orange'
                        : 'text-text-secondary',
                  )}
                >
                  {p.occupancy} %
                </div>
              </div>
              <div className="rounded-xl border border-border-subtle bg-bg-base/40 p-3">
                <div className="text-xs text-text-tertiary">Revenu / mois</div>
                <div className="mt-1 text-lg font-semibold text-text-primary">
                  {p.monthlyRevenue.toLocaleString('fr-FR')} €
                </div>
              </div>
            </div>

            {p.nextCheckIn && (
              <div className="mt-4 flex items-center gap-2 text-sm text-text-tertiary">
                <Calendar size={14} />
                Prochain check-in · {formatRelativeTime(p.nextCheckIn)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
