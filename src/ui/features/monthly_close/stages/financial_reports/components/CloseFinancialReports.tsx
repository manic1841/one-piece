import React, { useCallback, useState } from 'react';

import { AlertTriangle } from 'lucide-react';

import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/components/ui/tabs';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { REPORT_VIEW_TITLES } from '@/ui/constants/report/reportViewLabels';
import type {
  ReportTimestampsVM,
  ReportViewsVM,
} from '@/ui/features/monthly_close/viewmodels/financialReports.vm';

import {
  BalanceSheetView,
  CashFlowView,
  IncomeStatementView,
  statementTitleClass,
} from './CloseFinancialReportViews';

interface CloseFinancialReportsProps {
  reports: ReportViewsVM;
  timestamps: ReportTimestampsVM;
  isLoading: boolean;
  error: string | null;
  /** null while readiness has not loaded; false disables Generate (Step 7 shows why). */
  isSettlementReady: boolean | null;
  onContinue: () => void;
  onGenerate: () => void;
  onBack: () => void;
  confirming: boolean;
  /** While paused, only the walk position's confirm button is enabled (ADR-0070). */
  isConfirmable: boolean;
  isGenerated: boolean;
}

export const CloseFinancialReports: React.FC<CloseFinancialReportsProps> = ({
  reports,
  timestamps,
  isLoading,
  error,
  isSettlementReady,
  onContinue,
  onGenerate,
  onBack,
  confirming,
  isConfirmable,
  isGenerated,
}) => {
  const { incomeStatement, balanceSheet, cashFlow } = reports;

  // Table collapse is presentation state, scoped to the displayed statement:
  // switching tabs resets every group back to expanded (default).
  const [view, setView] = useState<keyof typeof REPORT_VIEW_TITLES>('INCOME_STATEMENT');
  const [collapsedKeys, setCollapsedKeys] = useState<ReadonlySet<string>>(() => new Set());
  const toggleCollapsed = useCallback((key: string) => {
    setCollapsedKeys((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);
  const handleViewChange = useCallback((value: string) => {
    setView(value as keyof typeof REPORT_VIEW_TITLES);
    setCollapsedKeys(new Set());
  }, []);

  // The missing-category list belongs to Step 7; here readiness only gates the
  // Generate action, so a not-ready period disables it without repeating why.
  const isGenerateBlocked = isSettlementReady === false;
  const showAdjustmentWarning = Math.abs(cashFlow?.adjustment.amount ?? 0) > 1000;
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
        <Tabs value={view} onValueChange={handleViewChange} className="space-y-4">
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
            <IncomeStatementView
              data={incomeStatement}
              collapsed={collapsedKeys}
              onToggle={toggleCollapsed}
            />
          </TabsContent>
          <TabsContent
            forceMount
            value="BALANCE_SHEET"
            className="md:hidden md:data-[state=active]:block"
          >
            <div className="md:hidden">
              <p className={statementTitleClass}>{REPORT_VIEW_TITLES.BALANCE_SHEET}</p>
            </div>
            <BalanceSheetView
              data={balanceSheet}
              collapsed={collapsedKeys}
              onToggle={toggleCollapsed}
            />
          </TabsContent>
          <TabsContent
            forceMount
            value="CASH_FLOW"
            className="md:hidden md:data-[state=active]:block"
          >
            <div className="md:hidden">
              <p className={statementTitleClass}>{REPORT_VIEW_TITLES.CASH_FLOW}</p>
            </div>
            <CashFlowView data={cashFlow} collapsed={collapsedKeys} onToggle={toggleCollapsed} />
          </TabsContent>
        </Tabs>
      )}

      {!hasAnyData && !error && (
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
            disabled={confirming || isGenerateBlocked || isLoading || !isConfirmable}
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
