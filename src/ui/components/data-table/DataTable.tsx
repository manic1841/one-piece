import * as React from 'react';

import { Table } from '@/ui/components/ui/table';
import { cn } from '@/ui/utils/cn';

import { dataTableClass, dataTableScrollAreaClass } from './styles';

/**
 * Data table 桌面表體。在 `ui/table` 的結構 primitive 之上加上 data-table 樣式契約
 * （table-fixed + border-collapse + text-sm）。
 */
export const DataTable = React.forwardRef<
  HTMLTableElement,
  React.TableHTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <Table ref={ref} className={cn(dataTableClass, className)} {...props} />
));
DataTable.displayName = 'DataTable';

/** 僅 md 以上顯示的可捲動容器；行動版欄位由 grouped card（MobileDataList）承擔。 */
export const DataTableScrollArea: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => <div className={cn(dataTableScrollAreaClass, className)} {...props} />;
DataTableScrollArea.displayName = 'DataTableScrollArea';
