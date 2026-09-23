import React from 'react';

import { cn } from '@/ui/utils/cn';

interface PeriodBadgeProps {
  label: string;
  period: string;
  className?: string;
}

export const PeriodBadge: React.FC<PeriodBadgeProps> = ({ label, period, className }) => (
  <span
    className={cn(
      'inline-flex items-center border border-border bg-muted px-3 py-2 font-mono text-[13px] tabular-nums text-foreground',
      className,
    )}
  >
    {label} / {period}
  </span>
);

export default PeriodBadge;
