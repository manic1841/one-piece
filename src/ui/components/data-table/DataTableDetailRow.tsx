import * as React from 'react';

import { cn } from '@/ui/utils/cn';

import { DataTableCell } from './DataTableCell';
import { DataTableRow } from './DataTableRow';

export interface DataTableDetailRowProps
  extends Omit<React.ComponentPropsWithoutRef<typeof DataTableRow>, 'children'> {
  /** 是否展開。關閉時列高為 0、不吃分隔線，等同不存在。 */
  open: boolean;
  /** 詳情內容橫跨的欄數。 */
  colSpan: number;
  /** 內層內容容器的樣式（底色、內距）。 */
  contentClassName?: string;
  children: React.ReactNode;
}

/**
 * 展開列的詳情列（motion-system §5.1 M05）。
 *
 * 列本身必須保持掛載才能播收合動畫。收起時列高歸零並收掉分隔線，看起來就是
 * 消失；高度一律由內容決定，所以列不能帶著自己的 54px（那會在第一次影格就跳到位）。
 * 收合走 `height: auto → 0` 插值，`interpolate-size: allow-keywords` 讓 `auto`
 * 可插值；`grid-rows-[0fr]` 在容器 `height:auto` 下會停在內容高度，動畫結束即彈
 * 回，不能用。
 *
 * 內距放在內層內容容器而非 cell 上，否則關閉時 `py` 仍會撐出高度。關閉時內層
 * `inert`，讓收起的內容離開 tab 順序與 a11y 樹。
 */
export const DataTableDetailRow = React.forwardRef<HTMLTableRowElement, DataTableDetailRowProps>(
  ({ open, colSpan, className, contentClassName, children, ...props }, ref) => (
    <DataTableRow
      ref={ref}
      className={cn('h-auto hover:bg-transparent', !open && 'border-b-0', className)}
      {...props}
    >
      <DataTableCell colSpan={colSpan} className="p-0">
        <div
          data-state={open ? 'open' : 'closed'}
          inert={!open}
          className={cn(
            'overflow-hidden [interpolate-size:allow-keywords]',
            'data-[state=closed]:h-0 data-[state=closed]:opacity-0 data-[state=closed]:animate-disclosure-up',
            'data-[state=open]:h-auto data-[state=open]:animate-disclosure-down',
          )}
        >
          <div className={contentClassName}>{children}</div>
        </div>
      </DataTableCell>
    </DataTableRow>
  ),
);
DataTableDetailRow.displayName = 'DataTableDetailRow';
