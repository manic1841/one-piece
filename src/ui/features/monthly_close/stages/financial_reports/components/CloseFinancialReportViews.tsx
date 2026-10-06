import React from 'react';

import { type MoneyTone, signTone } from '@/ui/components/moneyTone';
import { StatementPanel } from '@/ui/components/statement/StatementPanel';
import { type StatementRow, StatementTable } from '@/ui/components/statement/StatementTable';
import {
  type StatementMetricValue,
  balanceMetrics,
  cashFlowMetrics,
  incomeMetrics,
} from '@/ui/components/statement/statementMetrics';
import {
  type StatementAmountCell,
  type StatementNode,
  type StatementSectionSource,
  buildStatementRows,
} from '@/ui/components/statement/statementRows';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { REPORT_VIEW_TITLES } from '@/ui/constants/report/reportViewLabels';
import { formatCurrency } from '@/ui/utils';
import { cn } from '@/ui/utils/cn';

import {
  type BalanceSheetDrift,
  type CashFlowDrift,
  type DriftAmount,
  type DriftGroup,
  type DriftItem,
  type IncomeStatementDrift,
  combineDrift,
  formatDriftAmountText,
  formatDriftDelta,
  isDrifted,
} from '../../../viewmodels/reportDrift.vm';

/** 漂移金額 → 共用列的金額欄位：文字為 delta 或原值，警示色標記已漂移。 */
const driftCell = (drift: DriftAmount): StatementAmountCell => ({
  amountText: formatDriftAmountText(drift),
  amountWarning: isDrifted(drift),
});

/** 漂移金額 → 摘要指標值：當期值為本體，變化行為漂移 delta（未漂移則不顯示變化行）。 */
const driftMetricValue = (drift: DriftAmount, tone?: MoneyTone): StatementMetricValue => ({
  value: formatCurrency(drift.amount),
  tone,
  change: formatDriftDelta(drift) ?? undefined,
  changeTone: 'muted',
});

/** Inline variant of the amount cell for totals rendered inside prose. */
const StatementAmountText: React.FC<{ drift: DriftAmount }> = ({ drift }) => (
  <span className={cn(isDrifted(drift) && 'text-warning')}>{formatDriftAmountText(drift)}</span>
);

const totalLabel = (section: string): string => `${section}${MONTHLY_CLOSE_LABELS.TOTAL_SUFFIX}`;

/** 一條漂移明細列，含巢狀 `subItems`（縮排層級與角色由共用 builder 依層級決定）。 */
const driftNode = (item: DriftItem): StatementNode => ({
  code: item.code,
  label: item.label,
  cell: driftCell(item),
  subItems: item.subItems?.length ? item.subItems.map(driftNode) : undefined,
});

const driftSection = (
  key: string,
  label: string,
  total: DriftAmount,
  nodes: StatementNode[],
): StatementSectionSource => ({
  key,
  label,
  totalLabel: totalLabel(label),
  cell: driftCell(total),
  nodes,
});

/** 總額非 0 或有明細才顯示該區塊（「無資料」判斷）。 */
const included = (total: DriftAmount, count: number): boolean => total.amount !== 0 || count > 0;

interface StatementViewProps {
  collapsed: ReadonlySet<string>;
  onToggle: (key: string) => void;
}

const incomeStatementRows = (data: IncomeStatementDrift): StatementRow[] => {
  const sections = [
    included(data.incomeTotal, data.incomeItems.length)
      ? driftSection(
          'income',
          MONTHLY_CLOSE_LABELS.INCOME_SECTION,
          data.incomeTotal,
          data.incomeItems.map(driftNode),
        )
      : null,
    included(data.expenseTotal, data.expenseItems.length)
      ? driftSection(
          'expense',
          MONTHLY_CLOSE_LABELS.EXPENSE_SECTION,
          data.expenseTotal,
          data.expenseItems.map(driftNode),
        )
      : null,
  ].filter((section): section is StatementSectionSource => section !== null);

  return buildStatementRows({
    sections,
    terminus: { label: MONTHLY_CLOSE_LABELS.NET_INCOME, cell: driftCell(data.netIncome) },
  });
};

export const IncomeStatementView: React.FC<
  StatementViewProps & { data: IncomeStatementDrift | null }
> = ({ data, collapsed, onToggle }) => {
  const metrics = data
    ? incomeMetrics({
        income: driftMetricValue(data.incomeTotal),
        expense: driftMetricValue(data.expenseTotal),
        netIncome: driftMetricValue(data.netIncome, signTone(data.netIncome.amount)),
      })
    : undefined;

  return (
    <StatementPanel
      testId="close-income-statement"
      title={REPORT_VIEW_TITLES.INCOME_STATEMENT}
      metrics={metrics}
    >
      {data ? (
        <StatementTable
          testId="income-statement-table"
          rows={incomeStatementRows(data)}
          collapsed={collapsed}
          onToggle={onToggle}
        />
      ) : null}
    </StatementPanel>
  );
};

