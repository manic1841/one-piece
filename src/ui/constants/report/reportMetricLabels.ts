/**
 * 財務報表摘要指標（metrics）的顯示文案。三張表各三個指標，報表檢視與月度關帳共用；
 * 字面與三張表的區塊標題相同，但分屬不同表面（摘要列 vs 表格列），因此在此集中一份，
 * 不讓兩個 feature 互相 import 對方的 chrome。見 `docs/ui/visual-standards.md`。
 */
export const REPORT_METRIC_LABELS = {
  INCOME: '收入',
  EXPENSE: '支出',
  NET_INCOME: '本期淨利',
  ASSETS: '資產',
  LIABILITIES: '負債',
  EQUITY: '權益',
  BEGINNING_BALANCE: '期初餘額',
  ENDING_BALANCE: '期末餘額',
  NET_CASH_CHANGE: '現金淨變動',
} as const;
