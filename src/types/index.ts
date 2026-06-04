import type { LucideIcon } from 'lucide-react';
import type { Role } from '@/types/auth';

export type Status = 'live' | 'building' | 'idle' | 'error';

export type GradientName =
  | 'violet-pink'
  | 'orange'
  | 'pink'
  | 'cyan'
  | 'green'
  | 'violet'
  | 'blue';

export interface Agent {
  id: string;
  name: string;
  code: string;
  role: string;
  description: string;
  status: Status;
  gradient: GradientName;
  icon: LucideIcon;
  channels: string[];
  stats: {
    runs: number;
    success: number;
    avgTime: string;
  };
  lastRun?: Date;
  domain: 'coliver' | 'seo' | 'global';
}

export interface Machine {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  categoryIcon: string;
  status: Status;
  gradient: GradientName;
  icon: LucideIcon;
  lastRun?: Date;
}

export interface Stat {
  label: string;
  value: string;
  delta?: string;
  trend?: 'up' | 'down' | 'flat';
  icon: LucideIcon;
  gradient: GradientName;
}

export interface ActivityItem {
  id: string;
  type: 'agent_run' | 'machine_run' | 'booking' | 'seo' | 'system';
  agentOrMachine?: string;
  title: string;
  description?: string;
  status: 'success' | 'error' | 'info' | 'warning';
  timestamp: Date;
}

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: Role[];
}

export interface ColiverProperty {
  id: string;
  name: string;
  location: string;
  type: 'coliving' | 'coworking' | 'hybride';
  beds: number;
  occupancy: number;
  monthlyRevenue: number;
  status: 'live' | 'paused' | 'preparing';
  nextCheckIn?: Date;
}

export interface SeoLink {
  id: string;
  domain: string;
  niche: string;
  da: number;
  monthlyClicks: number;
  status: 'live' | 'pending' | 'broken';
  acquiredAt: Date;
  cost: number;
}
