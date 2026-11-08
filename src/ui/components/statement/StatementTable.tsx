import React from 'react';

import { ChevronRight } from 'lucide-react';

import {
  DataTable,
  DataTableCell,
  DataTableColGroup,
  DataTableRow,
  TableBody,
} from '@/ui/components/data-table';
import { cn } from '@/ui/utils/cn';

import { disclosureBodyClass } from '../ui/disclosure-styles';

/**
 * 報表語意階層的共用排版（見 `docs/ui/visual-standards.md` 的「財務報表語意階層」）。
 * 角色的樣式在此唯一實作，月度關帳與報表檢視共用同一份；本元件只 render，
 * 不做任何漂移比較或金額運算——金額文字由呼叫端預先解析。
 */
export type StatementRowTone =
  | 'section'
  | 'group'
  | 'detail'
  | 'deepDetail'
  | 'subtotal'
  | 'terminus';

export interface StatementRow {
  key: string;
  label: string;
  /** 已格式化的金額文字；`null` 渲染空的金額 cell（如 section 標題列）。 */
  amountText: string | null;
  /** 以警示色渲染金額（如漂移的數字）。 */
  amountWarning?: boolean;
  tone: StatementRowTone;
  /** 報表階層中的層級（1 = 第一層資料）；驅動縮排。 */
  level: number;
  children: StatementRow[];
}

/** Two columns: the label (chevron + indented text) and the rightmost amount. */
const STATEMENT_COLUMN_WIDTHS = [74, 26] as const;

/** Indentation per hierarchy level (design-system 間距級距). */
const INDENT_CLASS: readonly string[] = ['', 'pl-4', 'pl-8', 'pl-12'];

/**
 * 行動版堆疊時每張表上方的標題（桌機由 tabs 承擔）。共用同一份表面，讓關帳 stage
 * 與報表檢視的報表標題長得一樣。
 */
export const statementTitleClass =
  'text-[13px] font-semibold uppercase tracking-[0.08em] text-foreground';

const LABEL_TONE_CLASS: Record<StatementRowTone, string> = {
  section: 'text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground',
  group: 'text-[13px] font-medium text-foreground',
  detail: 'text-xs text-muted-foreground',
  deepDetail: 'text-[11px] text-muted-foreground',
  subtotal: 'text-[13px] font-semibold text-foreground',
  terminus: 'text-base font-semibold text-primary',
};

const AMOUNT_TONE_CLASS: Record<StatementRowTone, string> = {
  section: '',
  group: 'text-[13px]',
  detail: 'text-xs',
  deepDetail: 'text-[11px]',
  subtotal: 'text-[13px] font-semibold',
  terminus: 'text-base font-semibold text-primary',
};

const ROW_TONE_CLASS: Record<StatementRowTone, string> = {
  section: 'border-b border-border bg-muted/40',
  group: '',
  detail: '',
  deepDetail: '',
  subtotal: 'border-t border-border-strong',
  // Row height is content-driven (see StatementRowView); the terminus height
  // lives in `min-h-16` on its cells.
  terminus: 'border-t-2 border-primary bg-muted/40',
};

interface VisibleRow {
  row: StatementRow;
  /** 任一祖先收合中：列仍掛載，但高度為 0 且離開 tab 順序。 */
  hidden: boolean;
}

const flattenRows = (
  rows: StatementRow[],
  collapsed: ReadonlySet<string>,
  hidden = false,
  out: VisibleRow[] = [],
): VisibleRow[] => {
  for (const row of rows) {
    out.push({ row, hidden });
    if (row.children.length > 0) {
      flattenRows(row.children, collapsed, hidden || collapsed.has(row.key), out);
    }
  }
  return out;
};

/**
 * 單一 cell 的收合容器（motion-system §5.1 M05）。
 *
 * `<tr>` 的高度只由內容決定，所以收合改由型高插值：關閉時 `h-0`、開啟時
 * `h-auto`，`interpolate-size: allow-keywords` 讓 `auto` 成為可插值的關鍵字，列因此
 * 跟著內容長高／縮回，不需要 JS 量測。`grid-rows-[0fr]` 在容器 `height:auto` 下會
 * 停在內容高度（`fr` 沒有確定高度可解析），動畫一結束就彈回，不能用。
 *
 * 內距不可掛在 cell 上，且必須再往內一層：cell 的 `py` 會在列高歸零後仍撐著。
 * 收合時 `inert` 把子樹移出 tab 順序與 a11y 樹。
 *
 * cell 的 `align-middle` 也不再置中任何東西——列高由內層撐出，內容要自己置中，
 * 否則標籤會貼在列頂（比原本的垂直置中高 8px）。
 */
