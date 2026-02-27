import { useNavigate } from 'react-router-dom';

import CashFlowView from '@/components/reports/CashFlowView';
import { ReportPageLayout } from '@/components/reports/ReportPageLayout';
import {
  ReportEmptyState,
  ReportErrorState,
  ReportLoadingState,
} from '@/components/reports/ReportStates';
import { useAuth } from '@/contexts/useAuth';
import type { CashFlowView as CashFlowStatement } from '@/domains/finance/mappers/reportToView';
import { useFinancialReportPage } from '@/hooks/pages/useFinancialReportPage';

export default function CashFlowPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const {
    report: cashFlow,
    loading,
    error,
    currentDate,
    handlePreviousMonth,
    handleNextMonth,
    handleCurrentMonth,
    isCurrentMonth,
    formatMonthYear,
    reload,
  } = useFinancialReportPage<CashFlowStatement>({
    householdId: userProfile?.householdId,
    reportType: 'cash_flow',
  });

  if (!userProfile?.householdId) {
    return <div>Loading...</div>;
  }

  if (loading && !cashFlow) {
    return <ReportLoadingState />;
  }

  if (error) {
    return <ReportErrorState error={error} onBack={() => navigate('/reports')} onRetry={reload} />;
  }

  return (
    <ReportPageLayout
      title="現金流量表"
      currentDate={currentDate}
      formatMonthYear={formatMonthYear}
      isCurrentMonth={isCurrentMonth}
      onPreviousMonth={handlePreviousMonth}
      onNextMonth={handleNextMonth}
      onCurrentMonth={handleCurrentMonth}
      onBack={() => navigate('/reports')}
    >
      {cashFlow ? (
        <CashFlowView cashFlow={cashFlow} />
      ) : (
        <ReportEmptyState message="無法載入現金流量表" />
      )}
    </ReportPageLayout>
  );
}
