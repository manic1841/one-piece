import { Fragment, useState } from 'react';

import { ChevronDown, ChevronRight, ChevronUp } from 'lucide-react';

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
import { RetirementYearlyDetailLabels } from '@/ui/constants/retirement/retirementWorkspaceLabels';
import {
  type RetirementProjectionVM,
  type RetirementProjectionYearDetailVM,
} from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';
import { cn } from '@/ui/utils/cn';

type RetirementProjectionProps = {
  projection: RetirementProjectionVM;
};

const COLUMNS = RetirementYearlyDetailLabels.columns;

const YearlyFieldLabels = [
  COLUMNS.age,
  COLUMNS.status,
  COLUMNS.income,
  COLUMNS.expense,
  COLUMNS.investmentReturn,
  COLUMNS.netCashFlow,
] as const;

/** Year / Age / Status / Income / Expense / 投資收益 / Net / Net Worth. */
const YEARLY_COLUMN_WIDTHS = [8, 7, 11, 13, 13, 12, 12, 24] as const;

const YEARLY_COL_SPAN = YEARLY_COLUMN_WIDTHS.length;

function YearStatusBadge({ isRetired, statusText }: { isRetired: boolean; statusText: string }) {
  return (
    <span
      className={cn(
        'inline-flex rounded px-2 py-0.5 text-xs font-medium',
        isRetired ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground',
      )}
    >
      {statusText}
    </span>
  );
}

/** Per-year field list shown when a mobile row expands (desktop shows them as columns). */
function YearFieldList({ row }: { row: RetirementProjectionYearDetailVM }) {
  const fields = [
    { label: YearlyFieldLabels[0], value: String(row.age) },
    { label: YearlyFieldLabels[1], value: row.statusText },
    { label: YearlyFieldLabels[2], value: row.incomeText },
    { label: YearlyFieldLabels[3], value: row.expenseText },
    { label: YearlyFieldLabels[4], value: row.investmentReturnText },
    { label: YearlyFieldLabels[5], value: row.netCashFlowText },
  ];
  return (
    <div className="space-y-1.5 text-sm">
      {fields.map(({ label, value }) => (
        <div key={label} className="flex items-center justify-between">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-mono tabular-nums">{value}</span>
        </div>
      ))}
    </div>
  );
}