const CollapseCell: React.FC<{
  hidden: boolean;
  align?: 'text' | 'number';
  /** 內層內容的最小型高，撐住該列的語意高度（一般列 54px、terminus 64px）。 */
  minHeightClass: string;
  children: React.ReactNode;
}> = ({ hidden, align = 'text', minHeightClass, children }) => (
  <DataTableCell align={align} className="p-0 align-middle">
    <div
      data-state={hidden ? 'closed' : 'open'}
      inert={hidden || undefined}
      className={disclosureBodyClass}
    >
      <div className={cn('flex flex-col justify-center py-[9px] pr-3', minHeightClass)}>
        {children}
      </div>
    </div>
  </DataTableCell>
);

const StatementRowView: React.FC<{
  row: StatementRow;
  collapsed: ReadonlySet<string>;
  onToggle: (key: string) => void;
  hidden: boolean;
}> = ({ row, collapsed, onToggle, hidden }) => {
  const hasChildren = row.children.length > 0;
  const isCollapsed = hasChildren && collapsed.has(row.key);
  // Height always comes from the animated content: leaving the row's own 54px
  // height on would snap it to final size in the first frame.
  const minHeightClass = row.tone === 'terminus' ? 'min-h-16' : 'min-h-[54px]';

  return (
    <DataTableRow
      data-state={hidden ? 'closed' : 'open'}
      inert={hidden || undefined}
      className={cn(ROW_TONE_CLASS[row.tone], 'h-auto', hidden && 'border-t-0 border-b-0')}
    >
      <CollapseCell hidden={hidden} minHeightClass={minHeightClass}>
        <div className={cn('flex items-center gap-1', INDENT_CLASS[row.level] ?? 'pl-12')}>
          {hasChildren ? (
            /* 32px 命中區，外層仍佔 20px，讓有／無子列的標籤起點對齊。 */
            <span className="flex w-5 shrink-0 justify-center">
              <button
                type="button"
                onClick={() => onToggle(row.key)}
                aria-expanded={!isCollapsed}
                aria-label={row.label}
                className="flex h-8 w-8 shrink-0 items-center justify-center text-muted-foreground transition-transform duration-fast ease-out-quint active:scale-[0.97]"
              >
                <ChevronRight
                  className={cn('h-3.5 w-3.5 transition-transform', !isCollapsed && 'rotate-90')}
                />
              </button>
            </span>
          ) : (
            <span className="h-5 w-5 shrink-0" aria-hidden />
          )}
          <span className={LABEL_TONE_CLASS[row.tone]}>{row.label}</span>
        </div>
      </CollapseCell>
      <CollapseCell hidden={hidden} align="number" minHeightClass={minHeightClass}>
        {row.amountText !== null && (
          <span className={cn(AMOUNT_TONE_CLASS[row.tone], row.amountWarning && 'text-warning')}>
            {row.amountText}
          </span>
        )}
      </CollapseCell>
    </DataTableRow>
  );
};

interface StatementTableProps {
  rows: StatementRow[];
  collapsed: ReadonlySet<string>;
  onToggle: (key: string) => void;
  testId: string;
}

/**
 * `TableBody` zeroes every border on its last row (`[&_tr:last-child]:border-0`),
 * which also kills the terminus row's rules. The shared frame
 * (`dataTableFrameClass`) already restores a neutral bottom line for every data
 * table; the terminus row needs a heavier bottom to match its top
 * (`border-t-2 border-primary`). Restore both from the table root, where the
 * selector outranks the reset: 2px width on the terminus top and bottom. Colour
 * comes from the row's `border-primary`; `cn`/tailwind-merge lets this 2px
 * `border-b-2` override the shared 1px `border-b`.
 */
const TERMINUS_FRAME_RULE = '[&_tbody>tr:last-child]:border-t-2 [&_tbody>tr:last-child]:border-b-2';

export const StatementTable: React.FC<StatementTableProps> = ({
  rows,
  collapsed,
  onToggle,
  testId,
}) => (
  <DataTable data-testid={testId} className={TERMINUS_FRAME_RULE}>
    <DataTableColGroup widths={STATEMENT_COLUMN_WIDTHS} />
    <TableBody>
      {flattenRows(rows, collapsed).map(({ row, hidden }) => (
        <StatementRowView
          key={row.key}
          row={row}
          collapsed={collapsed}
          onToggle={onToggle}
          hidden={hidden}
        />
      ))}
    </TableBody>
  </DataTable>
);
