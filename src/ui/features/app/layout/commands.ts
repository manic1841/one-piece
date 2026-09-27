import { QUICK_ACCESS_COMMAND_LABELS } from '@/ui/constants/app/appLabels';

export interface QuickAccessCommand {
  to: string;
  label: string;
}

const COMMAND_DEFS: Array<{ to: string; label: string }> = [
  { to: '/', label: QUICK_ACCESS_COMMAND_LABELS.DASHBOARD },
  { to: '/close', label: QUICK_ACCESS_COMMAND_LABELS.MONTHLY_CLOSE },
  { to: '/transactions', label: QUICK_ACCESS_COMMAND_LABELS.TRANSACTIONS },
  { to: '/projects', label: QUICK_ACCESS_COMMAND_LABELS.PROJECTS },
  { to: '/accounts', label: QUICK_ACCESS_COMMAND_LABELS.ACCOUNTS },
  { to: '/portfolios', label: QUICK_ACCESS_COMMAND_LABELS.PORTFOLIOS },
  { to: '/reports', label: QUICK_ACCESS_COMMAND_LABELS.REPORTS },
  { to: '/retirement', label: QUICK_ACCESS_COMMAND_LABELS.RETIREMENT },
  { to: '/debt', label: QUICK_ACCESS_COMMAND_LABELS.DEBT },
  { to: '/settings', label: QUICK_ACCESS_COMMAND_LABELS.SETTINGS },
];

export const commands: QuickAccessCommand[] = COMMAND_DEFS;
