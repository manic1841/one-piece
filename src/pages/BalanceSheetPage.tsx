import BalanceSheetView from '@/components/reports/BalanceSheetView';
import { ReportPageLayout } from '@/components/reports/ReportPageLayout';
import {
  ReportEmptyState,
  ReportErrorState,
  ReportLoadingState,
} from '@/components/reports/ReportStates';
import type { BalanceSheetView as BalanceSheet } from '@/domains/finance/mappers/reportToView';
import { useFinancialReportPage } from '@/hooks/pages/useFinancialReportPage';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/useAuth';

export default function BalanceSheetPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const {
    report: balanceSheet,
    loading,
    error,
    currentDate,
    handlePreviousMonth,
    handleNextMonth,
    handleCurrentMonth,
    isCurrentMonth,
    formatMonthYear,
    reload,
  } = useFinancialReportPage<BalanceSheet>({
    householdId: userProfile?.householdId,
    reportType: 'balance_sheet',
  });

  if (!userProfile?.householdId) {
    return <div>Loading...</div>;
  }

  if (loading && !balanceSheet) {
    return <ReportLoadingState />;
  }

  if (error) {
    return <ReportErrorState error={error} onBack={() => navigate('/reports')} onRetry={reload} />;
  }

  return (
    <ReportPageLayout
      title="資產負債表"
      currentDate={currentDate}
      formatMonthYear={formatMonthYear}
      isCurrentMonth={isCurrentMonth}
      onPreviousMonth={handlePreviousMonth}
      onNextMonth={handleNextMonth}
      onCurrentMonth={handleCurrentMonth}
      onBack={() => navigate('/reports')}
    >
      {balanceSheet ? (
        <BalanceSheetView balanceSheet={balanceSheet} />
      ) : (
        <ReportEmptyState message="無法載入資產負債表" />
      )}
    </ReportPageLayout>
  );
}
