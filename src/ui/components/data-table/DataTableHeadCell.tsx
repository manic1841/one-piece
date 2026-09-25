import * as React from 'react';

import { cn } from '@/ui/utils/cn';

import { dataTableHeadNumberClass, dataTableHeadTextClass } from './styles';

interface DataTableHeadCellProps
  extends Omit<React.ThHTMLAttributes<HTMLTableCellElement>, 'align'> {
  /** `number` 讓表頭與同欄數字同軸右對齊。 */
  align?: 'text' | 'number';
}

/** Data table 表頭 cell（10px / 500 / uppercase / 0.08em / 置底對齊）。 */
export const DataTableHeadCell: React.FC<DataTableHeadCellProps> = ({
  align = 'text',
  className,
  ...props
}) => (
  <th
    className={cn(
      align === 'number' ? dataTableHeadNumberClass : dataTableHeadTextClass,
      className,
    )}
    {...props}
  />
);
DataTableHeadCell.displayName = 'DataTableHeadCell';
