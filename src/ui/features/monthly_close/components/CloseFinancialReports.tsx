import React from 'react';

import { AlertTriangle } from 'lucide-react';

import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/components/ui/tabs';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { REPORT_VIEW_TITLES } from '@/ui/constants/report/reportViewLabels';

import { useCloseFinancialReports } from '../hooks/useCloseFinancialReports';
import {
  BalanceSheetView,
  CashFlowView,
  IncomeStatementView,
  statementTitleClass,
} from './CloseFinancialReportViews';

interface CloseFinancialReportsProps {
  householdId: string;
  year: number;
  month: number;
  onContinue: () => void;
  onGenerate: () => void;
  onBack: () => void;
  confirming: boolean;
  isGenerated: boolean;
}

export const CloseFinancialReports: React.FC<CloseFinancialReportsProps> = ({
  householdId,
  year,
  month,
  onContinue,
  onGenerate,
  onBack,
  confirming,
  isGenerated,
}) => {
  const {
    view,
    setView,
    incomeStatement,
    balanceSheet,
    cashFlow,
    timestamps,
    missingCategoryNames,
    isLoading,
    error,
  } = useCloseFinancialReports({ householdId, year, month });

  const showReadinessGate = missingCategoryNames.length > 0;
  const showAdjustmentWarning = Math.abs(cashFlow?.adjustment ?? 0) > 1000;
  const hasAnyData = incomeStatement !== null || balanceSheet !== null || cashFlow !== null;

  return (
    <div className="space-y-6 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            {MONTHLY_CLOSE_LABELS.EVIDENCE_LABEL}
          </p>
          <h2 className="text-[22px] font-medium leading-tight text-foreground">
            {MONTHLY_CLOSE_LABELS.FINANCIAL_REPORTS_TITLE}
          </h2>
          <p className="text-xs text-muted-foreground">
            {MONTHLY_CLOSE_LABELS.FINANCIAL_REPORTS_NOTE}
          </p>
        </div>
        <span className="font-mono text-[13px] tabular-nums text-muted-foreground">
          {isGenerated
            ? MONTHLY_CLOSE_LABELS.REPORTS_GENERATED
            : MONTHLY_CLOSE_LABELS.FINANCIAL_REPORTS_TITLE}
        </span>
      </div>

      {error && (
        <Alert variant="destructive" className="border-negative/20 bg-negative/10">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {showReadinessGate && (
        <Alert className="border-warning/30 bg-warning/5 text-foreground">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription>
            {MONTHLY_CLOSE_LABELS.READINESS_BLOCKED}
            {missingCategoryNames.join('、')}
          </AlertDescription>
        </Alert>
      )}

      {showAdjustmentWarning && (
        <Alert className="border-warning/30 bg-warning/5 text-foreground">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription>{MONTHLY_CLOSE_LABELS.ADJUSTMENT_WARNING}</AlertDescription>
        </Alert>
      )}

      {isGenerated && (
        <div
          data-testid="reports-generated-panel"
          className="space-y-2 rounded-lg border border-positive/30 bg-positive/10 px-4 py-3"
        >
          <p className="text-sm font-bold text-foreground">
            {MONTHLY_CLOSE_LABELS.REPORTS_GENERATED}
          </p>
          <p className="text-xs text-muted-foreground">
            {MONTHLY_CLOSE_LABELS.GENERATED_AT}
            {timestamps.incomeStatement
              ? ` ｜ ${REPORT_VIEW_TITLES.INCOME_STATEMENT} ${timestamps.incomeStatement}`
              : ''}
            {timestamps.balanceSheet
              ? ` ｜ ${REPORT_VIEW_TITLES.BALANCE_SHEET} ${timestamps.balanceSheet}`
              : ''}
            {timestamps.cashFlow
              ? ` ｜ ${REPORT_VIEW_TITLES.CASH_FLOW} ${timestamps.cashFlow}`
              : ''}
          </p>
          <div className="flex justify-end">
            <Button
              variant="link"
              size="sm"
              onClick={onContinue}
              className="h-auto p-0 text-xs font-semibold uppercase tracking-[0.08em]"
            >
              {MONTHLY_CLOSE_LABELS.CONTINUE}
            </Button>
          </div>
        </div>
      )}

      {hasAnyData && (
        <Tabs
          value={view}
          onValueChange={(value) => setView(value as typeof view)}
          className="space-y-4"
        >
          <TabsList className="hidden md:inline-flex">
            {(Object.keys(REPORT_VIEW_TITLES) as Array<keyof typeof REPORT_VIEW_TITLES>).map(
              (viewId) => (
                <TabsTrigger key={viewId} value={viewId}>
                  {REPORT_VIEW_TITLES[viewId]}
                </TabsTrigger>
              ),
            )}
          </TabsList>
          <TabsContent
            forceMount
            value="INCOME_STATEMENT"
            className="md:hidden md:data-[state=active]:block"
          >
            <div className="md:hidden">
              <p className={statementTitleClass}>{REPORT_VIEW_TITLES.INCOME_STATEMENT}</p>
            </div>
            <IncomeStatementView data={incomeStatement} />
          </TabsContent>
          <TabsContent
            forceMount
            value="BALANCE_SHEET"
            className="md:hidden md:data-[state=active]:block"
          >
            <div className="md:hidden">
              <p className={statementTitleClass}>{REPORT_VIEW_TITLES.BALANCE_SHEET}</p>
            </div>
            <BalanceSheetView data={balanceSheet} />
          </TabsContent>
          <TabsContent
            forceMount
            value="CASH_FLOW"
            className="md:hidden md:data-[state=active]:block"
          >
            <div className="md:hidden">
              <p className={statementTitleClass}>{REPORT_VIEW_TITLES.CASH_FLOW}</p>
            </div>
            <CashFlowView data={cashFlow} />
          </TabsContent>
        </Tabs>
      )}

      {!hasAnyData && !error && !showReadinessGate && (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          {MONTHLY_CLOSE_LABELS.NO_DATA}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border pt-[26px]">
        <Button
          variant="text"
          size="sm"
          onClick={onBack}
          disabled={confirming}
          className="text-xs font-semibold uppercase tracking-[0.08em]"
        >
          {MONTHLY_CLOSE_LABELS.BACK_TO_CURRENT}
        </Button>
        {!isGenerated && (
          <Button
            data-testid="generate-reports"
            onClick={onGenerate}
            disabled={confirming || showReadinessGate || isLoading}
            className="h-[38px] px-[18px] text-xs font-semibold uppercase tracking-[0.08em]"
          >
            {confirming || isLoading
              ? MONTHLY_CLOSE_LABELS.LOADING
              : MONTHLY_CLOSE_LABELS.GENERATE_REPORTS}
          </Button>
        )}
      </div>
    </div>
  );
};

export default CloseFinancialReports;
