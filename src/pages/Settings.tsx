import { Key, Globe, Bell, Database, User } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { IconSquare } from '@/components/ui/IconSquare';

const sections = [
  {
    icon: User,
    title: 'Profil',
    description: 'Yann · Founder · Coliver & SEO',
    gradient: 'violet-pink' as const,
  },
  {
    icon: Key,
    title: 'Clés API',
    description: 'OpenAI, Claude, Stripe, Supabase, Resend',
    gradient: 'orange' as const,
  },
  {
    icon: Database,
    title: 'Base de données',
    description: 'Supabase · projet "kor-app" (Europe West)',
    gradient: 'cyan' as const,
  },
  {
    icon: Globe,
    title: 'Déploiement',
    description: 'dashboard.makeitapp.fr · O2switch FTP',
    gradient: 'green' as const,
  },
  {
    icon: Bell,
    title: 'Notifications',
    description: 'Email, WhatsApp, Slack',
    gradient: 'pink' as const,
  },
];

export function Settings() {
  return (
    <div>
      <PageHeader title="Settings" subtitle="Configuration globale de l'OS" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {sections.map((s) => (
          <div key={s.title} className="card card-hover p-5">
            <div className="flex items-start gap-4">
              <IconSquare icon={s.icon} gradient={s.gradient} size="md" />
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold text-text-primary">{s.title}</h3>
                <p className="mt-1 text-sm text-text-secondary">{s.description}</p>
              </div>
              <Button variant="outline" size="sm">Configurer</Button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 card p-6">
        <h3 className="text-sm font-semibold text-text-primary">Version</h3>
        <p className="mt-1 text-sm text-text-secondary">
          YANN OS v0.1 · React 18 + Vite + Tailwind · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
