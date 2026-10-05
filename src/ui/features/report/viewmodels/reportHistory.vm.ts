import { type FinancialPeriod } from '@/domains/financial_period/schemas';
import { type FinancialReport, ReportType } from '@/domains/report/schemas';
import { type StatusGlyphType } from '@/ui/components/StatusGlyph';
import { type MoneyTone } from '@/ui/components/moneyTone';
import {
  DASHBOARD_CLOSE_NO_RECORD,
  DASHBOARD_CLOSE_STATUS_GLYPHS,
  DASHBOARD_CLOSE_STATUS_TEXT_MAP,
} from '@/ui/constants/dashboard/monthlyCloseStatus';
import { formatCurrencyOrDash } from '@/ui/utils';

/** 報表期間的粒度：月（YYYY-MM）或年（YYYY）。 */
export type ReportGranularity = 'MONTHLY' | 'YEARLY';

export interface ReportPeriod {
  raw: string;
  mode: ReportGranularity;
  year: number;
  /** 1–12；年期間為 null。 */
  month: number | null;
}

const YEAR_PATTERN = /^(\d{4})$/;
const YEAR_MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** 由 `:period` 路徑參數解析期間；以長度判別月／年（沿用 stored-report 讀取慣例）。 */
export const parseReportPeriod = (raw: string | undefined): ReportPeriod | null => {
  if (!raw) return null;
  const year = YEAR_PATTERN.exec(raw);
  if (year) return { raw, mode: 'YEARLY', year: Number(year[1]), month: null };
  const month = YEAR_MONTH_PATTERN.exec(raw);
  if (month) {
    return { raw, mode: 'MONTHLY', year: Number(month[1]), month: Number(month[2]) };
  }
  return null;
};

/** 依期間粒度往前／後移動，回傳新的 `:period` 參數。 */
export const stepReportPeriod = (period: ReportPeriod, delta: number): string => {
  if (period.mode === 'YEARLY') return String(period.year + delta);
  const zeroBased = period.year * 12 + (period.month ?? 1) - 1 + delta;
  const year = Math.floor(zeroBased / 12);
  const month = (zeroBased % 12) + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
};

/** 人類可讀的期間顯示，如「2026 年 6 月」或「2026 年」。 */
export const formatReportPeriodDisplay = (period: ReportPeriod): string =>
  period.mode === 'YEARLY' ? `${period.year} 年` : `${period.year} 年 ${period.month} 月`;

const monthTone = (value: number | undefined): MoneyTone => {
  if (value === undefined || value === 0) return 'default';
  return value > 0 ? 'positive' : 'negative';
};

export interface ReportStatusBadgeVM {
  text: string;
  glyph: StatusGlyphType;
}

export interface ReportHistoryRowVM {
  /** 穩定的列識別與連結目標（`YYYY-MM` 或 `YYYY`）。 */
  period: string;
  netIncomeText: string;
  netIncomeTone: MoneyTone;
  equityText: string;
  endingCashText: string;
  /** 非已關帳才顯示；已關帳（預設定案狀態）為 null。 */
  status: ReportStatusBadgeVM | null;
}

export interface ReportLatestVM {
  period: string;
  display: string;
  netIncomeText: string;
  netIncomeTone: MoneyTone;
  equityText: string;
  endingCashText: string;
}

export interface ReportHistoryVM {
  rows: ReportHistoryRowVM[];
  latest: ReportLatestVM | null;
}

interface MonthFacts {
  netIncome?: number;
  equity?: number;
  endingCash?: number;
}

const collectMonthFacts = (reports: FinancialReport[]): Map<string, MonthFacts> => {
  const facts = new Map<string, MonthFacts>();
  for (const report of reports) {
    const entry = facts.get(report.yearMonth) ?? {};
    switch (report.type) {
      case ReportType.INCOME_STATEMENT:
        entry.netIncome = report.data.netIncome;
        break;
      case ReportType.BALANCE_SHEET:
        entry.equity = report.data.equity.total;
        break;
      case ReportType.CASH_FLOW:
        entry.endingCash = report.data.actualBalance;
        break;
    }
    facts.set(report.yearMonth, entry);
  }
  return facts;
};

