import {
  Briefcase,
  CheckCheck,
  FileText,
  Folder,
  LayoutDashboard,
  Receipt,
  Settings,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  group: 'primary' | 'secondary';
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', group: 'primary' },
  { to: '/projects', icon: Folder, label: 'Projects', group: 'primary' },
  { to: '/accounts', icon: Wallet, label: 'Accounts', group: 'primary' },
  { to: '/reports', icon: FileText, label: 'Reports', group: 'primary' },
  { to: '/close', icon: CheckCheck, label: 'Close', group: 'secondary' },
  { to: '/transactions', icon: Receipt, label: 'Transactions', group: 'secondary' },
  { to: '/retirement', icon: TrendingUp, label: 'Retirement', group: 'secondary' },
  { to: '/portfolios', icon: Briefcase, label: 'Portfolios', group: 'secondary' },
  { to: '/debt', icon: Wallet, label: 'Debt', group: 'secondary' },
  { to: '/settings', icon: Settings, label: 'Settings', group: 'secondary' },
];

export function getPrimaryNavItems(): NavItem[] {
  return NAV_ITEMS.filter((item) => item.group === 'primary');
}

export function getSecondaryNavItems(): NavItem[] {
  return NAV_ITEMS.filter((item) => item.group === 'secondary');
}

const NAVIGATOR_EXCLUDED = new Set(['/', '/settings']);

export function getNavigatorItems(): NavItem[] {
  return NAV_ITEMS.filter((item) => !NAVIGATOR_EXCLUDED.has(item.to));
}
