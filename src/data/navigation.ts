import {
  BarChart3,
  BookOpen,
  Bot,
  Images,
  LayoutDashboard,
  Link as LinkIcon,
  Palmtree,
  Send,
  Server,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import type { NavItem } from '@/types';

export const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Agents', href: '/agents', icon: Bot },
  { label: 'Machines', href: '/machines', icon: Server },
  { label: 'Publications', href: '/publications', icon: Send },
  { label: 'Coliver', href: '/coliver', icon: Palmtree },
  { label: 'Liens SEO', href: '/seo', icon: LinkIcon },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Settings', href: '/settings', icon: Settings },
  { label: 'Visuels', href: '/visuels', icon: Images, roles: ['superadmin', 'admin'] },
  { label: 'Knowledge', href: '/knowledge', icon: BookOpen, roles: ['superadmin', 'admin'] },
  { label: 'Admin', href: '/admin', icon: ShieldCheck, roles: ['superadmin'] },
];
