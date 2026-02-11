import React from 'react';
import { useNavigate } from 'react-router-dom';

import IncomeStatementView from '@/components/reports/IncomeStatementView';
import { ReportPageLayout } from '@/components/reports/ReportPageLayout';
import {
  ReportEmptyState,
  ReportErrorState,
  ReportLoadingState,
} from '@/components/reports/ReportStates';
import type { IncomeStatementView as IncomeStatement } from '@/domains/finance/mappers/reportToView';
import { useFinancialReportPage } from '@/hooks/pages/useFinancialReportPage';

import { useAuth } from '../contexts/useAuth';

const IncomeStatementPage: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const {
    report: statement,
    loading,
    error,
    currentDate,
    handlePreviousMonth,
    handleNextMonth,
    handleCurrentMonth,
    isCurrentMonth,
    formatMonthYear,
    reload,
  } = useFinancialReportPage<IncomeStatement>({
    householdId: userProfile?.householdId,
    reportType: 'income_statement',
  });

  if (!userProfile?.householdId) {
    return <div>Loading...</div>;
  }

  if (loading && !statement) {
    return <ReportLoadingState />;
  }

  if (error) {
    return <ReportErrorState error={error} onBack={() => navigate('/reports')} onRetry={reload} />;
  }

  return (
    <ReportPageLayout
      title="損益表"
      currentDate={currentDate}
      formatMonthYear={formatMonthYear}
      isCurrentMonth={isCurrentMonth}
      onPreviousMonth={handlePreviousMonth}
      onNextMonth={handleNextMonth}
      onCurrentMonth={handleCurrentMonth}
      onBack={() => navigate('/reports')}
    >
      {statement ? (
        <IncomeStatementView statement={statement} />
      ) : (
        <ReportEmptyState message="無法載入損益表" />
      )}
    </ReportPageLayout>
  );
};

export default IncomeStatementPage;
