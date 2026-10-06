import { type StatementRow, type StatementRowTone } from './StatementTable';

/**
 * 報表語意階層的**列組裝**（角色語意見 `docs/ui/visual-standards.md` 的「財務報表語意階層」）。
 *
 * 角色的樣式住在 `StatementTable`；本模組把「資料」排成 `StatementRow[]`：決定縮排層級與
 * 角色、以路徑組出穩定 key、把每個區塊收成「標題列 → 資料列 → 合計列」，最後補上整表的
 * 收束列。呼叫端只提供已解析的金額欄與已格式化標籤，不重寫這段結構——月度關帳（漂移比對）
 * 與報表檢視（已產生報表）因此共用同一份列結構，只差在金額如何取得。
 */

/** 金額欄的呈現值：文字 + 是否以警示色標記（如漂移的數字）。 */
export interface StatementAmountCell {
  amountText: string | null;
  amountWarning?: boolean;
}

/**
 * 一條資料列。`code` 只需在**同層**內唯一，完整 key 由 builder 以路徑組出，因此不同區塊
 * 底下同名的科目代碼不會互撞；`subItems` 對應下一層（Group → Detail → Deep detail）。
 */
export interface StatementNode {
  code: string;
  label: string;
  cell: StatementAmountCell;
  subItems?: StatementNode[];
}

/** 一級區塊：標題列 + 資料列 + 合計列。空區塊由呼叫端自行省略。 */
export interface StatementSectionSource {
  /** 同表內唯一，組出 `section:`／`total:` key 與子列路徑。 */
  key: string;
  /** 區塊標題（Section 列）。 */
  label: string;
  /** 合計列標題（通常為「{區塊}合計」，由呼叫端以 label API 解析）。 */
  totalLabel: string;
  /** 區塊合計。 */
  cell: StatementAmountCell;
  nodes: StatementNode[];
}

const LEVEL_TONES: readonly StatementRowTone[] = ['group', 'detail', 'deepDetail'];

const toneForLevel = (level: number): StatementRowTone => LEVEL_TONES[level - 1] ?? 'deepDetail';

const nodeRows = (nodes: StatementNode[], level: number, keyPath: string): StatementRow[] =>
  nodes.map((node) => {
    const key = `${keyPath}:${node.code}`;
    return {
      key,
      label: node.label,
      amountText: node.cell.amountText,
      amountWarning: node.cell.amountWarning,
      tone: toneForLevel(level),
      level,
      children: node.subItems?.length ? nodeRows(node.subItems, level + 1, key) : [],
    };
  });

export interface StatementRowsInput {
  sections: readonly StatementSectionSource[];
  /** 整表的收束列（損益表＝本期淨利；資產負債表＝負債 + 權益；現金流量表＝現金淨變動）。 */
  terminus: { label: string; cell: StatementAmountCell };
}

export function buildStatementRows({ sections, terminus }: StatementRowsInput): StatementRow[] {
  const rows: StatementRow[] = [];
  for (const section of sections) {
    rows.push({
      key: `section:${section.key}`,
      label: section.label,
      amountText: null,
      tone: 'section',
      level: 0,
      children: nodeRows(section.nodes, 1, section.key),
    });
    rows.push({
      key: `total:${section.key}`,
      label: section.totalLabel,
      amountText: section.cell.amountText,
      amountWarning: section.cell.amountWarning,
      tone: 'subtotal',
      level: 0,
      children: [],
    });
  }
  rows.push({
    key: 'terminus',
    label: terminus.label,
    amountText: terminus.cell.amountText,
    amountWarning: terminus.cell.amountWarning,
    tone: 'terminus',
    level: 0,
    children: [],
  });
  return rows;
}
