import {
  type BalanceSheetData,
  type BalanceSheetGroup,
  type CashFlowData,
  type CashFlowGroup,
  type IncomeStatementData,
} from './schemas';

/**
 * Report drift compares a live **Report Preview** (recomputed from the current
 * entries) with the **Persisted Report** frozen at generation time, and returns
 * the preview rows annotated with a per-row drift status (see CONTEXT.md).
 *
 * The functions are pure: no React, no I/O. The UI renders the preview values
 * and surfaces the annotations; the comparison rules live here.
 */

export const DRIFT_STATUS = {
  /** The row exists on both sides with the same amount. */
  UNCHANGED: 'UNCHANGED',
  /** Same row on both sides, different amount. */
  CHANGED: 'CHANGED',
  /** The preview has the row, the persisted report does not. */
  ADDED: 'ADDED',
  /** The persisted report has the row, the preview does not. */
  REMOVED: 'REMOVED',
  /** A parent row whose child row set changed (a child was added or removed). */
  RESTRUCTURED: 'RESTRUCTURED',
} as const;
export type DriftStatus = (typeof DRIFT_STATUS)[keyof typeof DRIFT_STATUS];

/** A single compared figure: the preview value plus what it drifted from. */
export interface DriftAmount {
  /** The value to render (the preview value). */
  amount: number;
  /**
   * The persisted value to show before the arrow, or `null` when the row is
   * new (rendered as `0 -> amount`) or when the amounts are equal.
   */
  previousAmount: number | null;
  status: DriftStatus;
}

/** A compared statement row, carrying its (optional) nested sub-items. */
export interface DriftItem extends DriftAmount {
  code: string;
  label: string;
  subItems?: DriftItem[];
}

export interface DriftGroup {
  label: string;
  total: DriftAmount;
  items: DriftItem[];
}

export interface DriftCashFlowGroup {
  label: string;
  total: DriftAmount;
  inflowItems: DriftItem[];
  outflowItems: DriftItem[];
}

export interface IncomeStatementDrift {
  incomeItems: DriftItem[];
  expenseItems: DriftItem[];
  incomeTotal: DriftAmount;
  expenseTotal: DriftAmount;
  netIncome: DriftAmount;
}

export interface BalanceSheetDrift {
  assets: { total: DriftAmount; groups: Record<string, DriftGroup> };
  liabilities: { total: DriftAmount; groups: Record<string, DriftGroup> };
  equity: { total: DriftAmount; groups: Record<string, DriftGroup> };
}

export interface CashFlowDrift {
  operating: DriftCashFlowGroup;
  investing: DriftCashFlowGroup;
  financing: DriftCashFlowGroup;
  netCashChange: DriftAmount;
  beginningBalance: DriftAmount;
  endingBalance: DriftAmount;
  actualBalance: DriftAmount;
  adjustment: DriftAmount;
}

/** The shape every statement row shares, whether it nests or not. */
interface SourceItem {
  code: string;
  label: string;
  amount: number;
  subItems?: SourceItem[];
}

const unchangedAmount = (amount: number): DriftAmount => ({
  amount,
  previousAmount: null,
  status: DRIFT_STATUS.UNCHANGED,
});

/** Compare two figures. Equal amounts are unchanged, otherwise the preview wins. */
export const diffAmount = (preview: number, persisted: number): DriftAmount =>
  preview === persisted
    ? unchangedAmount(preview)
    : { amount: preview, previousAmount: persisted, status: DRIFT_STATUS.CHANGED };

const unchangedItem = (item: SourceItem): DriftItem => ({
  code: item.code,
  label: item.label,
  amount: item.amount,
  previousAmount: null,
  status: DRIFT_STATUS.UNCHANGED,
  subItems: item.subItems?.map(unchangedItem),
});

const removedItem = (item: SourceItem): DriftItem => ({
  code: item.code,
  label: item.label,
  amount: 0,
  previousAmount: item.amount,
  status: DRIFT_STATUS.REMOVED,
  subItems: item.subItems?.map(removedItem),
});

const addedItem = (item: SourceItem): DriftItem => ({
  code: item.code,
  label: item.label,
  amount: item.amount,
  previousAmount: null,
  status: DRIFT_STATUS.ADDED,
  subItems: item.subItems?.map(addedItem),
});

