import { useCallback, useEffect, useState } from 'react';

import { getSettlementReadinessUseCase } from '@/application/report/use_cases/getSettlementReadinessUseCase';
import { previewFinancialReportsWorkflow } from '@/application/report/use_cases/previewFinancialReportsWorkflow';
import { previewDebtSettlementsUseCase } from '@/application/settlement/use_cases/previewDebtSettlementsUseCase';
import { getUnifiedLedgerCodeLabel } from '@/ui/constants/transaction';
import { useAuthContext } from '@/ui/hooks/useAuthContext';

export const useReportSettlement = (householdId: string) => {
  const auth = useAuthContext();

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
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
    setIsLoading(true);
    setError('');

    try {
      const debtPreview = await previewDebtSettlementsUseCase.execute({
        householdId,
        year,
        month,
        auth,
      });
      setDebtNoRepaymentWarningNames(debtPreview.missingRepaymentAccountNames);

      // Check whether all active entities are settled for this month.
      const readiness = await getSettlementReadinessUseCase.execute({
        householdId,
        auth,
        year,
        month,
      });

      if (!readiness.isReady) {
        setUnsettledProjectNames(readiness.unsettledProjects.map((project) => project.name));
        setUnsettledAccountNames(readiness.unsettledAccounts.map((account) => account.name));
        setUnsettledPortfolioNames(
          readiness.unsettledPortfolios.map((portfolio) => portfolio.name),
        );
        setUnsettledDebtNames(readiness.unsettledDebts.map((debt) => debt.name));
        setSummary(null);
        setReportsGenerated(false);
        setIsLoading(false);
        return;
      }

      setUnsettledProjectNames([]);
      setUnsettledAccountNames([]);
      setUnsettledPortfolioNames([]);
      setUnsettledDebtNames([]);

      // 2. Load financial preview (calculation + persistence state)
      const preview = await previewFinancialReportsWorkflow.execute({
        householdId,
        auth,
        year,
        month,
        labelResolver: resolveReportLabel,
      });

      setSummary({
        totalRevenue: preview.incomeStatement.incomeTotal,
        totalExpense: preview.incomeStatement.expenseTotal,
        netIncome: preview.incomeStatement.netIncome,
        netWorth: preview.balanceSheet.assets.total - preview.balanceSheet.liabilities.total,
      });

      setReportsGenerated(preview.isPersisted);
      setReportTimestamps(preview.timestamps);
    } catch (err) {
      console.error('Error loading report settlement status:', err);
      setError('無法載入結算狀態，請稍後再試。');
    } finally {
      setIsLoading(false);
    }
  }, [householdId, year, month, auth, resolveReportLabel]);

  useEffect(() => {
    loadStatus();
  }, [householdId, year, month, loadStatus]);

  return {
    year,
    month,
    setYear,
    setMonth,
    summary,
    reportsGenerated,
    reportTimestamps,
    error,
    isLoading,
    unsettledProjectNames,
    unsettledAccountNames,
    unsettledPortfolioNames,
    unsettledDebtNames,
    debtNoRepaymentWarningNames,
    refresh: loadStatus,
  };
};
