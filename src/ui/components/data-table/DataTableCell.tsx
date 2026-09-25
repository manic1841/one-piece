import * as React from 'react';

import { cn } from '@/ui/utils/cn';

import { dataTableCellNumberClass, dataTableCellTextClass } from './styles';

interface DataTableCellProps extends Omit<React.TdHTMLAttributes<HTMLTableCellElement>, 'align'> {
  /** `number` 施加右對齊 + 等寬 + 等寬數字。 */
  align?: 'text' | 'number';
}

/** Data table 資料 cell（垂直置中、13px 上下內距）。 */
export const DataTableCell: React.FC<DataTableCellProps> = ({
  align = 'text',
  className,
  ...props
}) => (
  <td
    className={cn(
      align === 'number' ? dataTableCellNumberClass : dataTableCellTextClass,
      className,
    )}
    {...props}
  />
);
DataTableCell.displayName = 'DataTableCell';
