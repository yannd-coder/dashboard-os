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

export interface MachineRun {
  id: string;
  machineCode: string;
  triggerSource: 'manual' | 'cron' | 'webhook';
  status: 'running' | 'success' | 'error';
  summary: string | null;
  error: string | null;
  triggeredBy: string | null;
  startedAt: Date;
  endedAt: Date | null;
}

export type DraftNetwork = 'facebook' | 'instagram';
export type DraftStatus = 'pending' | 'approved' | 'rejected' | 'published';

export interface PostDraft {
  id: string;
  machineRunId: string | null;
  machineCode: string;
  network: DraftNetwork;
  accountHandle: string;
  content: string;
  status: DraftStatus;
  decidedAt: Date | null;
  decidedBy: string | null;
  notes: string | null;
  createdAt: Date;
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
