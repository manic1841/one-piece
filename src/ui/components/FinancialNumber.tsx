import { cn } from '@/ui/utils/cn';

import {
  MONEY_CHANGE_TONE_CLASS,
  MONEY_TONE_CLASS,
  type MoneyChangeTone,
  type MoneyTone,
} from './moneyTone';

export type FinancialNumberSize = 'hero' | 'large' | 'default';

type FinancialNumberProps = {
  /** Formatted money string, e.g. "$4,812,430". Nullish renders the missing-data form. */
  value?: string | null;
  size?: FinancialNumberSize;
  tone?: MoneyTone;
  /** Formatted change line, e.g. "+8.42% YTD · +NT$374,210". Omit when there is no change. */
  change?: string;
  changeTone?: MoneyChangeTone;
  className?: string;
};

const sizeClass: Record<FinancialNumberSize, string> = {
  hero: 'text-4xl tracking-display leading-tight',
  large: 'text-3xl tracking-display leading-tight',
  default: 'text-lg tracking-display',
};

const MISSING = '$ —';

/** Financial value display. Values are preformatted by callers; the change line is optional. */
export function FinancialNumber({
  value,
  size = 'default',
  tone = 'default',
  change,
  changeTone = 'muted',
  className,
}: FinancialNumberProps) {
  return (
    <span className={cn('inline-block', className)}>
      <span
        className={cn(
          'inline-block font-mono tabular-nums',
          sizeClass[size],
          MONEY_TONE_CLASS[tone],
        )}
      >
        {value ?? MISSING}
      </span>
      {change !== undefined && (
        <span className={cn('mt-2 block font-mono text-xs', MONEY_CHANGE_TONE_CLASS[changeTone])}>
          {change}
        </span>
      )}
    </span>
  );
}
