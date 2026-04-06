import { useCallback, useEffect, useState } from 'react';

import { format } from 'date-fns';

import { getUnsettledStatsUseCase } from '@/application/report/use_cases/getUnsettledStatsUseCase';
import { previewDebtSettlementsUseCase } from '@/application/settlement/use_cases/previewDebtSettlementsUseCase';
import { reportService } from '@/domains/report/reportService';
import { ReportType } from '@/domains/report/schemas';
import { useAuth } from '@/infra/contexts/useAuth';
import { reportRepository } from '@/infra/repositories/reportRepository';
import { getUnifiedLedgerCodeLabel } from '@/ui/constants/transaction';
import {
  type BalanceSheetVM,
  type CashFlowVM,
  type IncomeStatementVM,
  mapBalanceSheetToVM,
  mapCashFlowToVM,
  mapIncomeStatementToVM,
} from '@/ui/features/report/viewmodels/reportDisplay.vm';

export const useReportSettlement = (householdId: string, userEmail: string) => {
  const { currentUser, isAdmin } = useAuth();

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

  const yearMonth = `${year}-${month.toString().padStart(2, '0')}`;

  const resolveReportLabel = useCallback((code: string, fallbackLabel?: string) => {
    const resolved = getUnifiedLedgerCodeLabel(code);
    return resolved === code ? fallbackLabel || code : resolved;
  }, []);

  const fetchPreview = async () => {
    if (!householdId) return;
    setIsLoading(true);
    try {
      const [income, balance, cash] = await Promise.all([
        reportService.generateIncomeStatement(householdId, yearMonth, resolveReportLabel),
        reportService.generateBalanceSheet(householdId, yearMonth, resolveReportLabel),
        reportService.generateCashFlow(householdId, yearMonth, resolveReportLabel),
      ]);
      setPreviewData({
        incomeStatement: mapIncomeStatementToVM(income),
        balanceSheet: mapBalanceSheetToVM(balance),
        cashFlow: mapCashFlowToVM(cash),
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
      });
      setDebtNoRepaymentWarningNames(debtPreview.missingRepaymentAccountNames);

      // Check whether all active entities are settled for this month.
      const unsettled = await getUnsettledStatsUseCase.execute({
        householdId,
        auth: {
          uid: currentUser?.uid || '',
          email: currentUser?.email || undefined,
          isGlobalAdmin: isAdmin,
        },
        year,
        month,
      });

      if (unsettled.totalUnsettled > 0) {
        setUnsettledProjectNames(unsettled.unsettledProjects.map((project) => project.name));
        setUnsettledAccountNames(unsettled.unsettledAccounts.map((account) => account.name));
        setUnsettledPortfolioNames(
          unsettled.unsettledPortfolios.map((portfolio) => portfolio.name),
        );
        setUnsettledDebtNames(unsettled.unsettledDebts.map((debt) => debt.name));
        setSummary(null);
        setReportsGenerated(false);
        setIsLoading(false);
        return;
      }

      setUnsettledProjectNames([]);
      setUnsettledAccountNames([]);
      setUnsettledPortfolioNames([]);
      setUnsettledDebtNames([]);

      // 2. Load financial summary
      const [incomeStmt, balanceSheet] = await Promise.all([
        reportService.generateIncomeStatement(householdId, yearMonth, resolveReportLabel),
        reportService.generateBalanceSheet(householdId, yearMonth, resolveReportLabel),
      ]);

      setSummary({
        totalRevenue: incomeStmt.incomeTotal,
        totalExpense: incomeStmt.expenseTotal,
        netIncome: incomeStmt.netIncome,
        netWorth: balanceSheet.assets.total - balanceSheet.liabilities.total,
      });

      // 3. Check for existing reports
      const existingReports = await Promise.all([
        reportRepository.getReport(householdId, yearMonth, ReportType.INCOME_STATEMENT),
        reportRepository.getReport(householdId, yearMonth, ReportType.BALANCE_SHEET),
        reportRepository.getReport(householdId, yearMonth, ReportType.CASH_FLOW),
      ]);

      if (existingReports.every((report) => report !== null)) {
        setReportsGenerated(true);
        setReportTimestamps({
          incomeStatement: format(existingReports[0]!.updatedAt, 'HH:mm'),
          balanceSheet: format(existingReports[1]!.updatedAt, 'HH:mm'),
          cashFlow: format(existingReports[2]!.updatedAt, 'HH:mm'),
        });
      } else {
        setReportsGenerated(false);
        setReportTimestamps({});
      }
    } catch (err) {
      console.error('Error loading report settlement status:', err);
      setError('無法載入結算狀態，請稍後再試。');
    } finally {
      setIsLoading(false);
    }
  }, [
    householdId,
    year,
    month,
    yearMonth,
    currentUser?.uid,
    currentUser?.email,
    isAdmin,
    resolveReportLabel,
  ]);

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
      const results = await reportService.generateMonthlyFinancialReports(
        householdId,
        yearMonth,
        userEmail,
        resolveReportLabel,
      );

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
