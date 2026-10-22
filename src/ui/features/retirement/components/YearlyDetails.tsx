import { Fragment, useState } from 'react';

import { ChevronDown, ChevronUp } from 'lucide-react';

import {
  DataTable,
  DataTableCell,
  DataTableColGroup,
  DataTableHeadCell,
  DataTableHeadRow,
  DataTableRow,
  MobileDataList,
  MobileExpandableRow,
  TableBody,
  TableHeader,
} from '@/ui/components/data-table';
import { MONEY_TONE_CLASS, signTone } from '@/ui/components/moneyTone';
import { PROJECTION_YEARLY_DETAIL_LABELS } from '@/ui/constants/retirement/displayLabels';
import { PROJECTION_VIEW_LABELS } from '@/ui/constants/retirement/projectionLabels';
import {
  type RetirementProjectionVM,
  type RetirementProjectionYearDetailVM,
} from '@/ui/features/retirement/viewmodels/projectionDisplay.vm';
import { cn } from '@/ui/utils/cn';

type RetirementProjectionProps = {
  projection: RetirementProjectionVM;
  /** Selected year; selecting is only offered when `onSelectYear` is passed. */
  selectedYear?: number | null;
  onSelectYear?: (year: number) => void;
  /** Collapse trigger title. */
  title?: string;
};

const COLUMNS = PROJECTION_YEARLY_DETAIL_LABELS.columns;

/** Expanded-row fields; age stays in the row head, so it is not repeated here. */
const YearlyFieldLabels = [
  COLUMNS.status,
  COLUMNS.income,
  COLUMNS.expense,
  COLUMNS.investmentReturn,
] as const;

/** Year / Net worth change / Net worth at the start of the year. */
const YEARLY_COLUMN_WIDTHS = [22, 39, 39] as const;

const YEARLY_COL_SPAN = YEARLY_COLUMN_WIDTHS.length;

/** Retirement divider row; replaces the per-row status column. */
function RetirementDivider({ year }: { year: number }) {
  return (
    <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-warning">
      {PROJECTION_YEARLY_DETAIL_LABELS.retirementDivider} · {year}
    </span>
  );
}

/** Net worth is the row's anchor: sign tone plus weight, never just a colour. */
const netWorthClass = (opening: number): string =>
  cn('font-semibold', opening < 0 ? MONEY_TONE_CLASS.negative : MONEY_TONE_CLASS.default);