const balanceGroupNode = (key: string, group: DriftGroup): StatementNode => ({
  code: key,
  label: group.label,
  cell: driftCell(group.total),
  subItems: group.items.map(driftNode),
});

/** 一個資產負債表區塊：標題列 + 群組列 + 合計列（空區塊回傳 null）。 */
const balanceSection = (
  key: string,
  label: string,
  side: { total: DriftAmount; groups: Record<string, DriftGroup> },
  filtered: boolean,
): StatementSectionSource | null => {
  const entries = Object.entries(side.groups).filter(
    ([, group]) => !filtered || included(group.total, group.items.length),
  );
  if (!included(side.total, entries.length)) return null;
  return driftSection(
    key,
    label,
    side.total,
    entries.map(([groupKey, group]) => balanceGroupNode(groupKey, group)),
  );
};

const balanceSheetRows = (data: BalanceSheetDrift): StatementRow[] => {
  const sections = [
    balanceSection('assets', MONTHLY_CLOSE_LABELS.ASSETS_SECTION, data.assets, true),
    balanceSection('liabilities', MONTHLY_CLOSE_LABELS.LIABILITIES_SECTION, data.liabilities, true),
    // 權益的五個來源是固定拆分，即使為零也顯示，不讓歸零的來源被默默省略。
    balanceSection('equity', MONTHLY_CLOSE_LABELS.EQUITY_SECTION, data.equity, false),
  ].filter((section): section is StatementSectionSource => section !== null);

  return buildStatementRows({
    sections,
    terminus: {
      label: MONTHLY_CLOSE_LABELS.LIABILITIES_PLUS_EQUITY,
      cell: driftCell(combineDrift([data.liabilities.total, data.equity.total])),
    },
  });
};

export const BalanceSheetView: React.FC<
  StatementViewProps & { data: BalanceSheetDrift | null }
> = ({ data, collapsed, onToggle }) => {
  const metrics = data
    ? balanceMetrics({
        assets: driftMetricValue(data.assets.total),
        liabilities: driftMetricValue(data.liabilities.total),
        equity: driftMetricValue(data.equity.total),
      })
    : undefined;

  return (
    <StatementPanel
      testId="close-balance-sheet"
      title={REPORT_VIEW_TITLES.BALANCE_SHEET}
      metrics={metrics}
    >
      {data ? (
        <StatementTable
          testId="balance-sheet-table"
          rows={balanceSheetRows(data)}
          collapsed={collapsed}
          onToggle={onToggle}
        />
      ) : null}
    </StatementPanel>
  );
};

// 流入與流出桶可能共用科目代碼，路徑式 key（由共用 builder 組出）讓桶彼此隔離。
const cashFlowBucketNode = (
  bucket: 'inflow' | 'outflow',
  label: string,
  items: DriftItem[],
): StatementNode | null => {
  if (items.length === 0) return null;
  return {
    code: bucket,
    label,
    cell: driftCell(combineDrift(items)),
    subItems: items.map(driftNode),
  };
};

const cashFlowRows = (data: CashFlowDrift): StatementRow[] => {
  const sections = (['operating', 'investing', 'financing'] as const)
    .map((key) => {
      const group = data[key];
      const nodes = [
        cashFlowBucketNode('inflow', MONTHLY_CLOSE_LABELS.INFLOW, group.inflowItems),
        cashFlowBucketNode('outflow', MONTHLY_CLOSE_LABELS.OUTFLOW, group.outflowItems),
      ].filter((node): node is StatementNode => node !== null);
      return included(group.total, nodes.length)
        ? driftSection(key, group.label, group.total, nodes)
        : null;
    })
    .filter((section): section is StatementSectionSource => section !== null);

  return buildStatementRows({
    sections,
    terminus: {
      label: MONTHLY_CLOSE_LABELS.NET_CASH_CHANGE,
      cell: driftCell(data.netCashChange),
    },
  });
};

export const CashFlowView: React.FC<StatementViewProps & { data: CashFlowDrift | null }> = ({
  data,
  collapsed,
  onToggle,
}) => {
  const metrics = data
    ? cashFlowMetrics({
        beginning: driftMetricValue(data.beginningBalance),
        ending: driftMetricValue(data.endingBalance),
        netChange: driftMetricValue(data.netCashChange, signTone(data.netCashChange.amount)),
      })
    : undefined;

  return (
    <StatementPanel testId="close-cash-flow" title={REPORT_VIEW_TITLES.CASH_FLOW} metrics={metrics}>
      {data ? (
        <div className="space-y-6">
          <StatementTable
            testId="cash-flow-table"
            rows={cashFlowRows(data)}
            collapsed={collapsed}
            onToggle={onToggle}
          />
          <p className="text-right text-xs text-muted-foreground">
            {MONTHLY_CLOSE_LABELS.ACTUAL_BALANCE} <StatementAmountText drift={data.actualBalance} />
          </p>
        </div>
      ) : null}
    </StatementPanel>
  );
};
