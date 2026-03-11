import { useCallback, useEffect, useState } from 'react';

import type {
  BalanceSheetView,
  CashFlowView,
  IncomeStatementView,
} from '@/domains/finance/mappers';
import {
  mapToBalanceSheetView,
  mapToCashFlowView,
  mapToIncomeStatementView,
} from '@/domains/finance/mappers';
import { type FinancialReport, ReportType } from '@/domains/finance/types';
import { financialReportService } from '@/services/financialReportService';

type ReportTypeEnum = ReportType;
type ViewType = 'month' | 'year';
type ReportView = IncomeStatementView | BalanceSheetView | CashFlowView;

interface UseFinancialReportPageProps {
  householdId: string | undefined;
  reportType: ReportTypeEnum;
  externalDate?: Date;
  viewType?: ViewType;
}

interface UseFinancialReportPageReturn<T extends ReportView> {
  report: T | null;
  loading: boolean;
  error: string | null;
  currentDate: Date;
  viewType: ViewType;
  handlePreviousMonth: () => void;
  handleNextMonth: () => void;
  handleCurrentMonth: () => void;
  isCurrentMonth: () => boolean;
  formatMonthYear: (date: Date) => string;
  reload: () => void;
  jumpToDate: (date: Date) => void;
}

export function useFinancialReportPage<T extends ReportView>({
  householdId,
  reportType,
  externalDate,
  viewType = 'month',
}: UseFinancialReportPageProps): UseFinancialReportPageReturn<T> {
  const [report, setReport] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [internalDate, setInternalDate] = useState<Date>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d;
  });

  const currentDate = externalDate || internalDate;

  const getErrorMessage = (type: ReportTypeEnum): string => {
    const messages: Record<ReportTypeEnum, string> = {
      [ReportType.INCOME_STATEMENT]: '此月份尚未生成損益表，請先至報表頁面生成。',
      [ReportType.BALANCE_SHEET]: '此月份尚未生成資產負債表，請先至報表頁面生成。',
      [ReportType.CASH_FLOW]: '此月份尚未生成現金流量表，請先至報表頁面生成。',
    };
    return messages[type];
  };

  const mapReportToView = useCallback(
    (reportData: FinancialReport): T | null => {
      switch (reportType) {
        case ReportType.INCOME_STATEMENT:
          return mapToIncomeStatementView(reportData) as T | null;
        case ReportType.BALANCE_SHEET:
          return mapToBalanceSheetView(reportData) as T | null;
        case ReportType.CASH_FLOW:
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

        let reportsData;
        if (viewType === 'year') {
          reportsData = await financialReportService.getYearlyReports(householdId, year);
        } else {
          const singleReport = await financialReportService.getFinancialReport(
            householdId,
            reportType,
            year,
            month,
          );
          reportsData = {
            incomeStatement: reportType === ReportType.INCOME_STATEMENT ? singleReport : null,
            balanceSheet: reportType === ReportType.BALANCE_SHEET ? singleReport : null,
            cashFlow: reportType === ReportType.CASH_FLOW ? singleReport : null,
          };
        }

        type ReportDataCollection = {
          incomeStatement: FinancialReport | null;
          balanceSheet: FinancialReport | null;
          cashFlow: FinancialReport | null;
        };

        const reportsDataMap: Record<ReportTypeEnum, keyof ReportDataCollection> = {
          [ReportType.INCOME_STATEMENT]: 'incomeStatement',
          [ReportType.BALANCE_SHEET]: 'balanceSheet',
          [ReportType.CASH_FLOW]: 'cashFlow',
        };

        const reportData = (reportsData as ReportDataCollection)[reportsDataMap[reportType]];

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
    [householdId, reportType, mapReportToView, viewType],
  );

  useEffect(() => {
    loadReport(currentDate);
  }, [currentDate, householdId, loadReport]);

  const handlePreviousMonth = useCallback(() => {
    if (viewType === 'year') {
      const newDate = new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1);
      setInternalDate(newDate);
    } else {
      const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      setInternalDate(newDate);
    }
  }, [currentDate, viewType]);

  const handleNextMonth = useCallback(() => {
    if (viewType === 'year') {
      const newDate = new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), 1);
      setInternalDate(newDate);
    } else {
      const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
      setInternalDate(newDate);
    }
  }, [currentDate, viewType]);

  const handleCurrentMonth = useCallback(() => {
    setInternalDate(new Date());
  }, []);

  const jumpToDate = useCallback((date: Date) => {
    setInternalDate(date);
  }, []);

  const isCurrentMonth = useCallback(() => {
    const now = new Date();
    if (viewType === 'year') {
      return currentDate.getFullYear() === now.getFullYear();
    }
    return (
      currentDate.getFullYear() === now.getFullYear() && currentDate.getMonth() === now.getMonth()
    );
  }, [currentDate, viewType]);

  const formatMonthYear = useCallback(
    (date: Date) => {
      if (viewType === 'year') {
        return `${date.getFullYear()} 年`;
      }
      return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
    },
    [viewType],
  );

  const reload = useCallback(() => {
    loadReport(currentDate);
  }, [loadReport, currentDate]);

  return {
    report,
    loading,
    error,
    currentDate,
    viewType,
    handlePreviousMonth,
    handleNextMonth,
    handleCurrentMonth,
    isCurrentMonth,
    formatMonthYear,
    reload,
    jumpToDate,
  };
}
