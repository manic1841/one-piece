import type { CloseStageId } from '@/domains/financial_period/schemas';
import { CLOSE_STAGE_LABELS, MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';

export const READINESS_CHECK_IDS = [
  'ACCOUNT_BALANCE',
  'TRANSACTION_VALIDATION',
  'SECURITIES_TRADE',
  'PORTFOLIO_CASH_FLOW',
  'PROJECT_SETTLEMENT',
  'DEBT_REPAYMENT',
] as const;

export type ReadinessCheckId = (typeof READINESS_CHECK_IDS)[number];

export interface ReadinessCheckVM {
  id: ReadinessCheckId;
  label: string;
  passed: boolean;
  countText: string;
}

export interface ReadinessExceptionVM {
  label: string;
  detail: string;
  stageId: CloseStageId;
}

export interface ReadinessVM {
  isReady: boolean;
  checks: ReadinessCheckVM[];
  exceptions: ReadinessExceptionVM[];
}

export interface ReadinessInput {
  totalAccounts: number;
  confirmedAccounts: number;
  totalTransactions: number;
  transactionIssues: { transactionId: string; description: string; reason: string }[];
  totalSecurities: number;
  totalPortfolios: number;
  confirmedPortfolios: number;
  totalProjects: number;
  confirmedProjects: number;
  totalDebts: number;
  confirmedDebts: number;
  zeroActivityNames: string[];
  anomalies: string[];
}

export const CLOSE_ACTIVITY_STATUS = {
  CONFIRMED: 'CONFIRMED',
  NOT_CONFIRMED: 'NOT_CONFIRMED',
  CLOSED: 'CLOSED',
} as const;
export type CloseActivityStatus =
  (typeof CLOSE_ACTIVITY_STATUS)[keyof typeof CLOSE_ACTIVITY_STATUS];

export interface CloseActivityRowVM {
  stepText: string;
  status: CloseActivityStatus;
  dataText: string | null;
}

export interface FinancialResultVM {
  totalAssets: number | null;
  totalLiabilities: number | null;
  equity: number | null;
  netIncome: number | null;
  netCashFlow: number | null;
}

export interface ReportResultVM {
  title: string;
  isGenerated: boolean;
}

export interface CloseSummaryVM {
  activity: CloseActivityRowVM[];
  financial: FinancialResultVM;
  reports: ReportResultVM[];
  reportsGeneratedCount: number;
}

export interface CloseSummaryInput {
  yearMonth: string;
  stages: {
    stageId: CloseStageId;
    label: string;
    isCompleted: boolean;
    dataText: string | null;
  }[];
  financialResult: FinancialResultVM;
  reports: ReportResultVM[];
}

const padStep = (value: number): string => value.toString().padStart(2, '0');

const snapshotCheck = (
  id: ReadinessCheckId,
  confirmed: number,
  total: number,
): ReadinessCheckVM => ({
  id,
  label: CLOSE_STAGE_LABELS[id],
  passed: confirmed === total,
  countText: `${confirmed} / ${total}`,
});

export const mapReadinessVM = (input: ReadinessInput): ReadinessVM => {
  const exceptions: ReadinessExceptionVM[] = [];

  // Securities allow an empty confirm (ADR-0052): the check reports the
  // record count and always passes; the empty-stage warning stays a
  // pre-submit UI concern, not a readiness blocker.
  const securitiesCheck: ReadinessCheckVM = {
    id: 'SECURITIES_TRADE',
    label: CLOSE_STAGE_LABELS.SECURITIES_TRADE,
    passed: true,
    countText: `${input.totalSecurities}`,
  };

  const checks: ReadinessCheckVM[] = [
    snapshotCheck('ACCOUNT_BALANCE', input.confirmedAccounts, input.totalAccounts),
    {
      id: 'TRANSACTION_VALIDATION',
      label: CLOSE_STAGE_LABELS.TRANSACTION_VALIDATION,
      passed: input.transactionIssues.length === 0,
      countText: `${input.totalTransactions}`,
    },
    securitiesCheck,
    snapshotCheck('PORTFOLIO_CASH_FLOW', input.confirmedPortfolios, input.totalPortfolios),
    snapshotCheck('PROJECT_SETTLEMENT', input.confirmedProjects, input.totalProjects),
    snapshotCheck('DEBT_REPAYMENT', input.confirmedDebts, input.totalDebts),
  ];

  if (input.confirmedAccounts < input.totalAccounts) {
    exceptions.push({
      label: CLOSE_STAGE_LABELS.ACCOUNT_BALANCE,
      detail: `${input.totalAccounts - input.confirmedAccounts} 個帳戶尚未確認餘額`,
      stageId: 'ACCOUNT_BALANCE',
    });
  }
  for (const issue of input.transactionIssues) {
    exceptions.push({
      label: CLOSE_STAGE_LABELS.TRANSACTION_VALIDATION,
      detail: issue.description ? `${issue.description}：${issue.reason}` : issue.reason,
      stageId: 'TRANSACTION_VALIDATION',
    });
  }
  if (!securitiesCheck.passed) {
    exceptions.push({
      label: CLOSE_STAGE_LABELS.SECURITIES_TRADE,
      detail: '尚未有任何證券或融資紀錄',
      stageId: 'SECURITIES_TRADE',
    });
  }
  if (input.confirmedPortfolios < input.totalPortfolios) {
    exceptions.push({
      label: CLOSE_STAGE_LABELS.PORTFOLIO_CASH_FLOW,
      detail: `${input.totalPortfolios - input.confirmedPortfolios} 個 Portfolio 尚未確認金流`,
      stageId: 'PORTFOLIO_CASH_FLOW',
    });
  }
  if (input.confirmedProjects < input.totalProjects) {
    exceptions.push({
      label: CLOSE_STAGE_LABELS.PROJECT_SETTLEMENT,
      detail: `${input.totalProjects - input.confirmedProjects} 個專案尚未結算`,
      stageId: 'PROJECT_SETTLEMENT',
    });
  }
  if (input.confirmedDebts < input.totalDebts) {
    exceptions.push({
      label: CLOSE_STAGE_LABELS.DEBT_REPAYMENT,
      detail: `${input.totalDebts - input.confirmedDebts} 筆債務尚未確認還款`,
      stageId: 'DEBT_REPAYMENT',
    });
  }
  for (const name of input.zeroActivityNames) {
    exceptions.push({
      label: MONTHLY_CLOSE_LABELS.ZERO_ACTIVITY,
      detail: name,
      stageId: 'COMPLETENESS_CHECK',
    });
  }
  for (const name of input.anomalies) {
    exceptions.push({
      label: MONTHLY_CLOSE_LABELS.ZERO_ACTIVITY,
      detail: name,
      stageId: 'COMPLETENESS_CHECK',
    });
  }

  // Zero-activity alerts pause the workflow as NEEDS_REVIEW (ADR-0050); the
  // paused stage's own confirmation is the resolution action, not a blocker.
  const hasBlockingExceptions = exceptions.some(
    (exception) => exception.stageId !== 'COMPLETENESS_CHECK',
  );

  return {
    isReady: !hasBlockingExceptions,
    checks,
    exceptions,
  };
};

export const mapCloseSummary = (input: CloseSummaryInput): CloseSummaryVM => {
  const activity = input.stages.map((stage, index) => ({
    stepText: `${padStep(index + 1)} ${stage.label}`,
    status: stage.isCompleted
      ? stage.stageId === 'CLOSE_PERIOD'
        ? CLOSE_ACTIVITY_STATUS.CLOSED
        : CLOSE_ACTIVITY_STATUS.CONFIRMED
      : CLOSE_ACTIVITY_STATUS.NOT_CONFIRMED,
    dataText: stage.dataText,
  }));

  return {
    activity,
    financial: input.financialResult,
    reports: input.reports,
    reportsGeneratedCount: input.reports.filter((report) => report.isGenerated).length,
  };
};
