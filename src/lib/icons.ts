import {
  Bot,
  BookOpen,
  Brain,
  Calendar,
  Cpu,
  FileText,
  Globe,
  Image,
  Link as LinkIcon,
  Mail,
  MessageSquare,
  Search,
  Sparkles,
  TrendingUp,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  Bot,
  BookOpen,
  Brain,
  Calendar,
  Cpu,
  FileText,
  Globe,
  Image,
  Link: LinkIcon,
  Mail,
  MessageSquare,
  Search,
  Sparkles,
  TrendingUp,
  Wrench,
  Zap,
};

export function resolveIcon(name: string | null | undefined): LucideIcon {
  if (!name) return Wrench;
  return ICONS[name] ?? Wrench;
}
