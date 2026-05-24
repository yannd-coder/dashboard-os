import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/layout/PageHeader';
import { KPICard } from '@/components/cards/KPICard';
import { analyticsKpis } from '@/data/stats';

const trafficData = [
  { day: 'Lun', visits: 4200, bookings: 8 },
  { day: 'Mar', visits: 5100, bookings: 11 },
  { day: 'Mer', visits: 4800, bookings: 9 },
  { day: 'Jeu', visits: 6200, bookings: 14 },
  { day: 'Ven', visits: 7400, bookings: 17 },
  { day: 'Sam', visits: 8200, bookings: 22 },
  { day: 'Dim', visits: 6900, bookings: 15 },
];

const runsByAgent = [
  { agent: 'Léon', runs: 142 },
  { agent: 'Aria', runs: 87 },
  { agent: 'Max', runs: 34 },
  { agent: 'Rex', runs: 56 },
  { agent: 'Nova', runs: 312 },
];

export function Analytics() {
  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Performances cross-business · 7 derniers jours"
        actions={
          <Button variant="secondary" icon={<Download size={14} />}>
            Exporter
          </Button>
        }
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {analyticsKpis.map((k) => (
          <KPICard
            key={k.label}
            icon={k.icon}
            label={k.label}
            value={k.value}
            sub={k.delta}
            gradient={k.gradient}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="card p-6">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Trafic & bookings</h3>
              <p className="text-xs text-text-tertiary">Visites SEO + bookings Coliver / jour</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trafficData}>
                <defs>
                  <linearGradient id="violetGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#A855F7" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#A855F7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="pinkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EC4899" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#EC4899" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" stroke="#6B6B7E" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#6B6B7E" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#15151F',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: '#F4F4F8' }}
                />
                <Area
                  type="monotone"
                  dataKey="visits"
                  stroke="#A855F7"
                  strokeWidth={2}
                  fill="url(#violetGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="bookings"
                  stroke="#EC4899"
                  strokeWidth={2}
                  fill="url(#pinkGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Runs par agent</h3>
            <p className="text-xs text-text-tertiary">Volumétrie cette semaine</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={runsByAgent}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="agent" stroke="#6B6B7E" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#6B6B7E" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#15151F',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: '#F4F4F8' }}
                  cursor={{ fill: 'rgba(168,85,247,0.08)' }}
                />
                <Bar dataKey="runs" fill="#A855F7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
