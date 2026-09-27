import * as React from 'react';

import { cn } from '@/ui/utils/cn';

import { DataTableCell } from './DataTableCell';

interface NumberCellProps
  extends Omit<React.TdHTMLAttributes<HTMLTableCellElement>, 'children' | 'align'> {
  value: number | null | undefined;
  /** 數值格式化（金額用 formatCurrency，外幣用自訂）。預設在地化千分位。 */
  format?: (value: number) => string;
  /** 空值顯示文字，預設「—」。 */
  emptyText?: string;
}

const defaultFormat = (value: number): string => value.toLocaleString('en-US');

/** 數字 cell：右對齊等寬、空值顯示「—」、不顯示無意義小數。 */
export const NumberCell: React.FC<NumberCellProps> = ({
  value,
  format = defaultFormat,
  emptyText = '—',
  className,
  ...props
}) => (
  <DataTableCell align="number" className={cn(className)} {...props}>
    {value === null || value === undefined ? emptyText : format(value)}
  </DataTableCell>
);
NumberCell.displayName = 'NumberCell';
