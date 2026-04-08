import React from 'react';

import {
  NoSummaryCard,
  ReportGenerationSection,
  type SummaryData,
  SummaryStatsGrid,
} from './SettlementSummaryComponents';

interface SettlementSummaryProps {
  year: number;
  month: number;
  summary: SummaryData | null;
  isGenerating: boolean;
  reportsGenerated: boolean;
  onGenerateReports: () => void;
  error?: string;
  unsettledProjectNames?: string[];
  unsettledAccountNames?: string[];
  unsettledPortfolioNames?: string[];
  unsettledDebtNames?: string[];
  debtNoRepaymentWarningNames?: string[];
  reportTimestamps?: {
    incomeStatement?: string;
    balanceSheet?: string;
    cashFlow?: string;
  };
  onGoToProjectSettlement?: () => void;
  isLoadingSummary?: boolean;
}

export const SettlementSummary: React.FC<SettlementSummaryProps> = ({
  year,
  month,
  summary,
  isGenerating,
  reportsGenerated,
  onGenerateReports,
  error,
  unsettledProjectNames = [],
  unsettledAccountNames = [],
  unsettledPortfolioNames = [],
  unsettledDebtNames = [],
  debtNoRepaymentWarningNames = [],
  reportTimestamps,
  onGoToProjectSettlement,
  isLoadingSummary = false,
}) => {
  return (
    <div className="space-y-8">
      {!summary ? (
        <NoSummaryCard
          year={year}
          month={month}
          isLoading={isLoadingSummary}
          unsettledProjects={unsettledProjectNames}
          unsettledAccounts={unsettledAccountNames}
          unsettledPortfolios={unsettledPortfolioNames}
          unsettledDebts={unsettledDebtNames}
          debtWarnings={debtNoRepaymentWarningNames}
          onGoToSettlement={onGoToProjectSettlement}
        />
      ) : (
        <SummaryStatsGrid summary={summary} />
      )}

      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-slate-200"></div>
        </div>
        <div className="relative flex justify-start">
          <span className="bg-white pr-4 text-xs font-black uppercase tracking-widest text-slate-400">
            正式報表作業
          </span>
        </div>
      </div>

      <ReportGenerationSection
        summary={summary}
        isGenerating={isGenerating}
        reportsGenerated={reportsGenerated}
        onGenerateReports={onGenerateReports}
        error={error}
        reportTimestamps={reportTimestamps}
      />
    </div>
  );
};
