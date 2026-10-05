import { type MoneyChangeTone, type MoneyTone } from '@/ui/components/moneyTone';
import { REPORT_METRIC_LABELS } from '@/ui/constants/report/reportMetricLabels';

/**
 * 報表摘要指標（metrics）的**身份定義**：哪三張表、每張表哪三個指標、順序與標籤。
 *
 * 值由呼叫端提供（已格式化的字串與色調）：報表檢視供給已產生報表的當期值，月度關帳
 * 供給漂移比對後的當期值與變化行。指標陣容只在此定義一次，兩個表面因此不會各自漂移
 * ——與 `statementRows` 承擔列結構是同一條分工線。
 */

/** 一個指標的呈現值；`change` 缺席則不渲染變化行。 */
export interface StatementMetricValue {
  /** 已格式化的當期值。 */
  value: string;
  tone?: MoneyTone;
  /** 已格式化的變化行（如漂移的 `A -> B`）。 */
  change?: string;
  changeTone?: MoneyChangeTone;
}

/** 一個報表摘要指標：身份（key／testId／label）由本模組內定，值由呼叫端提供。 */
export interface StatementMetric extends StatementMetricValue {
  key: string;
  testId: string;
  label: string;
}

const metric = (key: string, label: string, value: StatementMetricValue): StatementMetric => ({
  key: `metric-${key}`,
  testId: `statement-metric-${key}`,
  label,
  ...value,
});

/** 損益表：收入 / 支出 / 本期淨利。 */
export const incomeMetrics = (values: {
  income: StatementMetricValue;
  expense: StatementMetricValue;
  netIncome: StatementMetricValue;
}): StatementMetric[] => [
  metric('income', REPORT_METRIC_LABELS.INCOME, values.income),
  metric('expense', REPORT_METRIC_LABELS.EXPENSE, values.expense),
  metric('net-income', REPORT_METRIC_LABELS.NET_INCOME, values.netIncome),
];

/** 資產負債表：資產 / 負債 / 權益。 */
export const balanceMetrics = (values: {
  assets: StatementMetricValue;
  liabilities: StatementMetricValue;
  equity: StatementMetricValue;
}): StatementMetric[] => [
  metric('assets', REPORT_METRIC_LABELS.ASSETS, values.assets),
  metric('liabilities', REPORT_METRIC_LABELS.LIABILITIES, values.liabilities),
  metric('equity', REPORT_METRIC_LABELS.EQUITY, values.equity),
];

/** 現金流量表：期初餘額 / 期末餘額 / 現金淨變動（實際餘額為表下註腳，不在此重複）。 */
export const cashFlowMetrics = (values: {
  beginning: StatementMetricValue;
  ending: StatementMetricValue;
  netChange: StatementMetricValue;
}): StatementMetric[] => [
  metric('beginning-balance', REPORT_METRIC_LABELS.BEGINNING_BALANCE, values.beginning),
  metric('ending-balance', REPORT_METRIC_LABELS.ENDING_BALANCE, values.ending),
  metric('net-cash-change', REPORT_METRIC_LABELS.NET_CASH_CHANGE, values.netChange),
];
