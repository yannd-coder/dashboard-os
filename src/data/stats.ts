import { Activity, Bot, DollarSign, Server, Sparkles, TrendingUp } from 'lucide-react';
import type { Stat } from '@/types';

export const dashboardStats: Stat[] = [
  {
    label: 'Agents actifs',
    value: '5',
    delta: '+1 ce mois',
    trend: 'up',
    icon: Bot,
    gradient: 'violet-pink',
  },
  {
    label: 'Machines live',
    value: '11',
    delta: '+2',
    trend: 'up',
    icon: Server,
    gradient: 'cyan',
  },
  {
    label: 'Runs aujourd\'hui',
    value: '631',
    delta: '+18 %',
    trend: 'up',
    icon: Activity,
    gradient: 'green',
  },
  {
    label: 'Revenue MRR',
    value: '12 480 €',
    delta: '+8 %',
    trend: 'up',
    icon: DollarSign,
    gradient: 'orange',
  },
];

export const analyticsKpis: Stat[] = [
  {
    label: 'Visites SEO',
    value: '48.2k',
    delta: '+12 % vs 30j',
    trend: 'up',
    icon: TrendingUp,
    gradient: 'violet-pink',
  },
  {
    label: 'Taux occupation',
    value: '87 %',
    delta: '+4 pts',
    trend: 'up',
    icon: Sparkles,
    gradient: 'green',
  },
  {
    label: 'Coût API',
    value: '142 €',
    delta: '−9 €',
    trend: 'down',
    icon: DollarSign,
    gradient: 'orange',
  },
  {
    label: 'Économie vs manuel',
    value: '~18 h',
    delta: 'cette semaine',
    trend: 'up',
    icon: Activity,
    gradient: 'cyan',
  },
];