const diffItem = (preview: SourceItem, persisted: SourceItem): DriftItem => {
  const previewChildren = preview.subItems;
  const persistedChildren = persisted.subItems;
  const previewHasChildren = (previewChildren?.length ?? 0) > 0;
  const persistedHasChildren = (persistedChildren?.length ?? 0) > 0;

  // Structural absence: the persisted row predates the sub-item schema, so its
  // child set is unknown. Compare only this level and render the preview's
  // children unflagged rather than reporting every child as newly added.
  if (previewHasChildren && !persistedHasChildren) {
    return {
      ...diffAmount(preview.amount, persisted.amount),
      code: preview.code,
      label: preview.label,
      subItems: previewChildren!.map(unchangedItem),
    };
  }

  // The preview rolled flat while the persisted row still had children: the
  // whole child set was removed. Flag the parent and surface each removed row.
  if (!previewHasChildren && persistedHasChildren) {
    return {
      code: preview.code,
      label: preview.label,
      amount: preview.amount,
      previousAmount: persisted.amount,
      status: DRIFT_STATUS.RESTRUCTURED,
      subItems: persistedChildren!.map(removedItem),
    };
  }

  // Leaf rows (neither side nests) compare their amount directly.
  if (!previewHasChildren && !persistedHasChildren) {
    return {
      ...diffAmount(preview.amount, persisted.amount),
      code: preview.code,
      label: preview.label,
    };
  }

  const persistedByCode = new Map((persistedChildren ?? []).map((child) => [child.code, child]));
  const previewCodes = new Set(previewChildren!.map((child) => child.code));
  const children = previewChildren!.map((child) => {
    const previous = persistedByCode.get(child.code);
    return previous ? diffItem(child, previous) : addedItem(child);
  });
  const removedChildren = (persistedChildren ?? [])
    .filter((child) => !previewCodes.has(child.code))
    .map(removedItem);
  const restructured = removedChildren.length > 0 || previewChildren!.length > persistedByCode.size;

  // A parent warns only when its child row set changed, so a plain total move
  // does not light the whole tree; the changed leaf carries the signal instead.
  return {
    code: preview.code,
    label: preview.label,
    amount: preview.amount,
    previousAmount: restructured ? persisted.amount : null,
    status: restructured ? DRIFT_STATUS.RESTRUCTURED : DRIFT_STATUS.UNCHANGED,
    subItems: [...children, ...removedChildren],
  };
};

/** Whether the item tree already nests detail rows under a parent. */
const hasNestedItems = (items: readonly SourceItem[]): boolean =>
  items.some((item) => (item.subItems?.length ?? 0) > 0);

/**
 * Fold legacy flat group items (pre-roll-up persisted reports) into the nested
 * shape the preview produces: a 2-segment parent per `type:category` with its
 * 3+ segment detail codes as subItems. Compared as-is, the legacy shape and the
 * nested preview never match by code — the pair renders as an added parent plus
 * a removed flat row sharing the detail's React key, which duplicates rows when
 * the table re-renders on collapse/expand.
 */
const nestLegacyItems = (items: readonly SourceItem[]): SourceItem[] => {
  if (hasNestedItems(items)) return [...items];
  const parents = new Map<string, { amount: number; subItems: SourceItem[] }>();
  for (const item of items) {
    const segments = item.code.split(':');
    const parentCode = segments.slice(0, 2).join(':');
    const node = parents.get(parentCode) ?? { amount: 0, subItems: [] };
    node.amount += item.amount;
    if (segments.length > 2) node.subItems.push(item);
    parents.set(parentCode, node);
  }
  return Array.from(parents.entries()).map(([code, node]) => ({
    code,
    label: code,
    amount: node.amount,
    subItems: node.subItems.length > 0 ? node.subItems : undefined,
  }));
};

/** Compare one level of rows, appending persisted-only rows as removed. */
const diffNormalizedItems = (
  preview: readonly SourceItem[],
  persisted: readonly SourceItem[],
): DriftItem[] => {
  const persistedByCode = new Map(persisted.map((item) => [item.code, item]));
  const previewCodes = new Set(preview.map((item) => item.code));
  const rows = preview.map((item) => {
    const previous = persistedByCode.get(item.code);
    return previous ? diffItem(item, previous) : addedItem(item);
  });
  const removedRows = persisted.filter((item) => !previewCodes.has(item.code)).map(removedItem);
  return [...rows, ...removedRows];
};

/** Compare one level of rows, appending persisted-only rows as removed. */
export const diffItems = (
  preview: readonly SourceItem[],
  persisted: readonly SourceItem[],
): DriftItem[] => diffNormalizedItems(preview, nestLegacyItems(persisted));

/**
 * The inverse of `nestLegacyItems` for balance-sheet groups: those carry the
 * roll-up themselves (label + summed total), and their items now record detail
 * codes directly. Reports generated before that shape stored a redundant parent
 * row with the details as subItems; unfolding it (the unallocated remainder
 * becomes a bare-code row) restores the flat shape the preview produces, so the
 * pair compares by code instead of reading as a mass of added/removed rows.
 */