/** Per-year field list shown when a row expands. Gross amounts stay neutral. */
function YearFieldList({ row }: { row: RetirementProjectionYearDetailVM }) {
  const fields = [
    { label: YearlyFieldLabels[0], value: row.statusText },
    { label: YearlyFieldLabels[1], value: row.incomeText },
    { label: YearlyFieldLabels[2], value: row.expenseText },
    { label: YearlyFieldLabels[3], value: row.investmentReturnText },
  ];
  return (
    <div className="space-y-1.5 text-sm">
      {fields.map(({ label, value }) => (
        <div key={label} className="flex items-center justify-between">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-mono tabular-nums text-muted-foreground">{value}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Full year table. The row selects the year *and* opens that row's detail, so
 * the feedback lands where the click landed; the leading icon button expands
 * without changing the selection.
 */
export function YearlyDetails({
  projection,
  selectedYear = null,
  onSelectYear,
  title = PROJECTION_YEARLY_DETAIL_LABELS.sectionTitle,
}: RetirementProjectionProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>({});

  if (projection.yearlyDetails.length === 0) {
    return null;
  }

  const toggleYearDetails = (year: number) => {
    setExpandedYears((prev) => ({
      ...prev,
      [year]: !prev[year],
    }));
  };

  const activateRow = (row: RetirementProjectionYearDetailVM) => {
    onSelectYear?.(row.year);
    setExpandedYears((prev) => ({ ...prev, [row.year]: !prev[row.year] }));
  };

  return (
    <div>
      <button
        type="button"
        className="mb-1 flex w-full items-center justify-between rounded-md py-1 text-left"
        onClick={() => setIsDetailsOpen((prev) => !prev)}
        aria-expanded={isDetailsOpen}
      >
        <h4 className="text-sm font-semibold">{title}</h4>
        <span className="text-muted-foreground">
          {isDetailsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {isDetailsOpen && (
        <div>
          <MobileDataList>
            {projection.yearlyDetails.map((row) => {
              const isSelected = row.year === selectedYear;

              return (
                <Fragment key={row.year}>
                  {row.year === projection.retirementYear && (
                    <p className="pb-1 pt-2 text-[11px] text-muted-foreground first:pt-0">
                      <RetirementDivider year={row.year} />
                    </p>
                  )}
                  <MobileExpandableRow
                    data-testid={`yearly-row-mobile-${row.year}`}
                    aria-current={isSelected ? 'true' : undefined}
                    className={
                      row.isRetired
                        ? isSelected
                          ? 'bg-warning/10'
                          : 'bg-warning/5'
                        : isSelected
                          ? 'bg-muted'
                          : undefined
                    }
                    summary={
                      <span className="text-sm font-medium tabular-nums">
                        {row.year}
                        <span className="ml-1.5 font-mono text-[11px] font-normal text-muted-foreground">
                          {row.age}
                        </span>
                      </span>
                    }
                    value={
                      <span
                        className={cn('font-mono text-sm tabular-nums', netWorthClass(row.opening))}
                      >
                        {row.openingText}
                      </span>
                    }
                    details={<YearFieldList row={row} />}
                    expanded={!!expandedYears[row.year]}
                    onExpandedChange={() => toggleYearDetails(row.year)}
                    onClick={() => onSelectYear?.(row.year)}
                    actions={
                      <button
                        type="button"
                        aria-label={PROJECTION_VIEW_LABELS.EXPAND_YEAR(row.year)}
                        aria-expanded={!!expandedYears[row.year]}
                        onClick={() => {
                          onSelectYear?.(row.year);
                          toggleYearDetails(row.year);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <ChevronDown
                          size={14}
                          aria-hidden="true"
                          className={cn(
                            'shrink-0 transition-transform duration-fast',
                            expandedYears[row.year] && 'rotate-180',
                          )}
                        />
                      </button>
                    }
                  />
                </Fragment>
              );
            })}
          </MobileDataList>

          <DataTable>
            <DataTableColGroup widths={YEARLY_COLUMN_WIDTHS} />
            <TableHeader>
              <DataTableHeadRow>
                <DataTableHeadCell>{COLUMNS.year}</DataTableHeadCell>
                <DataTableHeadCell align="number">{COLUMNS.netCashFlow}</DataTableHeadCell>
                <DataTableHeadCell align="number">{COLUMNS.openingNetWorth}</DataTableHeadCell>
              </DataTableHeadRow>
            </TableHeader>
            <TableBody>
              {projection.yearlyDetails.map((row) => {
                const isExpanded = !!expandedYears[row.year];
                const isSelected = row.year === selectedYear;

                return (
                  <Fragment key={row.year}>
                    {row.year === projection.retirementYear && (
                      <DataTableRow className="h-auto bg-muted/40">
                        <DataTableCell
                          colSpan={YEARLY_COL_SPAN}
                          className="py-1.5"
                          data-testid="yearly-retirement-divider"
                        >
                          <RetirementDivider year={row.year} />
                        </DataTableCell>
                      </DataTableRow>
                    )}
                    <DataTableRow
                      data-testid={`yearly-row-${row.year}`}
                      interactive
                      aria-expanded={isExpanded}
                      aria-current={isSelected ? 'true' : undefined}
                      tabIndex={0}
                      onClick={() => activateRow(row)}
                      onKeyDown={(event) => {
                        if (event.target !== event.currentTarget) return;
                        if (event.key !== 'Enter' && event.key !== ' ') return;
                        event.preventDefault();
                        activateRow(row);
                      }}
                      className={cn(
                        'cursor-pointer',
                        isExpanded && 'border-b-0',
                        // Retired rows keep a warning tint in every state; the
                        // selected surface wins while selected.
                        row.isRetired
                          ? isSelected
                            ? 'bg-warning/10'
                            : 'bg-warning/5 hover:bg-warning/10'
                          : isSelected
                            ? 'bg-muted'
                            : 'hover:bg-muted/50',
                      )}
                    >
                      <DataTableCell>
                        <span className="flex items-center gap-2">
                          <button
                            type="button"
                            aria-label={PROJECTION_VIEW_LABELS.EXPAND_YEAR(row.year)}
                            aria-expanded={isExpanded}
                            className="-ml-1 flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            onClick={(event) => {
                              event.stopPropagation();
                              activateRow(row);
                            }}
                          >
                            <ChevronDown
                              size={14}
                              aria-hidden="true"
                              className={cn(
                                'shrink-0 transition-transform duration-fast',
                                isExpanded && 'rotate-180',
                              )}
                            />
                          </button>
                          <span className="tabular-nums">{row.year}</span>
                          <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                            {row.age}
                          </span>
                        </span>
                      </DataTableCell>
                      <DataTableCell
                        align="number"
                        className={MONEY_TONE_CLASS[signTone(row.netCashFlow)]}
                      >
                        {row.netCashFlowText}
                      </DataTableCell>
                      <DataTableCell align="number" className={netWorthClass(row.opening)}>
                        {row.openingText}
                      </DataTableCell>
                    </DataTableRow>
                    {isExpanded && (
                      <DataTableRow
                        className="hover:bg-transparent"
                        data-testid={`yearly-detail-${row.year}`}
                      >
                        <DataTableCell
                          colSpan={YEARLY_COL_SPAN}
                          className="border-l-2 border-l-border-strong py-3 pl-4"
                        >
                          <YearFieldList row={row} />
                        </DataTableCell>
                      </DataTableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </DataTable>
        </div>
      )}
    </div>
  );
}
