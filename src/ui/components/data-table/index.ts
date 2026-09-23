/**
 * Data table 套件公開入口（ADR-0061）。
 *
 * 樣式與契約層疊在 structural primitives（`ui/table`）之上；primitive 由此 barrel
 * 再輸出，讓消費端只有一個 import 路徑。既有 16 個直接消費 `ui/table` 的檔案維持
 * 原路徑，逐一遷移。
 */
export { DataTable, DataTableScrollArea } from './DataTable';
export { DataTableColGroup } from './DataTableColGroup';
export { DataTableHeadCell } from './DataTableHeadCell';
export { DataTableRow, DataTableHeadRow } from './DataTableRow';
export { DataTableCell } from './DataTableCell';
export { NumberCell } from './NumberCell';
export { NumberInput } from './NumberInput';
export { MobileDataList, MobileDataRow, MobileDataField } from './MobileDataRow';

export {
  dataTableClass,
  dataTableScrollAreaClass,
  dataTableHeadTextClass,
  dataTableHeadNumberClass,
  dataTableRowClass,
  dataTableCellTextClass,
  dataTableCellNumberClass,
  dataTableLabelClass,
  numberInputClass,
  numberInputCompactClass,
  numberInputSpinnerClass,
  mobileDataListClass,
  mobileDataRowClass,
  mobileFieldClass,
} from './styles';

// Structural primitives, re-exported so consumers have a single import path.
export { Table, TableBody, TableFooter, TableHeader } from '@/ui/components/ui/table';