const statusBadgeFor = (
  yearMonth: string,
  statusByMonth: Map<string, FinancialPeriod['status']>,
): ReportStatusBadgeVM | null => {
  const status = statusByMonth.get(yearMonth);
  // 已關帳是預設（定案）狀態，不標記，讓預設狀態在視覺上保持安靜。
  if (status === 'CLOSED') return null;
  if (status !== undefined) {
    return {
      text: DASHBOARD_CLOSE_STATUS_TEXT_MAP[status],
      glyph: DASHBOARD_CLOSE_STATUS_GLYPHS[status],
    };
  }
  return {
    text: DASHBOARD_CLOSE_NO_RECORD.statusText,
    glyph: DASHBOARD_CLOSE_NO_RECORD.glyphType,
  };
};

const monthRow = (
  yearMonth: string,
  facts: MonthFacts | undefined,
  statusByMonth: Map<string, FinancialPeriod['status']>,
): ReportHistoryRowVM => ({
  period: yearMonth,
  netIncomeText: formatCurrencyOrDash(facts?.netIncome ?? null),
  netIncomeTone: monthTone(facts?.netIncome),
  equityText: formatCurrencyOrDash(facts?.equity ?? null),
  endingCashText: formatCurrencyOrDash(facts?.endingCash ?? null),
  status: statusBadgeFor(yearMonth, statusByMonth),
});

/** 年列：淨利為該年加總；權益與現金取該年最後一份有值的月報表。 */
const yearRow = (
  year: string,
  monthKeys: string[],
  factsByMonth: Map<string, MonthFacts>,
): ReportHistoryRowVM => {
  const monthsOfYear = monthKeys.filter((month) => month.startsWith(`${year}-`)).sort();
  let netIncome: number | undefined;
  let equity: number | undefined;
  let endingCash: number | undefined;
  for (const month of monthsOfYear) {
    const facts = factsByMonth.get(month);
    if (!facts) continue;
    if (facts.netIncome !== undefined) netIncome = (netIncome ?? 0) + facts.netIncome;
    if (facts.equity !== undefined) equity = facts.equity;
    if (facts.endingCash !== undefined) endingCash = facts.endingCash;
  }
  return {
    period: year,
    netIncomeText: formatCurrencyOrDash(netIncome ?? null),
    netIncomeTone: monthTone(netIncome),
    equityText: formatCurrencyOrDash(equity ?? null),
    endingCashText: formatCurrencyOrDash(endingCash ?? null),
    // 年為期間粒度，不是財務期間，因此沒有單一的關帳狀態可標。
    status: null,
  };
};

/**
 * 歷史骨幹＝財務期間與「有已產生報表的月份」的聯集：關帳上線前就存在的報表
 * 月份不會消失。月／年為同一份資料的兩種粒度。
 */
export const buildReportHistoryVM = (
  reports: FinancialReport[],
  periods: FinancialPeriod[],
  granularity: ReportGranularity,
): ReportHistoryVM => {
  const factsByMonth = collectMonthFacts(reports);
  const statusByMonth = new Map(periods.map((period) => [period.yearMonth, period.status]));

  const reportMonths = [...factsByMonth.keys()];
  const periodMonths = periods.map((period) => period.yearMonth);
  const monthKeysNewestFirst = [...new Set([...reportMonths, ...periodMonths])].sort().reverse();

  const rows =
    granularity === 'MONTHLY'
      ? monthKeysNewestFirst.map((month) => monthRow(month, factsByMonth.get(month), statusByMonth))
      : [...new Set(monthKeysNewestFirst.map((month) => month.slice(0, 4)))]
          .sort()
          .reverse()
          .map((year) => yearRow(year, monthKeysNewestFirst, factsByMonth));

  return { rows, latest: buildLatest(reports, factsByMonth, periodMonths) };
};

/** hero：最近一份「有報表期間」的淨利；沒有報表則為 null（不顯示空值）。 */
const buildLatest = (
  reports: FinancialReport[],
  factsByMonth: Map<string, MonthFacts>,
  periodMonths: string[],
): ReportLatestVM | null => {
  const latestMonth = [...new Set([...reports.map((report) => report.yearMonth), ...periodMonths])]
    .filter((month) => factsByMonth.get(month)?.netIncome !== undefined)
    .sort()
    .at(-1);
  if (latestMonth === undefined) return null;
  const facts = factsByMonth.get(latestMonth);
  const period = parseReportPeriod(latestMonth);
  return {
    period: latestMonth,
    display: period ? formatReportPeriodDisplay(period) : latestMonth,
    netIncomeText: formatCurrencyOrDash(facts?.netIncome ?? null),
    netIncomeTone: monthTone(facts?.netIncome),
    equityText: formatCurrencyOrDash(facts?.equity ?? null),
    endingCashText: formatCurrencyOrDash(facts?.endingCash ?? null),
  };
};
