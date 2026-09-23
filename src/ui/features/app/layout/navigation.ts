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
  /**
   * Set on destinations that have their own entry point and must stay out of the
   * Pixel Pet Navigator (ADR-0055 decision 1): Dashboard (`/`) is the header
   * brand and Settings (`/settings`) lives in the Avatar menu.
   */
  excludeFromNavigator?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', excludeFromNavigator: true },
  { to: '/projects', icon: Folder, label: 'Projects' },
  { to: '/accounts', icon: Wallet, label: 'Accounts' },
  { to: '/reports', icon: FileText, label: 'Reports' },
  { to: '/close', icon: CheckCheck, label: 'Close' },
  { to: '/transactions', icon: Receipt, label: 'Transactions' },
  { to: '/retirement', icon: TrendingUp, label: 'Retirement' },
  { to: '/portfolios', icon: Briefcase, label: 'Portfolios' },
  { to: '/debt', icon: Wallet, label: 'Debt' },
  { to: '/settings', icon: Settings, label: 'Settings', excludeFromNavigator: true },
];

/**
 * Navigator destinations: the subset of `NAV_ITEMS` shown in the Pixel Pet
 * Navigator (8 items), i.e. all routes except Dashboard and Settings. Quick
 * Access (Ctrl/Cmd+K) lists all of `NAV_ITEMS` independently (ADR-0055
 * decisions 2 and 3).
 */
export const NAVIGATOR_ITEMS: NavItem[] = NAV_ITEMS.filter(
  (item) => !item.excludeFromNavigator,
);
