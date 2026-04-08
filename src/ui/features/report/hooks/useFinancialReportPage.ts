import { useCallback, useEffect, useState } from 'react';

import {
  type BalanceSheetData,
  type CashFlowData,
  type FinancialReport,
  type IncomeStatementData,
  ReportType,
} from '@/domains/report/schemas';
import { useReportCmds } from '@/ui/features/report/hooks/useReportCmds';
import { useReports } from '@/ui/features/report/hooks/useReports';
import {
  type BalanceSheetVM,
  type CashFlowVM,
  type IncomeStatementVM,
  mapBalanceSheetToVM,
  mapCashFlowToVM,
  mapIncomeStatementToVM,
} from '@/ui/features/report/viewmodels/reportDisplay.vm';

type ReportTypeEnum = ReportType;
type ViewType = 'month' | 'year';
type ReportView = IncomeStatementVM | BalanceSheetVM | CashFlowVM;

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
          return mapIncomeStatementToVM(reportData.data as IncomeStatementData) as T;
        case ReportType.BALANCE_SHEET:
          return mapBalanceSheetToVM(reportData.data as BalanceSheetData) as T;
        case ReportType.CASH_FLOW:
          return mapCashFlowToVM(reportData.data as CashFlowData) as T;
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
