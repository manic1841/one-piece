import { cn } from '@/ui/utils/cn';

import { AnimatedNumber } from './AnimatedNumber';
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
  /** Confirmed raw value; when given, the figure interpolates between updates (motion-system §5.2). */
  animatedValue?: number | null;
  /** Formatter for the animated figure. Defaults to nothing, so `value` stays authoritative. */
  animateFormat?: (value: number) => string;
  /** Count up from zero on mount; only for a figure that is the screen's subject (motion-system §5.2). */
  animateOnMount?: boolean;
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
  animatedValue,
  animateFormat = (raw) => String(Math.round(raw)),
  animateOnMount = false,
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
        {animatedValue === undefined ? (
          (value ?? MISSING)
        ) : (
          <AnimatedNumber
            value={animatedValue}
            format={animateFormat}
            missing={MISSING}
            animateOnMount={animateOnMount}
          />
        )}
      </span>
      {change !== undefined && (
        <span className={cn('mt-2 block font-mono text-xs', MONEY_CHANGE_TONE_CLASS[changeTone])}>
          {change}
        </span>
      )}
    </span>
  );
}
