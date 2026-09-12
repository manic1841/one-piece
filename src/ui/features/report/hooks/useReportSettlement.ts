import { useCallback, useEffect, useState } from 'react';

import { format } from 'date-fns';

import { getSettlementReadinessUseCase } from '@/application/report/use_cases/getSettlementReadinessUseCase';
import { generateFinancialReportsUseCase } from '@/application/report/use_cases/generateFinancialReportsUseCase';
import { previewFinancialReportsWorkflow } from '@/application/report/use_cases/previewFinancialReportsWorkflow';
import { previewDebtSettlementsUseCase } from '@/application/settlement/use_cases/previewDebtSettlementsUseCase';
import { getUnifiedLedgerCodeLabel } from '@/ui/constants/transaction';
import {
  type BalanceSheetVM,
  type CashFlowVM,
  type IncomeStatementVM,
  mapBalanceSheetToVM,
  mapCashFlowToVM,
  mapIncomeStatementToVM,
} from '@/ui/features/report/viewmodels/reportDisplay.vm';
import { useAuthContext } from '@/ui/hooks/useAuthContext';

export const useReportSettlement = (householdId: string, userEmail: string) => {
  const auth = useAuthContext();

  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [summary, setSummary] = useState<{
    totalRevenue: number;
    totalExpense: number;
    netIncome: number;
    netWorth: number;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
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
  const [previewData, setPreviewData] = useState<{
    incomeStatement: IncomeStatementVM;
    balanceSheet: BalanceSheetVM;
    cashFlow: CashFlowVM;
  } | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const resolveReportLabel = useCallback((code: string, fallbackLabel?: string) => {
    const resolved = getUnifiedLedgerCodeLabel(code);
    return resolved === code ? fallbackLabel || code : resolved;
  }, []);

  const fetchPreview = async () => {
    if (!householdId) return;
    setIsLoading(true);
    try {
      const preview = await previewFinancialReportsWorkflow.execute({
        householdId,
        auth,
        year,
        month,
        labelResolver: resolveReportLabel,
      });
      setPreviewData({
        incomeStatement: mapIncomeStatementToVM(preview.incomeStatement),
        balanceSheet: mapBalanceSheetToVM(preview.balanceSheet),
        cashFlow: mapCashFlowToVM(preview.cashFlow),
      });
    } catch (err) {
      console.error('Error fetching preview data:', err);
      setError('無法載入預覽數據。');
    } finally {
      setIsLoading(false);
    }
  };

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

  const generateReports = async () => {
    if (!householdId || !userEmail || !summary) return;

    if (reportsGenerated) {
      if (!window.confirm('報表已存在，確定要重新產生嗎？這將會覆蓋現有數據。')) {
        return;
      }
    }

    setError('');
    setIsGenerating(true);

    try {
      const results = await generateFinancialReportsUseCase.execute({
        householdId,
        auth,
        year,
        month,
        labelResolver: resolveReportLabel,
      });

      setReportTimestamps({
        incomeStatement: format(results.timestamp, 'HH:mm'),
        balanceSheet: format(results.timestamp, 'HH:mm'),
        cashFlow: format(results.timestamp, 'HH:mm'),
      });
      setReportsGenerated(true);
    } catch (err) {
      console.error('Error generating reports:', err);
      setError('報表產生失敗，請務必先完成專案結算並檢查資料正確性。');
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    year,
    month,
    setYear,
    setMonth,
    summary,
    isGenerating,
    reportsGenerated,
    reportTimestamps,
    error,
    isLoading,
    unsettledProjectNames,
    unsettledAccountNames,
    unsettledPortfolioNames,
    unsettledDebtNames,
    debtNoRepaymentWarningNames,
    generateReports,
    refresh: loadStatus,
    previewData,
    isPreviewing,
    setIsPreviewing,
    fetchPreview,
  };
};
