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

export interface PostDraftImageUrls {
  square?: string;
  story?: string;
  banner?: string;
}

export interface PostDraft {
  id: string;
  machineRunId: string | null;
  machineCode: string;
  network: DraftNetwork;
  accountHandle: string;
  content: string;
  imageUrls: PostDraftImageUrls | null;
  visualAccroche: string | null;
  visualPhotoUrl: string | null;
  status: DraftStatus;
  decidedAt: Date | null;
  decidedBy: string | null;
  notes: string | null;
  createdAt: Date;
}

export interface KnowledgeDoc {
  id: string;
  filename: string;
  storagePath: string;
  mime: string;
  sizeBytes: number;
  summary: string | null;
  charCount: number;
  uploadedAt: Date;
}

export interface AgentConversation {
  id: string;
  agentCode: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export type AgentMessageRole = 'user' | 'assistant' | 'tool';

export interface AgentMessage {
  id: string;
  role: AgentMessageRole;
  content: string;
  toolCalls?: unknown;
  toolResults?: unknown;
  metadata?: { model?: string; usage?: { input_tokens?: number; output_tokens?: number } };
  createdAt: Date;
}

export type ProspectSource = 'email' | 'lodgify' | 'form' | 'whatsapp' | 'phone' | 'other';
export type ProspectStatus = 'new' | 'replied' | 'ignored';

export interface Prospect {
  id: string;
  source: ProspectSource;
  emailFrom: string | null;
  subject: string | null;
  body: string;
  requestSummary: string | null;
  status: ProspectStatus;
  receivedAt: Date | null;
  createdAt: Date;
}

export type ResponseDraftStatus = 'pending' | 'approved' | 'rejected' | 'sent';

export interface ResponseDraft {
  id: string;
  prospect: Prospect | null;
  content: string;
  status: ResponseDraftStatus;
  decidedAt: Date | null;
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

export interface CampaignPhoto {
  id: string;
  storagePath: string;
  publicUrl: string;
  alt: string | null;
  tags: string[];
  isActive: boolean;
  uploadedBy: string | null;
  uploadedAt: Date;
}
