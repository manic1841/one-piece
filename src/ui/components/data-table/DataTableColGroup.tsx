import * as React from 'react';

import { cn } from '@/ui/utils/cn';

interface DataTableColGroupProps {
  /** 各欄寬度（%）。總和必須為 100，否則瀏覽器會等比壓縮超寬表格、破壞跨表對齊。 */
  widths: readonly number[];
  className?: string;
}

const WIDTH_SUM_TOLERANCE = 0.5;

/**
 * 欄寬宣告。欄寬是頁面專屬事實（同頁多表格應共用同一組 widths 常數），
 * 但「總和 = 100」是跨表對齊的必要條件，因此由套件在 dev 時守住。
 */
export const DataTableColGroup: React.FC<DataTableColGroupProps> = ({ widths, className }) => {
  if (import.meta.env.DEV) {
    const total = widths.reduce((sum, width) => sum + width, 0);
    if (Math.abs(total - 100) > WIDTH_SUM_TOLERANCE) {
      console.error(
        `[data-table] column widths must sum to 100 (got ${total.toFixed(1)}): [${widths.join(', ')}]`,
      );
    }
  }

  return (
    <colgroup className={cn(className)}>
      {widths.map((width, index) => (
        <col key={index} style={{ width: `${width}%` }} />
      ))}
    </colgroup>
  );
};
DataTableColGroup.displayName = 'DataTableColGroup';
