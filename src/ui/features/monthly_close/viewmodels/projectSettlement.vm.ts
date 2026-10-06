/**
 * PROJECT_SETTLEMENT 階段的列形狀。
 *
 * 四個金額保持原始 number：格式化屬於呈現層（`NumberCell format={formatCurrency}`），
 * 預先轉字串會失去右對齊等寬與空值語意。
 */
export interface ProjectSettlementRow {
  projectId: string;
  projectName: string;
  /** 該月快照是否已存在（已結算）。 */
  settled: boolean;
  /** 即時 preview 的四個數字，確認後 persisted 快照即與之一致。 */
  openingBalance: number;
  income: number;
  expense: number;
  closingBalance: number;
}
