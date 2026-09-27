import * as React from 'react';

import { TableRow } from '@/ui/components/ui/table';
import { cn } from '@/ui/utils/cn';

import { dataTableRowClass } from './styles';

/**
 * Data table 資料列（54px 高、細分隔線）。`interactive` 明示「整列可點擊」——只有這種
 * 列才有 hover 底色與 pointer cursor，不可點擊的列不得假裝可點擊（見 ADR-0061）。
 *
 * 整列導覽與列內拖曳 grip 並存時，grip 必須 stop propagation 並抑制拖曳後的 click，
 * 但不得關閉整列的導覽能力（Pointer event priority 契約）。
 */
export const DataTableRow = React.forwardRef<
  HTMLTableRowElement,
  React.ComponentPropsWithoutRef<typeof TableRow>
>(({ className, ...props }, ref) => (
  <TableRow ref={ref} className={cn(dataTableRowClass, className)} {...props} />
));
DataTableRow.displayName = 'DataTableRow';

/** Data table 表頭列：不套用資料列的 54px 高度，高度由表頭 cell 內距決定。 */
export const DataTableHeadRow = React.forwardRef<
  HTMLTableRowElement,
  React.ComponentPropsWithoutRef<typeof TableRow>
>(({ className, ...props }, ref) => <TableRow ref={ref} className={cn(className)} {...props} />);
DataTableHeadRow.displayName = 'DataTableHeadRow';
