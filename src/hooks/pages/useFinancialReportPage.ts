import { useCallback, useEffect, useState } from 'react';

import type {
  BalanceSheetView,
  CashFlowView,
  IncomeStatementView,
} from '@/domains/finance/mappers/reportToView';
import {
  mapToBalanceSheetView,
  mapToCashFlowView,
  mapToIncomeStatementView,
} from '@/domains/finance/mappers/reportToView';
import { financialReportService } from '@/services/financialReportService';

type ReportType = 'income_statement' | 'balance_sheet' | 'cash_flow';
type ReportView = IncomeStatementView | BalanceSheetView | CashFlowView;

interface UseFinancialReportPageProps {
  householdId: string | undefined;
  reportType: ReportType;
}

interface UseFinancialReportPageReturn<T extends ReportView> {
  report: T | null;
  loading: boolean;
  error: string | null;
  currentDate: Date;
  handlePreviousMonth: () => void;
  handleNextMonth: () => void;
  handleCurrentMonth: () => void;
  isCurrentMonth: () => boolean;
  formatMonthYear: (date: Date) => string;
  reload: () => void;
}

export function useFinancialReportPage<T extends ReportView>({
  householdId,
  reportType,
}: UseFinancialReportPageProps): UseFinancialReportPageReturn<T> {
  const [report, setReport] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const getErrorMessage = (type: ReportType): string => {
    const messages = {
      income_statement: '此月份尚未生成損益表，請先至報表頁面生成。',
      balance_sheet: '此月份尚未生成資產負債表，請先至報表頁面生成。',
      cash_flow: '此月份尚未生成現金流量表，請先至報表頁面生成。',
    };
    return messages[type];
  };

  const mapReportToView = useCallback(
    (reportData: Parameters<typeof mapToIncomeStatementView>[0]): T | null => {
      switch (reportType) {
        case 'income_statement':
          return mapToIncomeStatementView(reportData) as T | null;
        case 'balance_sheet':
          return mapToBalanceSheetView(reportData) as T | null;
        case 'cash_flow':
          return mapToCashFlowView(reportData) as T | null;
        default:
          return null;
      }
    },
    [reportType],
  );

  const loadReport = useCallback(
    async (date: Date) => {
      if (!householdId) return;

      setLoading(true);
      setError(null);

      try {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;

        const reportData = await financialReportService.getFinancialReport(
          householdId,
          reportType,
          year,
          month,
        );

        if (reportData) {
          const viewData = mapReportToView(reportData);
          setReport(viewData);
        } else {
          setReport(null);
          setError(getErrorMessage(reportType));
        }
      } catch (err) {
        console.error(`Failed to load ${reportType}:`, err);
        setError('無法載入報表，請稍後再試。');
      } finally {
        setLoading(false);
      }
    },
    [householdId, reportType, mapReportToView],
  );

  useEffect(() => {
    loadReport(currentDate);
  }, [currentDate, householdId, loadReport]);

  const handlePreviousMonth = useCallback(() => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    setCurrentDate(newDate);
  }, [currentDate]);

  const handleNextMonth = useCallback(() => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    setCurrentDate(newDate);
  }, [currentDate]);

  const handleCurrentMonth = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const isCurrentMonth = useCallback(() => {
    const now = new Date();
    return (
      currentDate.getFullYear() === now.getFullYear() && currentDate.getMonth() === now.getMonth()
    );
  }, [currentDate]);

  const formatMonthYear = useCallback((date: Date) => {
    return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
  }, []);

  const reload = useCallback(() => {
    loadReport(currentDate);
  }, [loadReport, currentDate]);

  return {
    report,
    loading,
    error,
    currentDate,
    handlePreviousMonth,
    handleNextMonth,
    handleCurrentMonth,
    isCurrentMonth,
    formatMonthYear,
    reload,
  };
}