const flattenRollupItems = (items: readonly SourceItem[]): SourceItem[] => {
  if (!items.some((item) => (item.subItems?.length ?? 0) > 0)) return [...items];
  const flat: SourceItem[] = [];
  for (const item of items) {
    const children = item.subItems ?? [];
    if (children.length === 0) {
      flat.push(item);
      continue;
    }
    const childrenSum = children.reduce((sum, child) => sum + child.amount, 0);
    if (item.amount !== childrenSum) {
      flat.push({ code: item.code, label: item.label, amount: item.amount - childrenSum });
    }
    flat.push(...children.map(({ code, label, amount }) => ({ code, label, amount })));
  }
  return flat;
};

const diffGroups = (
  preview: Record<string, BalanceSheetGroup>,
  persisted: Record<string, BalanceSheetGroup> | undefined,
): Record<string, DriftGroup> => {
  const groups: Record<string, DriftGroup> = {};
  for (const [key, group] of Object.entries(preview)) {
    const previous = persisted?.[key];
    groups[key] = {
      label: group.label,
      total: previous
        ? diffAmount(group.total, previous.total)
        : { amount: group.total, previousAmount: null, status: DRIFT_STATUS.ADDED },
      items: diffNormalizedItems(group.items, flattenRollupItems(previous?.items ?? [])),
    };
  }
  for (const [key, group] of Object.entries(persisted ?? {})) {
    if (key in preview) continue;
    groups[key] = {
      label: group.label,
      total: { amount: 0, previousAmount: group.total, status: DRIFT_STATUS.REMOVED },
      items: group.items.map(removedItem),
    };
  }
  return groups;
};

/** Annotate a persisted statement as the display source with no drift marks. */
export const annotateIncomeStatement = (data: IncomeStatementData): IncomeStatementDrift => ({
  incomeItems: data.incomeItems.map(unchangedItem),
  expenseItems: data.expenseItems.map(unchangedItem),
  incomeTotal: unchangedAmount(data.incomeTotal),
  expenseTotal: unchangedAmount(data.expenseTotal),
  netIncome: unchangedAmount(data.netIncome),
});

const annotateGroups = (groups: Record<string, BalanceSheetGroup>): Record<string, DriftGroup> =>
  Object.fromEntries(
    Object.entries(groups).map(([key, group]) => [
      key,
      {
        label: group.label,
        total: unchangedAmount(group.total),
        items: group.items.map(unchangedItem),
      },
    ]),
  );

export const annotateBalanceSheet = (data: BalanceSheetData): BalanceSheetDrift => ({
  assets: {
    total: unchangedAmount(data.assets.total),
    groups: annotateGroups(data.assets.groups),
  },
  liabilities: {
    total: unchangedAmount(data.liabilities.total),
    groups: annotateGroups(data.liabilities.groups),
  },
  equity: {
    total: unchangedAmount(data.equity.total),
    groups: annotateGroups(data.equity.groups),
  },
});

const annotateCashFlowGroup = (group: CashFlowGroup): DriftCashFlowGroup => ({
  label: group.label,
  total: unchangedAmount(group.total),
  inflowItems: group.inflowItems.map(unchangedItem),
  outflowItems: group.outflowItems.map(unchangedItem),
});

export const annotateCashFlow = (data: CashFlowData): CashFlowDrift => ({
  operating: annotateCashFlowGroup(data.operating),
  investing: annotateCashFlowGroup(data.investing),
  financing: annotateCashFlowGroup(data.financing),
  netCashChange: unchangedAmount(data.netCashChange),
  beginningBalance: unchangedAmount(data.beginningBalance),
  endingBalance: unchangedAmount(data.endingBalance),
  actualBalance: unchangedAmount(data.actualBalance),
  adjustment: unchangedAmount(data.adjustment),
});

export const diffIncomeStatement = (
  preview: IncomeStatementData,
  persisted: IncomeStatementData | null,
): IncomeStatementDrift => {
  if (!persisted) return annotateIncomeStatement(preview);
  return {
    incomeItems: diffItems(preview.incomeItems, persisted.incomeItems),
    expenseItems: diffItems(preview.expenseItems, persisted.expenseItems),
    incomeTotal: diffAmount(preview.incomeTotal, persisted.incomeTotal),
    expenseTotal: diffAmount(preview.expenseTotal, persisted.expenseTotal),
    netIncome: diffAmount(preview.netIncome, persisted.netIncome),
  };
};

const diffCashFlowGroup = (
  preview: CashFlowGroup,
  persisted: CashFlowGroup | undefined,
): DriftCashFlowGroup => ({
  label: preview.label,
  total: persisted
    ? diffAmount(preview.total, persisted.total)
    : { amount: preview.total, previousAmount: null, status: DRIFT_STATUS.ADDED },
  inflowItems: diffItems(preview.inflowItems, persisted?.inflowItems ?? []),
  outflowItems: diffItems(preview.outflowItems, persisted?.outflowItems ?? []),
});

