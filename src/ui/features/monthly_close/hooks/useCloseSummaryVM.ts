import { useMemo } from 'react';

import { type SecuritiesTradeInput } from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';
import { type SettlementReadiness } from '@/application/report/use_cases/getSettlementReadinessUseCase';
import { type CompletenessActivity } from '@/application/settlement/use_cases/checkSettlementCompletenessUseCase';
import { type ReportDriftModel } from '@/domains/report/reportDrift';
import { REPORT_VIEW_TITLES } from '@/ui/constants/report/reportViewLabels';

import {
  type FinancialDriftVM,
  type FinancialResultVM,
  mapCloseSummary,
  mapReadinessVM,
} from '../mappers/closeSummary.mappers';
import { type MonthlyClosePageVM } from '../viewmodels/monthlyClose.vm';

interface UseCloseSummaryVMArgs {
  readiness: SettlementReadiness | null;
  /** The drift-annotated statements; Step 8's five figures are read from its trees. */
  reportDrift: ReportDriftModel;
  /** CLOSED renders the persisted record read-only; drift is only compared while live. */
  isClosed: boolean;
  transactionIssues: { transactionId: string; description: string; reason: string }[];
  securities: { buys: SecuritiesTradeInput[]; sells: SecuritiesTradeInput[] };
  anomalies: CompletenessActivity[];
  pageVM: MonthlyClosePageVM;
  reportsPersisted: boolean | null;
}

/**
 * Derives the readiness and close-summary view models that Steps 7-8 render,
 * from the evidence each owning stage hook provides, plus the five financial
 * figures' drift annotations (Report Drift).
 */
export const useCloseSummaryVM = ({
  readiness,
  reportDrift,
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
    readiness,
    securities.buys.length,
    securities.sells.length,
    transactionIssues,
    zeroActivityNames,
  ]);

  // Step 8's five figures are the drift model's tree nodes, not a second comparison.
  const financialResult = useMemo<FinancialResultVM>(
    () => ({
      totalAssets: reportDrift.balanceSheet?.assets.total.amount ?? null,
      totalLiabilities: reportDrift.balanceSheet?.liabilities.total.amount ?? null,
      equity: reportDrift.balanceSheet?.equity.total.amount ?? null,
      netIncome: reportDrift.incomeStatement?.netIncome.amount ?? null,
      netCashFlow: reportDrift.cashFlow?.netCashChange.amount ?? null,
    }),
    [reportDrift],
  );

  const financialDrift = useMemo<FinancialDriftVM | undefined>(() => {
    if (isClosed) return undefined;
    const drift: FinancialDriftVM = {};
    if (reportDrift.balanceSheet) {
      drift.totalAssets = reportDrift.balanceSheet.assets.total;
      drift.totalLiabilities = reportDrift.balanceSheet.liabilities.total;
      drift.equity = reportDrift.balanceSheet.equity.total;
    }
    if (reportDrift.incomeStatement) drift.netIncome = reportDrift.incomeStatement.netIncome;
    if (reportDrift.cashFlow) drift.netCashFlow = reportDrift.cashFlow.netCashChange;
    return drift;
  }, [isClosed, reportDrift]);

  const reportResults = useMemo(
    () =>
      (['INCOME_STATEMENT', 'BALANCE_SHEET', 'CASH_FLOW'] as const).map((viewId) => ({
        title: REPORT_VIEW_TITLES[viewId],
        isGenerated: reportsPersisted,
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
