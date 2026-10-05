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
  terminus: 'h-16 border-t-2 border-primary bg-muted/40',
};

const flattenRows = (
  rows: StatementRow[],
  collapsed: ReadonlySet<string>,
  out: StatementRow[] = [],
): StatementRow[] => {
  for (const row of rows) {
    out.push(row);
    if (row.children.length > 0 && !collapsed.has(row.key)) {
      flattenRows(row.children, collapsed, out);
    }
  }
  return out;
};

const StatementRowView: React.FC<{
  row: StatementRow;
  collapsed: ReadonlySet<string>;
  onToggle: (key: string) => void;
}> = ({ row, collapsed, onToggle }) => {
  const hasChildren = row.children.length > 0;
  const isCollapsed = hasChildren && collapsed.has(row.key);

  return (
    <DataTableRow className={ROW_TONE_CLASS[row.tone]}>
      <DataTableCell>
        <div className={cn('flex items-center gap-1', INDENT_CLASS[row.level] ?? 'pl-12')}>
          {hasChildren ? (
            <button
              type="button"
              onClick={() => onToggle(row.key)}
              aria-expanded={!isCollapsed}
              aria-label={row.label}
              className="flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground"
            >
              <ChevronRight
                className={cn('h-3.5 w-3.5 transition-transform', !isCollapsed && 'rotate-90')}
              />
            </button>
          ) : (
            <span className="h-5 w-5 shrink-0" aria-hidden />
          )}
          <span className={LABEL_TONE_CLASS[row.tone]}>{row.label}</span>
        </div>
      </DataTableCell>
      {row.amountText === null ? (
        <DataTableCell align="number" />
      ) : (
        <DataTableCell
          align="number"
          className={cn(AMOUNT_TONE_CLASS[row.tone], row.amountWarning && 'text-warning')}
        >
          {row.amountText}
        </DataTableCell>
      )}
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
 * which also kills the terminus row's top rule. Restore that one side from the
 * table root, where the selector outranks the reset; the row itself supplies the
 * colour (`border-primary`).
 */
const RESTORE_TERMINUS_TOP_RULE = '[&_tbody>tr:last-child]:border-t-2';

export const StatementTable: React.FC<StatementTableProps> = ({
  rows,
  collapsed,
  onToggle,
  testId,
}) => (
  <DataTable data-testid={testId} className={RESTORE_TERMINUS_TOP_RULE}>
    <DataTableColGroup widths={STATEMENT_COLUMN_WIDTHS} />
    <TableBody>
      {flattenRows(rows, collapsed).map((row) => (
        <StatementRowView key={row.key} row={row} collapsed={collapsed} onToggle={onToggle} />
      ))}
    </TableBody>
  </DataTable>
);
