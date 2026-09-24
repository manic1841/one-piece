import { useCallback, useEffect, useRef, useState } from 'react';

import { getSettlementStatusWorkflow } from '@/application/report/use_cases/getSettlementStatusWorkflow';
import { getUnifiedLedgerCodeLabel } from '@/ui/constants/transaction';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

const LOAD_ERROR = '無法載入結算狀態，請稍後再試。';

export const useReportSettlement = (householdId: string) => {
  const auth = useAuthIdentity();

  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [summary, setSummary] = useState<{
    totalRevenue: number;
    totalExpense: number;
    netIncome: number;
    netWorth: number;
  } | null>(null);
  const [reportsGenerated, setReportsGenerated] = useState(false);
  const [reportTimestamps, setReportTimestamps] = useState<{
    incomeStatement?: string;
    balanceSheet?: string;
    cashFlow?: string;
  }>({});
  const { loading: isLoading, errorMessage, run } = useLoadingTask();
  const inFlightRef = useRef<AbortController | null>(null);
  const [unsettledProjectNames, setUnsettledProjectNames] = useState<string[]>([]);
  const [unsettledAccountNames, setUnsettledAccountNames] = useState<string[]>([]);
  const [unsettledPortfolioNames, setUnsettledPortfolioNames] = useState<string[]>([]);
  const [unsettledDebtNames, setUnsettledDebtNames] = useState<string[]>([]);
  const [debtNoRepaymentWarningNames, setDebtNoRepaymentWarningNames] = useState<string[]>([]);

  const resolveReportLabel = useCallback((code: string, fallbackLabel?: string) => {
    const resolved = getUnifiedLedgerCodeLabel(code);
    return resolved === code ? fallbackLabel || code : resolved;
  }, []);

  const loadStatus = useCallback(async () => {
    if (!householdId) return;

    // Paging months faster than the workflow completes supersedes the previous
    // load; without this the slower, older month could land last and win.
    inFlightRef.current?.abort();
    const controller = new AbortController();
    inFlightRef.current = controller;

    await run(
      async () => {
        try {
          return await getSettlementStatusWorkflow.execute({
            householdId,
            auth,
            year,
            month,
            labelResolver: resolveReportLabel,
          });
        } catch (caught) {
          // The surface shows a canned message, so the copy is decided here and
          // the mechanism only carries the value (see ui-layer-architecture:
          // Error Wording Stays With The Consumer). The raw cause is logged so it
          // is not lost.
          console.error('Error loading report settlement status:', caught);
          throw new Error(LOAD_ERROR);
        }
      },
      {
        signal: controller.signal,
        // A failed run writes nothing here; the surface shows the canned message
        // from the mechanism's error channel instead.
        writeBack: (result) => {
          if (!result.ok) return;

          const { debtPreview, readiness, reports } = result.value;
          setDebtNoRepaymentWarningNames(debtPreview.missingRepaymentAccountNames);

          if (!readiness.isReady) {
            setUnsettledProjectNames(readiness.unsettledProjects.map((project) => project.name));
            setUnsettledAccountNames(readiness.unsettledAccounts.map((account) => account.name));
            setUnsettledPortfolioNames(
              readiness.unsettledPortfolios.map((portfolio) => portfolio.name),
            );
            setUnsettledDebtNames(readiness.unsettledDebts.map((debt) => debt.name));
            setSummary(null);
            setReportsGenerated(false);
            return;
          }

          setUnsettledProjectNames([]);
          setUnsettledAccountNames([]);
          setUnsettledPortfolioNames([]);
          setUnsettledDebtNames([]);

          // The workflow only computes the preview once readiness says the month
          // is settled, so there is nothing to write back when it is absent.
          if (!reports) return;

          setSummary({
            totalRevenue: reports.incomeStatement.incomeTotal,
            totalExpense: reports.incomeStatement.expenseTotal,
            netIncome: reports.incomeStatement.netIncome,
            netWorth: reports.balanceSheet.assets.total - reports.balanceSheet.liabilities.total,
          });

          setReportsGenerated(reports.isPersisted);
          setReportTimestamps(reports.timestamps);
        },
      },
    );
  }, [householdId, year, month, auth, resolveReportLabel, run]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  return {
    year,
    month,
    setYear,
    setMonth,
    summary,
    reportsGenerated,
    reportTimestamps,
    error: errorMessage ?? '',
    isLoading,
    unsettledProjectNames,
    unsettledAccountNames,
    unsettledPortfolioNames,
    unsettledDebtNames,
    debtNoRepaymentWarningNames,
    refresh: loadStatus,
  };
};
