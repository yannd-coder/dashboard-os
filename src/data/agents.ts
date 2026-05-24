import { Bot, Brain, Cpu, Sparkles, Zap } from 'lucide-react';
import type { Agent } from '@/types';

export const agents: Agent[] = [
  {
    id: 'leon',
    name: 'Léon',
    code: 'A01',
    role: 'Concierge Coliver',
    description:
      'Gère les bookings, le check-in et le suivi des résidents Coliver. Répond aux demandes 24/7 via WhatsApp.',
    status: 'live',
    gradient: 'violet-pink',
    icon: Bot,
    stats: { runs: 142, success: 98, avgTime: '1.2 s' },
    lastRun: new Date(Date.now() - 1000 * 60 * 4),
    domain: 'coliver',
  },
  {
    id: 'aria',
    name: 'Aria',
    code: 'A02',
    role: 'Analyste SEO',
    description:
      'Audit mensuel des positions, détection des opportunités de backlinks et veille concurrentielle SEO.',
    status: 'live',
    gradient: 'pink',
    icon: Sparkles,
    stats: { runs: 87, success: 95, avgTime: '4.8 s' },
    lastRun: new Date(Date.now() - 1000 * 60 * 22),
    domain: 'seo',
  },
  {
    id: 'max',
    name: 'Max',
    code: 'A03',
    role: 'Content Writer',
    description:
      'Rédaction d\'articles SEO long format pour les sites de niche. Pipeline brief → outline → article → publication.',
    status: 'building',
    gradient: 'orange',
    icon: Brain,
    stats: { runs: 34, success: 88, avgTime: '12 s' },
    lastRun: new Date(Date.now() - 1000 * 60 * 60 * 2),
    domain: 'seo',
  },
  {
    id: 'rex',
    name: 'Rex',
    code: 'A04',
    role: 'Revenue Manager',
    description:
      'Optimise les prix Coliver en fonction de la demande, des saisons et de la concurrence Airbnb/Booking.',
    status: 'live',
    gradient: 'green',
    icon: Cpu,
    stats: { runs: 56, success: 100, avgTime: '2.1 s' },
    lastRun: new Date(Date.now() - 1000 * 60 * 12),
    domain: 'coliver',
  },
  {
    id: 'nova',
    name: 'Nova',
    code: 'A05',
    role: 'Orchestrateur',
    description:
      'Méta-agent : route les tâches vers les bons agents/machines, monitore les pipelines et alerte en cas d\'échec.',
    status: 'live',
    gradient: 'cyan',
    icon: Zap,
    stats: { runs: 312, success: 99, avgTime: '0.4 s' },
    lastRun: new Date(Date.now() - 1000 * 30),
    domain: 'global',
  },
];
