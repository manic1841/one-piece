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
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects', icon: Folder, label: 'Projects' },
  { to: '/accounts', icon: Wallet, label: 'Accounts' },
  { to: '/reports', icon: FileText, label: 'Reports' },
  { to: '/close', icon: CheckCheck, label: 'Close' },
  { to: '/transactions', icon: Receipt, label: 'Transactions' },
  { to: '/retirement', icon: TrendingUp, label: 'Retirement' },
  { to: '/portfolios', icon: Briefcase, label: 'Portfolios' },
  { to: '/debt', icon: Wallet, label: 'Debt' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];
