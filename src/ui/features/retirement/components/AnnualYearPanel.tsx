import { useState } from 'react';

import { type DefinitionItem, DefinitionRows } from '@/ui/components/DefinitionRows';
import { FilterStrip } from '@/ui/components/FilterStrip';
import { FinancialNumber } from '@/ui/components/FinancialNumber';
import { eyebrowClass } from '@/ui/components/eyebrow';
import { MONEY_TONE_CLASS, signTone } from '@/ui/components/moneyTone';
import {
  PROJECTION_COMMON_LABELS,
  PROJECTION_YEARLY_DETAIL_LABELS,
} from '@/ui/constants/retirement/displayLabels';
import { PROJECTION_VIEW_LABELS } from '@/ui/constants/retirement/projectionLabels';
import { type RetirementProjectionYearDetailVM } from '@/ui/features/retirement/viewmodels/projectionDisplay.vm';
import { cn } from '@/ui/utils/cn';

interface AnnualYearPanelProps {
  row: RetirementProjectionYearDetailVM;
  birthYear: number | null;
}

type PanelView = 'summary' | 'cashFlow';

const VIEW_ITEMS = [
  { id: 'summary', label: PROJECTION_VIEW_LABELS.PANEL_SUMMARY },
  { id: 'cashFlow', label: PROJECTION_VIEW_LABELS.PANEL_CASH_FLOW },
];

const COLUMNS = PROJECTION_YEARLY_DETAIL_LABELS.columns;

/** Net worth is the panel's anchor; the net change carries its own sign. */
const netWorthClass = (opening: number): string =>
  cn('font-semibold', opening < 0 ? MONEY_TONE_CLASS.negative : MONEY_TONE_CLASS.default);

const SUMMARY_ITEMS = (row: RetirementProjectionYearDetailVM): DefinitionItem[] => [
  {
    label: COLUMNS.openingNetWorth,
    value: row.openingText,
    valueClassName: netWorthClass(row.opening),
  },
  {
    label: COLUMNS.netCashFlow,
    value: row.netCashFlowText,
    valueClassName: MONEY_TONE_CLASS[signTone(row.netCashFlow)],
  },
  { label: PROJECTION_VIEW_LABELS.PANEL_RETIREMENT_STATUS, value: row.statusText },
];

const CASH_FLOW_ITEMS = (row: RetirementProjectionYearDetailVM): DefinitionItem[] => [
  { label: COLUMNS.income, value: row.incomeText, valueClassName: 'text-muted-foreground' },
  { label: COLUMNS.expense, value: row.expenseText, valueClassName: 'text-muted-foreground' },
  {
    label: COLUMNS.investmentReturn,
    value: row.investmentReturnText,
    valueClassName: 'text-muted-foreground',
  },
  {
    label: COLUMNS.netCashFlow,
    value: row.netCashFlowText,
    valueClassName: MONEY_TONE_CLASS[signTone(row.netCashFlow)],
  },
];

/**
 * Read-only single-year panel opened from the trend chart or the key-year
 * buttons. The year heading is a polite live region; the panel itself is
 * focusable but never steals focus.
 */
export function AnnualYearPanel({ row, birthYear }: AnnualYearPanelProps) {
  const [view, setView] = useState<PanelView>('summary');
  const age = birthYear === null ? PROJECTION_COMMON_LABELS.DASH : String(row.year - birthYear);

  return (
    <div
      className="border-b border-border py-6"
      data-testid="annual-year-panel"
      role="region"
      tabIndex={-1}
      aria-label={PROJECTION_VIEW_LABELS.ANNUAL_DETAILS}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className={eyebrowClass}>{PROJECTION_VIEW_LABELS.ANNUAL_DETAILS}</p>
          <p className="mt-1 font-mono text-sm text-foreground" aria-live="polite">
            {row.year} · {PROJECTION_VIEW_LABELS.AGE_PREFIX} {age}
          </p>
        </div>
        <div className="text-right">
          <p className={eyebrowClass}>{COLUMNS.openingNetWorth}</p>
          <FinancialNumber
            value={row.openingText}
            size="large"
            className="mt-1"
            tone={row.opening < 0 ? 'negative' : 'default'}
          />
        </div>
      </div>

      <FilterStrip
        items={VIEW_ITEMS}
        value={view}
        onValueChange={(next) => setView(next as PanelView)}
        ariaLabel={PROJECTION_VIEW_LABELS.PANEL_VIEW_LABEL}
        className="mt-4 border-b border-border pb-2"
      />

      <div className="mt-2">
        <DefinitionRows
          items={view === 'summary' ? SUMMARY_ITEMS(row) : CASH_FLOW_ITEMS(row)}
          layout="row"
          divided
        />
      </div>
    </div>
  );
}
