import { ExternalLink, Plus, TrendingUp, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/layout/PageHeader';
import { KPICard } from '@/components/cards/KPICard';
import { seoLinks } from '@/data/seo';
import { cn } from '@/lib/utils';

const statusConfig = {
  live: { label: 'Live', class: 'text-accent-green bg-accent-green/10' },
  pending: { label: 'En attente', class: 'text-accent-orange bg-accent-orange/10' },
  broken: { label: 'Cassé', class: 'text-accent-red bg-accent-red/10' },
} as const;

export function LiensSEO() {
  const totalClicks = seoLinks.reduce((s, l) => s + l.monthlyClicks, 0);
  const totalCost = seoLinks.reduce((s, l) => s + l.cost, 0);
  const live = seoLinks.filter((l) => l.status === 'live').length;
  const broken = seoLinks.filter((l) => l.status === 'broken').length;
  const avgDa = Math.round(seoLinks.reduce((s, l) => s + l.da, 0) / seoLinks.length);

  return (
    <div>
      <PageHeader
        title="Liens SEO"
        subtitle="Backlinks acquis et performances cross-niches"
        actions={
          <Button variant="primary" icon={<Plus size={16} />}>
            Ajouter un lien
          </Button>
        }
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard icon={LinkIcon} label="Backlinks" value={seoLinks.length.toString()} sub={`${live} live · ${broken} cassés`} gradient="violet-pink" />
        <KPICard icon={TrendingUp} label="Clicks / mois" value={totalClicks.toLocaleString('fr-FR')} sub="organique total" gradient="green" />
        <KPICard icon={TrendingUp} label="DA moyen" value={avgDa.toString()} sub="qualité globale" gradient="cyan" />
        <KPICard icon={AlertCircle} label="Investi" value={`${totalCost} €`} sub="acquisition totale" gradient="orange" />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border-subtle bg-bg-surface2/50">
              <tr className="text-left text-xs uppercase tracking-wider text-text-tertiary">
                <th className="px-5 py-3 font-medium">Domaine</th>
                <th className="px-5 py-3 font-medium">Niche</th>
                <th className="px-5 py-3 font-medium">DA</th>
                <th className="px-5 py-3 font-medium">Clicks / mois</th>
                <th className="px-5 py-3 font-medium">Coût</th>
                <th className="px-5 py-3 font-medium">Statut</th>
                <th className="px-5 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {seoLinks.map((link) => {
                const s = statusConfig[link.status];
                return (
                  <tr key={link.id} className="hover:bg-bg-surface2/40">
                    <td className="px-5 py-4 font-medium text-text-primary">{link.domain}</td>
                    <td className="px-5 py-4 text-text-secondary">{link.niche}</td>
                    <td className="px-5 py-4 font-semibold text-text-primary">{link.da}</td>
                    <td className="px-5 py-4 text-text-secondary">
                      {link.monthlyClicks.toLocaleString('fr-FR')}
                    </td>
                    <td className="px-5 py-4 text-text-secondary">{link.cost} €</td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                          s.class,
                        )}
                      >
                        {s.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <a
                        href={`https://${link.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-tertiary hover:bg-bg-elevated hover:text-text-primary"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
