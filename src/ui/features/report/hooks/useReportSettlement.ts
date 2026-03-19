import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { reportService } from '@/domains/report/reportService';
import { reportRepository } from '@/infra/repositories/reportRepository';
import { ReportType } from '@/domains/report/schemas';
import { projectRepository } from '@/infra/repositories/projectRepository';

export const useReportSettlement = (householdId: string, userEmail: string) => {
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
  const [previewData, setPreviewData] = useState<{
    incomeStatement: any;
    balanceSheet: any;
    cashFlow: any;
  } | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const yearMonth = `${year}-${month.toString().padStart(2, '0')}`;

  const fetchPreview = async () => {
    if (!householdId) return;
    setIsLoading(true);
    try {
      const [income, balance, cash] = await Promise.all([
        reportService.generateIncomeStatement(householdId, yearMonth),
        reportService.generateBalanceSheet(householdId, yearMonth),
        reportService.generateCashFlow(householdId, yearMonth),
      ]);
      setPreviewData({ incomeStatement: income, balanceSheet: balance, cashFlow: cash });
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
      // 1. Check if ANY project snapshots exist for this month
      // We list projects and check if any has a snapshot for this month
      const projects = await projectRepository.getProjects(householdId);
      const snapshotCheck = await Promise.all(
        projects.map(p => projectRepository.getSnapshot(householdId, p.id, yearMonth))
      );
      
      const hasSnapshots = snapshotCheck.some(s => s !== null);
      
      if (!hasSnapshots) {
        setSummary(null);
        setReportsGenerated(false);
        setIsLoading(false);
        return;
      }

      // 2. Load financial summary
      const [incomeStmt, balanceSheet] = await Promise.all([
        reportService.generateIncomeStatement(householdId, yearMonth),
        reportService.generateBalanceSheet(householdId, yearMonth),
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

      if (existingReports.every(r => r !== null)) {
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
  }, [householdId, yearMonth]);

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
        userEmail
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
    generateReports,
    refresh: loadStatus,
    previewData,
    isPreviewing,
    setIsPreviewing,
    fetchPreview,
  };
};
