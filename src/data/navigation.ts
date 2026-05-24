import {
  BarChart3,
  Bot,
  LayoutDashboard,
  Link as LinkIcon,
  Palmtree,
  Server,
  Settings,
} from 'lucide-react';
import type { NavItem } from '@/types';

export const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Agents', href: '/agents', icon: Bot },
  { label: 'Machines', href: '/machines', icon: Server },
  { label: 'Coliver', href: '/coliver', icon: Palmtree },
  { label: 'Liens SEO', href: '/seo', icon: LinkIcon },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Settings', href: '/settings', icon: Settings },
];