export const diffCashFlow = (
  preview: CashFlowData,
  persisted: CashFlowData | null,
): CashFlowDrift => {
  if (!persisted) return annotateCashFlow(preview);
  return {
    operating: diffCashFlowGroup(preview.operating, persisted.operating),
    investing: diffCashFlowGroup(preview.investing, persisted.investing),
    financing: diffCashFlowGroup(preview.financing, persisted.financing),
    netCashChange: diffAmount(preview.netCashChange, persisted.netCashChange),
    beginningBalance: diffAmount(preview.beginningBalance, persisted.beginningBalance),
    endingBalance: diffAmount(preview.endingBalance, persisted.endingBalance),
    actualBalance: diffAmount(preview.actualBalance, persisted.actualBalance),
    adjustment: diffAmount(preview.adjustment, persisted.adjustment),
  };
};

export const diffBalanceSheet = (
  preview: BalanceSheetData,
  persisted: BalanceSheetData | null,
): BalanceSheetDrift => {
  if (!persisted) return annotateBalanceSheet(preview);
  return {
    assets: {
      total: diffAmount(preview.assets.total, persisted.assets.total),
      groups: diffGroups(preview.assets.groups, persisted.assets.groups),
    },
    liabilities: {
      total: diffAmount(preview.liabilities.total, persisted.liabilities.total),
      groups: diffGroups(preview.liabilities.groups, persisted.liabilities.groups),
    },
    equity: {
      total: diffAmount(preview.equity.total, persisted.equity.total),
      groups: diffGroups(preview.equity.groups, persisted.equity.groups),
    },
  };
};

/** The three persisted statements, each null when it was never generated. */
export interface ReportStatements {
  incomeStatement: IncomeStatementData | null;
  balanceSheet: BalanceSheetData | null;
  cashFlow: CashFlowData | null;
}

/** A complete preview: the three statements are always produced together. */
export interface PreviewStatements {
  incomeStatement: IncomeStatementData;
  balanceSheet: BalanceSheetData;
  cashFlow: CashFlowData;
}

/** One comparison's annotated statements plus the close gate's boolean. */
export interface ReportDriftModel {
  incomeStatement: IncomeStatementDrift | null;
  balanceSheet: BalanceSheetDrift | null;
  cashFlow: CashFlowDrift | null;
  hasAnyDrift: boolean;
}

/** True when any figure in the trees is not UNCHANGED (a null tree holds none). */
const holdsDrift = (node: unknown): boolean => {
  if (Array.isArray(node)) return node.some(holdsDrift);
  if (node === null || typeof node !== 'object') return false;
  const record = node as Record<string, unknown>;
  if (record.status !== undefined && record.status !== DRIFT_STATUS.UNCHANGED) return true;
  return Object.values(record).some(holdsDrift);
};

const modelOf = (
  incomeStatement: IncomeStatementDrift | null,
  balanceSheet: BalanceSheetDrift | null,
  cashFlow: CashFlowDrift | null,
): ReportDriftModel => ({
  incomeStatement,
  balanceSheet,
  cashFlow,
  hasAnyDrift: holdsDrift([incomeStatement, balanceSheet, cashFlow]),
});

/** Annotate a live preview against the persisted record. */
export const compareReports = (
  preview: PreviewStatements,
  persisted: ReportStatements | null,
): ReportDriftModel =>
  modelOf(
    diffIncomeStatement(preview.incomeStatement, persisted?.incomeStatement ?? null),
    diffBalanceSheet(preview.balanceSheet, persisted?.balanceSheet ?? null),
    diffCashFlow(preview.cashFlow, persisted?.cashFlow ?? null),
  );

/** The persisted record shown read-only for a CLOSED period, with no drift marks. */
export const annotateReports = (persisted: ReportStatements | null): ReportDriftModel =>
  modelOf(
    persisted?.incomeStatement ? annotateIncomeStatement(persisted.incomeStatement) : null,
    persisted?.balanceSheet ? annotateBalanceSheet(persisted.balanceSheet) : null,
    persisted?.cashFlow ? annotateCashFlow(persisted.cashFlow) : null,
  );

/** An ADDED operand has no persisted value, so it counts as 0 (#237). */
const persistedValueOf = (part: DriftAmount): number =>
  part.status === DRIFT_STATUS.ADDED ? 0 : (part.previousAmount ?? part.amount);

/** Sum drift-annotated operands; drifted when any operand drifted. */
export const combineDrift = (parts: readonly DriftAmount[]): DriftAmount => {
  const amount = parts.reduce((sum, part) => sum + part.amount, 0);
  const previousAmount = parts.reduce((sum, part) => sum + persistedValueOf(part), 0);
  if (parts.every((part) => part.status === DRIFT_STATUS.UNCHANGED)) {
    return { amount, previousAmount: null, status: DRIFT_STATUS.UNCHANGED };
  }
  return { amount, previousAmount, status: DRIFT_STATUS.CHANGED };
};
