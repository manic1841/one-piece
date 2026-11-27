import { eyebrowClass } from '@/ui/components/eyebrow';
import { MONEY_TONE_CLASS } from '@/ui/components/moneyTone';
import { PROJECTION_YEARLY_DETAIL_LABELS } from '@/ui/constants/retirement/displayLabels';
import { type RetirementProjectionYearDetailVM } from '@/ui/features/retirement/viewmodels/projectionDisplay.vm';
import { cn } from '@/ui/utils/cn';

/** Every surface that can render the same year simultaneously. */
export type BreakdownScope = 'desktop' | 'mobile' | 'panel';

interface YearBreakdownProps {
  row: RetirementProjectionYearDetailVM;
  /**
   * Which container renders it. The panel, the desktop table and the mobile
   * list can show the same year at once, so ids and test ids must not collide.
   */
  scope: BreakdownScope;
}

interface BreakdownGroupProps {
  title: string;
  /** Group tone: income gains, expense spends; the title carries it too. */
  tone: 'positive' | 'negative';
  total: string;
  items: RetirementProjectionYearDetailVM['inflowItems'];
  emptyText: string;
  /** Unique per group, so the human-readable title can stay a shared label. */
  titleId: string;
}

/** One side of the breakdown: a titled group with its subtotal and lines. */
function BreakdownGroup({ title, tone, total, items, emptyText, titleId }: BreakdownGroupProps) {
  return (
    <section aria-labelledby={titleId}>
      {/* Level 1: the group, strong and colour-coded; it owns the subtotal. */}
      <div className="flex items-baseline justify-between gap-3 border-b border-border pb-1.5">
        <h3 id={titleId} className={cn(eyebrowClass, 'font-semibold', MONEY_TONE_CLASS[tone])}>
          {title}
        </h3>
        <span
          className={cn('font-mono text-sm font-semibold tabular-nums', MONEY_TONE_CLASS[tone])}
        >
          {total}
        </span>
      </div>
      {/* Level 2: the lines, indented under a rule and kept neutral so the
          group owns the tone. */}
      {items.length === 0 ? (
        <p className="ml-1 mt-1 border-l-2 border-border py-0.5 pl-3 text-sm text-muted-foreground">
          {emptyText}
        </p>
      ) : (
        <dl className="ml-1 mt-1 max-h-64 space-y-0.5 overflow-y-auto border-l-2 border-border pl-3">
          {items.map((item) => (
            <div key={item.sourceRef} className="flex items-baseline justify-between gap-3 py-0.5">
              <dt className="flex min-w-0 items-baseline gap-2 text-sm">
                <span className="truncate text-foreground">{item.label}</span>
                <span className={cn(eyebrowClass, 'shrink-0 text-muted-foreground/70')}>
                  {item.originText}
                </span>
              </dt>
              <dd className="shrink-0 font-mono text-sm tabular-nums text-muted-foreground">
                {item.amountText}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

/**
 * Per-year income and expense lines behind the two totals. Shared by the yearly
 * table's expanded row and the annual panel's cash-flow view so both read the
 * same way.
 */
export function YearBreakdown({ row, scope }: YearBreakdownProps) {
  const idPrefix = `breakdown-${scope}-${row.year}`;
  return (
    <div className="space-y-4" data-testid={`year-breakdown-${scope}-${row.year}`}>
      <BreakdownGroup
        title={PROJECTION_YEARLY_DETAIL_LABELS.incomeBreakdown}
        tone="positive"
        total={row.incomeText}
        items={row.inflowItems}
        emptyText={PROJECTION_YEARLY_DETAIL_LABELS.noIncomeItems}
        titleId={`${idPrefix}-income`}
      />
      <BreakdownGroup
        title={PROJECTION_YEARLY_DETAIL_LABELS.expenseBreakdown}
        tone="negative"
        total={row.expenseText}
        items={row.outflowItems}
        emptyText={PROJECTION_YEARLY_DETAIL_LABELS.noExpenseItems}
        titleId={`${idPrefix}-expense`}
      />
    </div>
  );
}
