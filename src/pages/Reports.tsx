import React, { useState } from 'react';

import { FileText, PlusCircle, TrendingUp, Wallet } from 'lucide-react';

import BalanceSheetView from '@/components/reports/BalanceSheetView';
import CashFlowView from '@/components/reports/CashFlowView';
import FinancialReportGenerator from '@/components/reports/FinancialReportGenerator';
import IncomeStatementView from '@/components/reports/IncomeStatementView';
import { ReportPageLayout } from '@/components/reports/ReportPageLayout';
import {
  ReportEmptyState,
  ReportErrorState,
  ReportLoadingState,
} from '@/components/reports/ReportStates';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type {
  BalanceSheetView as BalanceSheet,
  CashFlowView as CashFlow,
  IncomeStatementView as IncomeStatement,
} from '@/domains/finance/mappers';
import { useFinancialReportPage } from '@/hooks/pages/useFinancialReportPage';

import { useAuth } from '../contexts/useAuth';

const Reports: React.FC = () => {
  const { userProfile } = useAuth();
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState('income-statement');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const householdId = userProfile?.householdId;

  // Income Statement
  const isState = useFinancialReportPage<IncomeStatement>({
    householdId,
    reportType: 'income_statement',
    externalDate: currentDate,
  });

  // Balance Sheet
  const bsState = useFinancialReportPage<BalanceSheet>({
    householdId,
    reportType: 'balance_sheet',
    externalDate: currentDate,
  });

  // Cash Flow
  const cfState = useFinancialReportPage<CashFlow>({
    householdId,
    reportType: 'cash_flow',
    externalDate: currentDate,
  });

  if (!householdId) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-muted-foreground text-lg">正在載入用戶資訊...</p>
      </div>
    );
  }

  const activeState =
    currentTab === 'income-statement'
      ? isState
      : currentTab === 'balance-sheet'
        ? bsState
        : cfState;

  const renderCurrentReport = () => {
    if (activeState.loading && !activeState.report) {
      return <ReportLoadingState />;
    }

    if (activeState.error) {
      return <ReportErrorState error={activeState.error} onRetry={activeState.reload} />;
    }

    if (!activeState.report) {
      return <ReportEmptyState message="目前尚無報表資料" />;
    }

    switch (currentTab) {
      case 'income-statement':
        return <IncomeStatementView statement={activeState.report as IncomeStatement} />;
      case 'balance-sheet':
        return <BalanceSheetView balanceSheet={activeState.report as BalanceSheet} />;
      case 'cash-flow':
        return <CashFlowView cashFlow={activeState.report as CashFlow} />;
      default:
        return null;
    }
  };

  const handlePreviousMonth = () => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    setCurrentDate(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    setCurrentDate(newDate);
  };

  const handleCurrentMonth = () => {
    setCurrentDate(new Date());
  };

  const isCurrentMonth = () => {
    const now = new Date();
    return (
      currentDate.getFullYear() === now.getFullYear() && currentDate.getMonth() === now.getMonth()
    );
  };

  return (
    <div className="space-y-6">
      <ReportPageLayout
        title="財務報表"
        currentDate={currentDate}
        isCurrentMonth={isCurrentMonth}
        onPreviousMonth={handlePreviousMonth}
        onNextMonth={handleNextMonth}
        onCurrentMonth={handleCurrentMonth}
        onDateChange={setCurrentDate}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b pb-4">
            <Tabs defaultValue={currentTab} className="w-full" onValueChange={setCurrentTab}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <TabsList>
                  <TabsTrigger value="income-statement" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    損益表
                  </TabsTrigger>
                  <TabsTrigger value="balance-sheet" className="flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    資產負債表
                  </TabsTrigger>
                  <TabsTrigger value="cash-flow" className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    現金流量表
                  </TabsTrigger>
                </TabsList>

                <Dialog open={isGeneratorOpen} onOpenChange={setIsGeneratorOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex items-center gap-2 border-primary text-primary hover:bg-primary/5"
                    >
                      <PlusCircle className="h-4 w-4" />
                      <span>產生月結報表</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogTitle>產生月結報表</DialogTitle>
                    <FinancialReportGenerator />
                  </DialogContent>
                </Dialog>
              </div>

              <div className="mt-6">{renderCurrentReport()}</div>
            </Tabs>
          </div>
        </div>
      </ReportPageLayout>
    </div>
  );
};

export default Reports;
