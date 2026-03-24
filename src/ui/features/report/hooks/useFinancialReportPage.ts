import { useCallback, useEffect, useState } from 'react';

import {
  type BalanceSheetView,
  type CashFlowView,
  type IncomeStatementView,
} from '@/domains/report/mappers';
import {
  mapToBalanceSheetView,
  mapToCashFlowView,
  mapToIncomeStatementView,
} from '@/domains/report/mappers';
import { type FinancialReport, ReportType } from '@/domains/report/types';
import { useReportCmds } from '@/ui/features/report/hooks/useReportCmds';
import { useReports } from '@/ui/features/report/hooks/useReports';

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
  const [internalDate, setInternalDate] = useState<Date>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d;
  });

  const currentDate = externalDate || internalDate;

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

  const { getReport, loading: reportLoading, error: reportError } = useReports(householdId);
  const { loading: cmdLoading, error: cmdError } = useReportCmds(householdId, undefined);

  const loading = reportLoading || cmdLoading;
  const error = (reportError || cmdError) as string | null;

  const loadReport = useCallback(
    async (date: Date) => {
      if (!householdId) return;

      try {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;

        if (viewType === 'year') {
          // TODO: Implement yearly report use case
        } else {
          const reportData = await getReport(reportType, year, month);
          if (reportData) {
            const viewData = mapReportToView(reportData);
            setReport(viewData);
          } else {
            setReport(null);
          }
        }
      } catch (err) {
        console.error(`Failed to load ${reportType}:`, err);
      }
    },
    [householdId, reportType, mapReportToView, viewType, getReport],
  );

  useEffect(() => {
    const init = async () => {
      await loadReport(currentDate);
    };
    init();
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
