import * as React from 'react';

import { Plus } from 'lucide-react';

import {
  DataTable,
  DataTableCell,
  DataTableColGroup,
  DataTableHeadCell,
  DataTableHeadRow,
  DataTableRow,
  DataTableScrollArea,
  MobileDataList,
  MobileDataRow,
  NumberCell,
  TableBody,
  TableHeader,
  dataTableLabelClass,
} from '@/ui/components/data-table';
import { Button } from '@/ui/components/ui/button';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { formatCurrency } from '@/ui/utils';
import { cn } from '@/ui/utils/cn';

export type TradeSide = 'BUY' | 'SELL';

export interface TradeTableRow {
  transactionId?: string;
  side: TradeSide;
  amount: number;
  description?: string;
  projectId?: string | null;
  date: Date;
}

interface TradeTableProps {
  title: string;
  addLabel?: string;
  rows: TradeTableRow[];
  /** Labels for the TYPE column; defaults to 買入/賣出. */
  sideLabels?: Record<TradeSide, string>;
  /** Label for the summary net flow; defaults to NET INVESTMENT CASH FLOW. */
  netLabel?: string;
  projectIdName: (projectId: string | null | undefined) => string | null;
  onAdd: () => void;
  onRowClick: (row: TradeTableRow) => void;
  disabled?: boolean;
}

const COLUMN_WIDTHS = [16, 24, 36, 24] as const;

const interactiveRowClass = 'cursor-pointer transition-colors hover:bg-elevated/60';

const sideColorClass = (side: TradeSide): string =>
  side === 'BUY' ? 'text-positive' : 'text-negative';

/**
 * 關帳階段的交易表格（證券與融資共用）：買入/賣出（或融資兩類）在同一表格，
 * 整列可點擊開 Drawer 編輯，表格不放列內動作按鈕（乾淨表格契約）。
 * 數值右對齊、文字左對齊；Summary 由系統計算。
 */
export const TradeTable: React.FC<TradeTableProps> = ({
  title,
  addLabel,
  rows,
  sideLabels,
  netLabel,
  projectIdName,
  onAdd,
  onRowClick,
  disabled = false,
}) => {
  const typeLabel = (side: TradeSide): string => sideLabels?.[side] ?? side;
  const buyTotal = rows
    .filter((row) => row.side === 'BUY')
    .reduce((sum, row) => sum + (row.amount || 0), 0);
  const sellTotal = rows
    .filter((row) => row.side === 'SELL')
    .reduce((sum, row) => sum + (row.amount || 0), 0);
  const netFlow = buyTotal - sellTotal;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </p>
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          {rows.length} {MONTHLY_CLOSE_LABELS.TRANSACTIONS_COUNT}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">{MONTHLY_CLOSE_LABELS.NO_TRANSACTIONS}</p>
      ) : (
        <>
          <DataTableScrollArea>
            <DataTable>
              <DataTableColGroup widths={COLUMN_WIDTHS} />
              <TableHeader>
                <DataTableHeadRow>
                  <DataTableHeadCell className="pl-3">
                    {MONTHLY_CLOSE_LABELS.TYPE}
                  </DataTableHeadCell>
                  <DataTableHeadCell align="number" className="pl-3">
                    {MONTHLY_CLOSE_LABELS.AMOUNT}
                  </DataTableHeadCell>
                  <DataTableHeadCell className="pl-3">
                    {MONTHLY_CLOSE_LABELS.DESCRIPTION}
                  </DataTableHeadCell>
                  <DataTableHeadCell className="pl-3">
                    {MONTHLY_CLOSE_LABELS.PROJECT}
                  </DataTableHeadCell>
                </DataTableHeadRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => (
                  <DataTableRow
                    key={row.transactionId ?? `row-${index}`}
                    className={cn(
                      interactiveRowClass,
                      disabled && 'pointer-events-none opacity-60',
                    )}
                    onClick={() => {
                      if (!disabled) onRowClick(row);
                    }}
                  >
                    <DataTableCell
                      className={cn('pl-3 font-mono text-xs font-medium', sideColorClass(row.side))}
                    >
                      {typeLabel(row.side)}
                    </DataTableCell>
                    <NumberCell value={row.amount} format={formatCurrency} />
                    <DataTableCell className="pl-3">
                      <span className="block max-w-[26rem] truncate text-xs text-foreground">
                        {row.description || '—'}
                      </span>
                    </DataTableCell>
                    <DataTableCell className="pl-3">
                      <span className="block max-w-[18rem] truncate text-xs text-muted-foreground">
                        {projectIdName(row.projectId) || '—'}
                      </span>
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </TableBody>
            </DataTable>
          </DataTableScrollArea>

          <MobileDataList>
            {rows.map((row, index) => (
              <MobileDataRow
                key={row.transactionId ?? `mobile-${index}`}
                className={cn('space-y-1 border-border/60', !disabled && 'cursor-pointer')}
                onClick={() => {
                  if (!disabled) onRowClick(row);
                }}
              >
                <div className="flex items-center justify-between">
                  <p className={cn('font-mono text-xs font-medium', sideColorClass(row.side))}>
                    {typeLabel(row.side)}
                  </p>
                  <p className="font-mono text-sm font-medium tabular-nums">
                    {formatCurrency(row.amount)}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-xs text-muted-foreground">
                    {row.description || '—'}
                    {projectIdName(row.projectId) ? ` · ${projectIdName(row.projectId)}` : ''}
                  </p>
                </div>
              </MobileDataRow>
            ))}
          </MobileDataList>
        </>
      )}

      <div className="flex items-center justify-between border-t border-border/60 pt-2">
        <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={onAdd}>
          <Plus className="mr-1 h-4 w-4" /> {addLabel ?? MONTHLY_CLOSE_LABELS.ADD_TRANSACTION}
        </Button>
        {rows.length > 0 && (
          <div className="space-y-1 text-right">
            <div className="flex items-center justify-end gap-6">
              <p className={dataTableLabelClass}>{typeLabel('BUY')}</p>
              <p className="font-mono text-sm font-medium tabular-nums text-foreground">
                {formatCurrency(buyTotal)}
              </p>
            </div>
            <div className="flex items-center justify-end gap-6">
              <p className={dataTableLabelClass}>{typeLabel('SELL')}</p>
              <p className="font-mono text-sm font-medium tabular-nums text-foreground">
                {formatCurrency(sellTotal)}
              </p>
            </div>
            <div className="flex items-center justify-end gap-6 border-t border-border/60 pt-1">
              <p className={dataTableLabelClass}>
                {netLabel ?? MONTHLY_CLOSE_LABELS.NET_INVESTMENT_CASH_FLOW}
              </p>
              <p
                className={cn(
                  'font-mono text-sm font-medium tabular-nums',
                  netFlow >= 0 ? 'text-positive' : 'text-negative',
                )}
              >
                {formatCurrency(netFlow)}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
