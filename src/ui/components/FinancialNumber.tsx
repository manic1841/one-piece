import { cn } from '@/ui/utils/cn';

export type FinancialNumberSize = 'hero' | 'large' | 'default';

export type FinancialNumberTone = 'default' | 'positive' | 'negative';

type FinancialNumberProps = {
  /** Formatted money string, e.g. "$4,812,430". Missing data renders "$ —" when value is nullish. */
  value?: string | null;
  size?: FinancialNumberSize;
  tone?: FinancialNumberTone;
  className?: string;
};

const sizeClass: Record<FinancialNumberSize, string> = {
  hero: 'text-4xl tracking-display leading-tight',
  large: 'text-3xl tracking-display leading-tight',
  default: 'text-lg tracking-display',
};

const toneClass: Record<FinancialNumberTone, string> = {
  default: 'text-foreground',
  positive: 'text-positive',
  negative: 'text-negative',
};

const MISSING = '$ —';

/** Financial value display: readable first, explainable when needed. Values are preformatted by callers. */
export function FinancialNumber({ value, size = 'default', tone = 'default', className }: FinancialNumberProps) {
  return (
    <span
      className={cn(
        'inline-block font-mono tabular-nums',
        sizeClass[size],
        toneClass[tone],
        className,
      )}
    >
      {value ?? MISSING}
    </span>
  );
}
