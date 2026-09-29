import { useMemo } from 'react';

import { type SecuritiesTradeInput } from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';
import { type SettlementReadiness } from '@/application/report/use_cases/getSettlementReadinessUseCase';
import { type StoredReportsBundle } from '@/application/report/use_cases/getStoredReportsBundleUseCase';
import { type PreviewFinancialReportsResult } from '@/application/report/use_cases/previewFinancialReportsWorkflow';
import { type CompletenessActivity } from '@/application/settlement/use_cases/checkSettlementCompletenessUseCase';
import { type ReportTotals, diffReportTotals } from '@/domains/report/reportDrift';
import { REPORT_VIEW_TITLES } from '@/ui/constants/report/reportViewLabels';

import {
  type FinancialDriftVM,
  mapCloseSummary,
  mapReadinessVM,
} from '../mappers/closeSummary.mappers';
import { type MonthlyClosePageVM } from '../viewmodels/monthlyClose.vm';

interface UseCloseSummaryVMArgs {
  readiness: SettlementReadiness | null;
  /** The validated-transaction count TRANSACTION_VALIDATION's stage hook owns. */
  checkedCount: number;
  reportBundle: PreviewFinancialReportsResult | null;
  persistedBundle: StoredReportsBundle | null;
  /** CLOSED renders the persisted record read-only; drift is only compared while live. */
  isClosed: boolean;
  transactionIssues: { transactionId: string; description: string; reason: string }[];
  securities: { buys: SecuritiesTradeInput[]; sells: SecuritiesTradeInput[] };
  anomalies: CompletenessActivity[];
  pageVM: MonthlyClosePageVM;
  reportsPersisted: boolean | null;
}

const EMPTY_FINANCIAL_RESULT = {
  totalAssets: null,
  totalLiabilities: null,
  equity: null,
  netIncome: null,
  netCashFlow: null,
} as const;

const toTotals = (
  bundle: PreviewFinancialReportsResult | StoredReportsBundle | null,
): ReportTotals | null => {
  if (!bundle?.incomeStatement || !bundle.balanceSheet || !bundle.cashFlow) return null;
  return {
    totalAssets: bundle.balanceSheet.assets.total,
    totalLiabilities: bundle.balanceSheet.liabilities.total,
    equity: bundle.balanceSheet.equity.total,
    netIncome: bundle.incomeStatement.netIncome,
    netCashFlow: bundle.cashFlow.netCashChange,
  };
};

/**
 * Derives the readiness and close-summary view models that Steps 7-8 render,
 * from the evidence each owning stage hook provides, plus the five financial
 * figures' drift annotations (Report Drift).
 */
export const useCloseSummaryVM = ({
  readiness,
  checkedCount,
  reportBundle,
  persistedBundle,
  isClosed,
  transactionIssues,
  securities,
  anomalies,
  pageVM,
  reportsPersisted,
}: UseCloseSummaryVMArgs) => {
  // Memoized so a re-render that did not change the anomalies does not
  // invalidate the readiness projection that reads it.
  const zeroActivityNames = useMemo(() => anomalies.map((activity) => activity.name), [anomalies]);

  const readinessVM = useMemo(() => {
    if (!readiness) return null;
    return mapReadinessVM({
      totalAccounts: readiness.totalAccounts,
      confirmedAccounts: readiness.totalAccounts - readiness.unsettledAccounts.length,
      totalTransactions: checkedCount,
      transactionIssues,
      totalSecurities: securities.buys.length + securities.sells.length,
      totalPortfolios: readiness.totalPortfolios,
      confirmedPortfolios: readiness.totalPortfolios - readiness.unsettledPortfolios.length,
      totalProjects: readiness.totalProjects,
      confirmedProjects: readiness.totalProjects - readiness.unsettledProjects.length,
      totalDebts: readiness.totalDebts,
      confirmedDebts: readiness.totalDebts - readiness.unsettledDebts.length,
      zeroActivityNames,
      anomalies: [],
    });
  }, [
    checkedCount,
    readiness,
    securities.buys.length,
    securities.sells.length,
    transactionIssues,
    zeroActivityNames,
  ]);

  const previewTotals = useMemo(() => toTotals(reportBundle), [reportBundle]);
  const persistedTotals = useMemo(() => toTotals(persistedBundle), [persistedBundle]);

  const financialResult = useMemo(() => {
    // CLOSED renders the frozen persisted record; every other status renders the
    // live preview, so a reopened period with leftover files keeps comparing.
    const source = isClosed ? persistedTotals : previewTotals;
    return source ?? EMPTY_FINANCIAL_RESULT;
  }, [isClosed, persistedTotals, previewTotals]);

  const financialDrift = useMemo<FinancialDriftVM | undefined>(() => {
    if (isClosed || !previewTotals || !persistedTotals) return undefined;
    return diffReportTotals(previewTotals, persistedTotals);
  }, [isClosed, persistedTotals, previewTotals]);

  const reportResults = useMemo(
    () =>
      (['INCOME_STATEMENT', 'BALANCE_SHEET', 'CASH_FLOW'] as const).map((viewId) => ({
        title: REPORT_VIEW_TITLES[viewId],
        isGenerated: reportsPersisted ?? false,
      })),
    [reportsPersisted],
  );

  const closeSummaryVM = useMemo(
    () =>
      mapCloseSummary({
        stages: pageVM.stages.map((stage) => ({
          stageId: stage.stageId,
          label: stage.label,
          isCompleted: stage.isCompleted,
          dataText: null,
        })),
        financialResult,
        financialDrift,
        reports: reportResults,
      }),
    [financialDrift, financialResult, pageVM.stages, reportResults],
  );

  return { readinessVM, financialResult, closeSummaryVM };
};
