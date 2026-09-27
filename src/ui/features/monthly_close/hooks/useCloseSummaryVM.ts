import { useEffect, useMemo, useState } from 'react';

import { type SecuritiesTradeInput } from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';
import { validateMonthTransactionsUseCase } from '@/application/monthly_close/use_cases/validateMonthTransactionsUseCase';
import { type SettlementReadiness } from '@/application/report/use_cases/getSettlementReadinessUseCase';
import { type PreviewFinancialReportsResult } from '@/application/report/use_cases/previewFinancialReportsWorkflow';
import { type CompletenessActivity } from '@/application/settlement/use_cases/checkSettlementCompletenessUseCase';
import { REPORT_VIEW_TITLES } from '@/ui/constants/report/reportViewLabels';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';

import { mapCloseSummary, mapReadinessVM } from '../mappers/closeSummary.mappers';
import { type MonthlyClosePageVM } from '../viewmodels/monthlyClose.vm';

interface UseCloseSummaryVMArgs {
  householdId: string;
  selectedYearMonth: string;
  readiness: SettlementReadiness | null;
  reportBundle: PreviewFinancialReportsResult | null;
  transactionIssues: { transactionId: string; description: string; reason: string }[];
  securities: { buys: SecuritiesTradeInput[]; sells: SecuritiesTradeInput[] };
  anomalies: CompletenessActivity[];
  pageVM: MonthlyClosePageVM;
  reportsPersisted: boolean | null;
  refreshStageEvidence: () => Promise<void>;
}

/**
 * Derives the readiness and close-summary view models that Steps 7-8 render,
 * including the checked-transaction count they both consume.
 */
export const useCloseSummaryVM = ({
  householdId,
  selectedYearMonth,
  readiness,
  reportBundle,
  transactionIssues,
  securities,
  anomalies,
  pageVM,
  reportsPersisted,
  refreshStageEvidence,
}: UseCloseSummaryVMArgs) => {
  const auth = useAuthIdentity();
  const zeroActivityNames = anomalies.map((activity) => activity.name);
  const [checkedCount, setCheckedCount] = useState(0);

  // Checked count rides the same refresh as the stage evidence, so Step 7's
  // N/M count never goes stale after a mid-close securities re-confirm.
  useEffect(() => {
    if (!householdId || !selectedYearMonth) return;
    const refresh = async () => {
      const result = await validateMonthTransactionsUseCase.execute({
        householdId,
        year: Number(selectedYearMonth.slice(0, 4)),
        month: Number(selectedYearMonth.slice(5, 7)),
        auth,
      });
      setCheckedCount(result.checkedCount);
    };
    void refresh();
  }, [auth, householdId, refreshStageEvidence, selectedYearMonth]);

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

  const financialResult = useMemo(
    () => ({
      totalAssets: reportBundle?.balanceSheet.assets.total ?? null,
      totalLiabilities: reportBundle?.balanceSheet.liabilities.total ?? null,
      equity: reportBundle?.balanceSheet.equity.total ?? null,
      netIncome: reportBundle?.incomeStatement.netIncome ?? null,
      netCashFlow: reportBundle?.cashFlow.netCashChange ?? null,
    }),
    [reportBundle],
  );

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
        reports: reportResults,
      }),
    [financialResult, pageVM.stages, reportResults],
  );

  return { readinessVM, financialResult, closeSummaryVM };
};