function YearBreakdownPanels({ row }: { row: RetirementProjectionYearDetailVM }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="space-y-2">
        <div className="text-xs font-semibold text-muted-foreground">
          {RetirementYearlyDetailLabels.incomeBreakdown}
        </div>
        {row.incomeItems.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            {RetirementYearlyDetailLabels.noIncomeItems}
          </div>
        ) : (
          <div className="space-y-1.5">
            {row.incomeItems.map((item, index) => (
              <div key={`${row.year}-income-${index}`} className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{item.name}</span>
                <span className="ml-auto font-mono font-medium tabular-nums text-positive">
                  {item.amountText}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-2">
        <div className="text-xs font-semibold text-muted-foreground">
          {RetirementYearlyDetailLabels.expenseBreakdown}
        </div>
        {row.expenseItems.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            {RetirementYearlyDetailLabels.noExpenseItems}
          </div>
        ) : (
          <div className="space-y-1.5">
            {row.expenseItems.map((item, index) => (
              <div key={`${row.year}-expense-${index}`} className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{item.name}</span>
                <span className="ml-auto font-mono font-medium tabular-nums text-negative">
                  {item.amountText}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function YearlyDetails({ projection }: RetirementProjectionProps) {
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

  return (
    <div>
      <button
        type="button"
        className="mb-1 flex w-full items-center justify-between rounded-md py-1 text-left"
        onClick={() => setIsDetailsOpen((prev) => !prev)}
        aria-expanded={isDetailsOpen}
      >
        <h4 className="text-sm font-semibold">{RetirementYearlyDetailLabels.sectionTitle}</h4>
        <span className="text-muted-foreground">
          {isDetailsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {isDetailsOpen && (
        <div>
          <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5 rounded-sm border border-border bg-muted"
              />
              <span>{RetirementYearlyDetailLabels.workingLegend}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5 rounded-sm border border-warning/20 bg-warning/10"
              />
              <span>{RetirementYearlyDetailLabels.retiredLegend}</span>
            </div>
          </div>
          <MobileDataList>
            {projection.yearlyDetails.map((row) => (
              <MobileExpandableRow
                key={row.year}
                data-testid={`yearly-row-mobile-${row.year}`}
                className={row.isRetired ? 'bg-warning/5' : undefined}
                summary={<span className="text-sm font-medium tabular-nums">{row.year}</span>}
                value={<span className="font-mono text-sm tabular-nums">{row.savingsText}</span>}
                details={
                  <div className="space-y-3">
                    <YearFieldList row={row} />
                    <YearBreakdownPanels row={row} />
                  </div>
                }
              />
            ))}
          </MobileDataList>

          <DataTable>
            <DataTableColGroup widths={YEARLY_COLUMN_WIDTHS} />
            <TableHeader>
              <DataTableHeadRow>
                <DataTableHeadCell>{COLUMNS.year}</DataTableHeadCell>
                {YearlyFieldLabels.map((label) => (
                  <DataTableHeadCell
                    key={label}
                    align={label === COLUMNS.age || label === COLUMNS.status ? 'text' : 'number'}
                  >
                    {label}
                  </DataTableHeadCell>
                ))}
                <DataTableHeadCell align="number">{COLUMNS.netWorth}</DataTableHeadCell>
              </DataTableHeadRow>
            </TableHeader>
            <TableBody>
              {projection.yearlyDetails.map((row) => {
                const isExpanded = !!expandedYears[row.year];

                return (
                  <Fragment key={row.year}>
                    <DataTableRow
                      data-testid={`yearly-row-${row.year}`}
                      interactive
                      aria-expanded={isExpanded}
                      tabIndex={0}
                      onClick={() => toggleYearDetails(row.year)}
                      onKeyDown={(event) => {
                        if (event.target !== event.currentTarget) return;
                        if (event.key !== 'Enter' && event.key !== ' ') return;
                        event.preventDefault();
                        toggleYearDetails(row.year);
                      }}
                      className={cn(
                        'cursor-pointer',
                        isExpanded && 'border-b-0',
                        // Retired rows keep their warning tint in every state:
                        // open rows step it up a notch, and both states pin the
                        // hover to the warning tone so the generic interactive
                        // hover cannot wash it grey.
                        row.isRetired
                          ? isExpanded
                            ? 'bg-warning/10 hover:bg-warning/10'
                            : 'bg-warning/5 hover:bg-warning/10'
                          : isExpanded && 'bg-muted/50',
                      )}
                    >
                      <DataTableCell>
                        <span className="flex items-center gap-2">
                          <ChevronRight
                            size={14}
                            aria-hidden="true"
                            className={cn(
                              'shrink-0 text-muted-foreground transition-transform duration-fast',
                              isExpanded && 'rotate-90',
                            )}
                          />
                          <span className="tabular-nums">{row.year}</span>
                        </span>
                      </DataTableCell>
                      <DataTableCell className="tabular-nums">{row.age}</DataTableCell>
                      <DataTableCell>
                        <YearStatusBadge isRetired={row.isRetired} statusText={row.statusText} />
                      </DataTableCell>
                      <DataTableCell align="number">{row.incomeText}</DataTableCell>
                      <DataTableCell align="number">{row.expenseText}</DataTableCell>
                      <DataTableCell align="number">{row.investmentReturnText}</DataTableCell>
                      <DataTableCell align="number">{row.netCashFlowText}</DataTableCell>
                      <DataTableCell align="number">{row.savingsText}</DataTableCell>
                    </DataTableRow>
                    {isExpanded && (
                      <DataTableRow
                        className="hover:bg-transparent"
                        data-testid={`yearly-detail-${row.year}`}
                      >
                        <DataTableCell colSpan={YEARLY_COL_SPAN} className="bg-muted/30 px-3 py-3">
                          <YearBreakdownPanels row={row} />
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
