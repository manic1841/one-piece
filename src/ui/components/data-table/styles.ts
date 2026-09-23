/**
 * Data table 樣式契約（單一真相來源）。
 *
 * 值對應 `docs/design-system.md` 的 `data-table` 段與 ADR-0061：
 * table-fixed + border-collapse、header 10px/500/uppercase/0.08em、
 * 資料列 54px、cell padding 9px 12px、數字欄右對齊 mono tabular-nums。
 *
 * 垂直內距是列高預算的一部分：`h-[54px]` 只是**最小**列高，列內最高的內容是
 * 34px 數字輸入框，所以「內容高 + 上下內距 + 1px 分隔線」不得超過 54px，否則
 * 列高會被內容撐開（13px 內距會讓輸入列實測變成 61px）。改動 `py` 值前先看
 * `data-table.test.tsx` 的 row height contract。
 *
 * 這些常數是逃生口：無法用套件 parts 表達的內容（例如「名稱 + 幣別標籤」這種
 * 複合 cell）仍應沿用同一組常數，不得另行手寫等價 class。
 */

/** 桌面表格本體：固定佈局、合併邊界、表格層級文字大小。 */
export const dataTableClass = 'w-full table-fixed border-collapse text-sm';

/** 僅在 md 以上顯示的可橫向捲動容器（行動版改用 grouped card）。 */
export const dataTableScrollAreaClass = 'hidden overflow-x-auto md:block';

const headCellBaseClass =
  'border-b border-border pb-[9px] pr-3 align-bottom text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground';

/** 文字欄表頭：置底對齊、左對齊。 */
export const dataTableHeadTextClass = `${headCellBaseClass} text-left`;

/** 數字欄表頭：與數字同軸右對齊。 */
export const dataTableHeadNumberClass = `${headCellBaseClass} text-right`;

/** 資料列：最小 54px 高、細分隔線（實際高度 = max(54, 最高 cell 內容)）。 */
export const dataTableRowClass = 'h-[54px] border-b border-border';

/** 一般 cell：垂直置中、9px 上下內距（見檔首的列高預算）。 */
export const dataTableCellTextClass = 'py-[9px] pr-3 align-middle text-left';

/** 數字 cell：右對齊 + 等寬 + 等寬數字（同上列高預算）。 */
export const dataTableCellNumberClass =
  'py-[9px] pr-3 align-middle text-right font-mono tabular-nums';

/** 欄位／區塊標籤（行動版 grouped card 與表頭以外的標籤共用）。 */
export const dataTableLabelClass =
  'text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground';

/** 移除 number input 的原生增減 spinner。 */
export const numberInputSpinnerClass =
  '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

/** 數字輸入框基準樣式（34px、直角、右對齊等寬）。 */
export const numberInputClass =
  'h-[34px] rounded-none border-border bg-muted px-2.5 text-right font-mono text-sm tabular-nums';

/** 數字輸入框緊湊版（子表格，32px）。 */
export const numberInputCompactClass =
  'h-8 rounded-none border-border bg-muted px-2.5 text-right font-mono text-xs tabular-nums';

/** 行動版 grouped card 容器。 */
export const mobileDataListClass = 'space-y-3 md:hidden';

/** 行動版單列：label 左 / 值右的 row representation。 */
export const mobileDataRowClass =
  'space-y-1 border-t border-border pt-2 first:border-t-0 first:pt-0';

/** 行動版單一欄位列。 */
export const mobileFieldClass = 'flex items-center justify-between';
