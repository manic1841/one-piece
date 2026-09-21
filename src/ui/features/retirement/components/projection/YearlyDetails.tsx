import { Fragment, useState } from 'react';

import { ChevronDown, ChevronUp } from 'lucide-react';

import {
  type RetirementProjectionVM,
  type RetirementProjectionYearDetailVM,
} from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';

type RetirementProjectionProps = {
  projection: RetirementProjectionVM;
};

const YearlyFieldLabels = ['Age', 'Status', 'Income', 'Expense', '投資收益', 'Net'] as const;

function YearBreakdownPanels({ row }: { row: RetirementProjectionYearDetailVM }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="md:rounded-md md:border md:bg-card/70 md:p-3">
        <div className="mb-2 text-xs font-semibold text-muted-foreground">收入明細</div>
        {row.incomeItems.length === 0 ? (
          <div className="text-sm text-muted-foreground">無收入項目</div>
        ) : (
          <div className="space-y-1.5">
            {row.incomeItems.map((item, index) => (
              <div key={`${row.year}-income-${index}`} className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{item.name}</span>
                <span className="ml-auto font-medium tabular-nums text-positive">
                  {item.amountText}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="md:rounded-md md:border md:bg-card/70 md:p-3">
        <div className="mb-2 text-xs font-semibold text-muted-foreground">支出明細</div>
        {row.expenseItems.length === 0 ? (
          <div className="text-sm text-muted-foreground">無支出項目</div>
        ) : (
          <div className="space-y-1.5">
            {row.expenseItems.map((item, index) => (
              <div key={`${row.year}-expense-${index}`} className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{item.name}</span>
                <span className="ml-auto font-medium tabular-nums text-negative">
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
    <div className="rounded-lg border p-4">
      <button
        type="button"
        className="mb-1 flex w-full items-center justify-between rounded-md py-1 text-left"
        onClick={() => setIsDetailsOpen((prev) => !prev)}
        aria-expanded={isDetailsOpen}
      >
        <h4 className="text-sm font-semibold">每年明細</h4>
        <span className="text-muted-foreground">
          {isDetailsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {isDetailsOpen && (
        <div>
          <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm border border-border bg-muted" />
              <span>退休前</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm border border-warning/20 bg-warning/10" />
              <span>退休後</span>
            </div>
          </div>
          <div className="space-y-2 md:hidden">
            {projection.yearlyDetails.map((row) => {
              const isExpanded = !!expandedYears[row.year];

              return (
                <div
                  key={row.year}
                  data-testid={`yearly-row-mobile-${row.year}`}
                  className={`rounded-md border p-3 ${row.isRetired ? 'bg-warning/5' : 'bg-transparent'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium tabular-nums">{row.year}</span>
                    <span className="ml-auto font-mono text-sm tabular-nums">
                      {row.savingsText}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleYearDetails(row.year)}
                      aria-expanded={isExpanded}
                      className="inline-flex items-center rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
                    >
                      {isExpanded ? '收合' : '展開'}
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="mt-3 space-y-1.5 border-t pt-3 text-sm">
                      {[
                        { label: YearlyFieldLabels[0], value: row.age },
                        { label: YearlyFieldLabels[1], value: row.statusText },
                        { label: YearlyFieldLabels[2], value: row.incomeText },
                        { label: YearlyFieldLabels[3], value: row.expenseText },
                        { label: YearlyFieldLabels[4], value: row.investmentReturnText },
                        { label: YearlyFieldLabels[5], value: row.netCashFlowText },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-mono tabular-nums">{value}</span>
                        </div>
                      ))}
                      <div className="pt-2">
                        <YearBreakdownPanels row={row} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="hidden md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="py-2 pr-3 text-left font-medium">Year</th>
                {YearlyFieldLabels.map((label) => (
                  <th
                    key={label}
                    className={`py-2 pr-3 font-medium ${
                      label === 'Age' || label === 'Status' ? 'text-left' : 'text-right'
                    }`}
                  >
                    {label}
                  </th>
                ))}
                <th className="py-2 text-right font-medium">Savings</th>
                <th className="py-2 text-center font-medium">明細</th>
              </tr>
            </thead>
            <tbody>
              {projection.yearlyDetails.map((row) => {
                const isExpanded = !!expandedYears[row.year];

                return (
                  <Fragment key={row.year}>
                    <tr className={`border-b ${row.isRetired ? 'bg-warning/5' : 'bg-transparent'}`}>
                      <td className="py-2 pr-3 tabular-nums">{row.year}</td>
                      <td className="py-2 pr-3 tabular-nums">{row.age}</td>
                      <td className="py-2 pr-3">
                        <span
                          className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                            row.isRetired
                              ? 'bg-warning/10 text-warning'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {row.statusText}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">{row.incomeText}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{row.expenseText}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {row.investmentReturnText}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">{row.netCashFlowText}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{row.savingsText}</td>
                      <td className="py-2 text-center">
                        <button
                          type="button"
                          onClick={() => toggleYearDetails(row.year)}
                          aria-expanded={isExpanded}
                          className="inline-flex items-center rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
                        >
                          {isExpanded ? '收合' : '展開'}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${row.year}-detail`} className="border-b last:border-0 bg-muted/20">
                        <td colSpan={9} className="px-3 py-3">
                          <YearBreakdownPanels row={row} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
