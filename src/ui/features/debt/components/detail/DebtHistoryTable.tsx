import React, { useState } from 'react';

import { ChevronRight } from 'lucide-react';

import {
  DataTable,
  DataTableCell,
  DataTableColGroup,
  DataTableHeadCell,
  DataTableHeadRow,
  DataTableRow,
  MobileDataList,
  MobileDataRow,
  MobileExpandableRow,
  TableBody,
  TableHeader,
} from '@/ui/components/data-table';
import { type DebtHistoryMonthVM } from '@/ui/features/debt/viewmodels/debtDisplay.vm';
import { cn } from '@/ui/utils/cn';

interface DebtHistoryTableProps {
  months: DebtHistoryMonthVM[];
}

/** Month / Opening / Principal / Interest / Closing. */
const MONTH_COLUMN_WIDTHS = [24, 19, 19, 19, 19] as const;
/** Date / Description / Principal / Interest / Total. */
const PAYMENT_COLUMN_WIDTHS = [16, 28, 18, 18, 20] as const;

const MONTH_COL_SPAN = MONTH_COLUMN_WIDTHS.length;

/** Monthly debt history: each month expands to its repayments. */
export const DebtHistoryTable: React.FC<DebtHistoryTableProps> = ({ months }) => {
  const [openMonth, setOpenMonth] = useState<string | null>(null);

  const toggle = (key: string) => setOpenMonth((previous) => (previous === key ? null : key));

  if (months.length === 0) {
    return <p className="text-sm text-muted-foreground">目前尚無還款紀錄</p>;
  }

  return (
    <>
      <DataTable>
        <DataTableColGroup widths={MONTH_COLUMN_WIDTHS} />
        <TableHeader>
          <DataTableHeadRow>
            <DataTableHeadCell>Month</DataTableHeadCell>
            <DataTableHeadCell align="number">Opening</DataTableHeadCell>
            <DataTableHeadCell align="number">Principal</DataTableHeadCell>
            <DataTableHeadCell align="number">Interest</DataTableHeadCell>
            <DataTableHeadCell align="number">Closing</DataTableHeadCell>
          </DataTableHeadRow>
        </TableHeader>
        <TableBody>
          {months.map((month) => {
            const isOpen = openMonth === month.key;
            return (
              <React.Fragment key={month.key}>
                <DataTableRow
                  data-testid={`debt-month-${month.key}`}
                  interactive
                  aria-expanded={isOpen}
                  tabIndex={0}
                  onClick={() => toggle(month.key)}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    toggle(month.key);
                  }}
                  className={cn('cursor-pointer', isOpen && 'border-b-0 bg-muted/50')}
                >
                  <DataTableCell>
                    <span className="flex items-center gap-2">
                      <ChevronRight
                        size={14}
                        aria-hidden="true"
                        className={cn(
                          'shrink-0 text-muted-foreground transition-transform duration-fast',
                          isOpen && 'rotate-90',
                        )}
                      />
                      <span className="font-mono text-[12px] tabular-nums">{month.yearMonth}</span>
                    </span>
                  </DataTableCell>
                  <DataTableCell align="number">{month.openingText}</DataTableCell>
                  <DataTableCell align="number">{month.principalText}</DataTableCell>
                  <DataTableCell align="number">{month.interestText}</DataTableCell>
                  <DataTableCell align="number">{month.closingText}</DataTableCell>
                </DataTableRow>
                {isOpen && (
                  <DataTableRow
                    className="hover:bg-transparent"
                    data-testid={`debt-month-payments-${month.key}`}
                  >
                    <DataTableCell colSpan={MONTH_COL_SPAN} className="bg-muted/30 px-3 py-3">
                      {month.payments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">當月沒有還款紀錄</p>
                      ) : (
                        <DataTable>
                          <DataTableColGroup widths={PAYMENT_COLUMN_WIDTHS} />
                          <TableHeader>
                            <DataTableHeadRow>
                              <DataTableHeadCell>Date</DataTableHeadCell>
                              <DataTableHeadCell>Description</DataTableHeadCell>
                              <DataTableHeadCell align="number">Principal</DataTableHeadCell>
                              <DataTableHeadCell align="number">Interest</DataTableHeadCell>
                              <DataTableHeadCell align="number">Total</DataTableHeadCell>
                            </DataTableHeadRow>
                          </TableHeader>
                          <TableBody>
                            {month.payments.map((payment) => (
                              <DataTableRow key={payment.id}>
                                <DataTableCell className="font-mono text-[12px]">
                                  {payment.dateText}
                                </DataTableCell>
                                <DataTableCell className="text-muted-foreground">
                                  {payment.descriptionText}
                                </DataTableCell>
                                <DataTableCell align="number">
                                  {payment.principalText}
                                </DataTableCell>
                                <DataTableCell align="number">{payment.interestText}</DataTableCell>
                                <DataTableCell align="number">{payment.totalText}</DataTableCell>
                              </DataTableRow>
                            ))}
                          </TableBody>
                        </DataTable>
                      )}
                    </DataTableCell>
                  </DataTableRow>
                )}
              </React.Fragment>
            );
          })}
        </TableBody>
      </DataTable>
      <MobileDataList>
        {months.map((month) => (
          <MobileExpandableRow
            key={month.key}
            data-testid={`debt-month-mobile-${month.key}`}
            summary={<span className="font-mono text-[11px] tabular-nums">{month.yearMonth}</span>}
            value={<span className="font-mono text-sm tabular-nums">{month.closingText}</span>}
            meta={
              <span className="truncate">
                {`Opening ${month.openingText} · Principal ${month.principalText} · Interest ${month.interestText}`}
              </span>
            }
            details={
              month.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">當月沒有還款紀錄</p>
              ) : (
                month.payments.map((payment) => (
                  <MobileDataRow key={payment.id} className="py-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                        {payment.dateText}
                      </span>
                      <span className="font-mono text-sm tabular-nums">{payment.totalText}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {payment.descriptionText}
                    </span>
                  </MobileDataRow>
                ))
              )
            }
          />
        ))}
      </MobileDataList>
    </>
  );
};
