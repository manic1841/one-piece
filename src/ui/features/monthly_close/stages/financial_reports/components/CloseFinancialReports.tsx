import React, { useCallback, useState } from 'react';

import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { statementTitleClass } from '@/ui/components/statement/StatementTable';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/components/ui/tabs';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { REPORT_VIEW_TITLES } from '@/ui/constants/report/reportViewLabels';
import { CloseSectionHeading } from '@/ui/features/monthly_close/components/CloseSectionHeading';
import type {
  ReportTimestampsVM,
  ReportViewsVM,
} from '@/ui/features/monthly_close/viewmodels/financialReports.vm';
import { formatReportTimestamps } from '@/ui/features/monthly_close/viewmodels/financialReports.vm';

import { BalanceSheetView, CashFlowView, IncomeStatementView } from './CloseFinancialReportViews';

interface CloseFinancialReportsProps {
  reports: ReportViewsVM;
  timestamps: ReportTimestampsVM;
  isLoading: boolean;
  /** This stage's own load is known and did not fail (useStageLoader.isLoaded). */
  isLoaded: boolean;
  error: string | null;
  /**
   * null while readiness has not loaded or its load failed; Generate needs an
   * explicit `true`, so "not ready" and "unknown" both block (#229).
   */
  isSettlementReady: boolean | null;
  onContinue: () => void;
  onGenerate: () => void;
  onBack: () => void;
  confirming: boolean;
  /** While paused, only the walk position's confirm button is enabled (ADR-0070). */
  isConfirmable: boolean;
  /** A CLOSED period renders read-only: no confirm action at all (ADR-0071). */
  isReadOnly: boolean;
  /**
   * The stage's own completion, not report persistence: a legacy month or a
   * reopened period can carry persisted reports while the stage is PENDING
   * (#222). Completion drives the generated panel and hides the action.
   */
  isStageCompleted: boolean;
  /**
   * Whether all three reports are persisted. null means the persistence read
   * failed (unknown), which is NEVER rendered as 尚未產生 (#229).
   */
  reportsPersisted: boolean | null;
  /** Whether the cash-flow adjustment exceeds the confirmation threshold. */
  showAdjustmentWarning: boolean;
}

interface ReportsAlertsProps {
  error: string | null;
  timestamps: ReportTimestampsVM;
  showAdjustmentWarning: boolean;
  showExistingReportsWarning: boolean;
  showPersistenceUnknown: boolean;
}

/**
 * The FINANCIAL_REPORTS warning surface: load error plus every pre-confirm/unknown alert.
 */
const ReportsAlerts: React.FC<ReportsAlertsProps> = ({
  error,
  timestamps,
  showAdjustmentWarning,
  showExistingReportsWarning,
  showPersistenceUnknown,
}) => {
  const generatedAt = formatReportTimestamps(timestamps);
  return (
    <>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {showAdjustmentWarning && (
        <Alert variant="warning">
          <StatusGlyph type="review" />
          <AlertDescription>{MONTHLY_CLOSE_LABELS.ADJUSTMENT_WARNING}</AlertDescription>
        </Alert>
      )}

      {/* Persisted reports without a completed stage are leftover files (legacy
          pre-workflow month or a reopened period). Confirm recomputes the
          preview and overwrites them, so warn instead of claiming the stage is
          done (#222). */}
      {showExistingReportsWarning && (
        <Alert variant="warning">
          <StatusGlyph type="review" />
          <AlertDescription>
            <p>{MONTHLY_CLOSE_LABELS.EXISTING_REPORTS_WARNING}</p>
            {generatedAt && (
              <p>
                {MONTHLY_CLOSE_LABELS.GENERATED_AT}
                {generatedAt}
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {showPersistenceUnknown && (
        <Alert variant="warning">
          <StatusGlyph type="review" />
          <AlertDescription>{MONTHLY_CLOSE_LABELS.PERSISTENCE_UNKNOWN_WARNING}</AlertDescription>
        </Alert>
      )}
    </>
  );
};

export const CloseFinancialReports: React.FC<CloseFinancialReportsProps> = ({
  reports,
  timestamps,
  isLoading,
  isLoaded,
  error,
  isSettlementReady,
  onContinue,
  onGenerate,
  onBack,
  confirming,
  isConfirmable,
  isReadOnly,
  isStageCompleted,
  reportsPersisted,
  showAdjustmentWarning,
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

  // Generate gates on "known, and not failed", never on the data alone (#229).
  const hasAnyData = incomeStatement !== null || balanceSheet !== null || cashFlow !== null;
  const isGenerateBlocked =
    isSettlementReady !== true || !isLoaded || !hasAnyData || reportsPersisted === null;
  const showExistingReportsWarning = !isStageCompleted && reportsPersisted === true;
  const showPersistenceUnknown =
    !isStageCompleted && !isLoading && error === null && reportsPersisted === null;

  return (
    <div className="space-y-6 pt-8">
      <CloseSectionHeading
        eyebrow={MONTHLY_CLOSE_LABELS.EVIDENCE_LABEL}
        title={MONTHLY_CLOSE_LABELS.FINANCIAL_REPORTS_TITLE}
        note={MONTHLY_CLOSE_LABELS.FINANCIAL_REPORTS_NOTE}
        trailing={
          <span className="font-mono text-[13px] tabular-nums text-muted-foreground">
            {isStageCompleted
              ? MONTHLY_CLOSE_LABELS.REPORTS_GENERATED
              : MONTHLY_CLOSE_LABELS.FINANCIAL_REPORTS_TITLE}
          </span>
        }
        className="border-b border-border pb-4"
      />

      <ReportsAlerts
        error={error}
        timestamps={timestamps}
        showAdjustmentWarning={showAdjustmentWarning}
        showExistingReportsWarning={showExistingReportsWarning}
        showPersistenceUnknown={showPersistenceUnknown}
      />

      {isStageCompleted && (
        <Alert variant="default" data-testid="reports-generated-panel">
          <StatusGlyph type="verified" className="shrink-0" />
          <AlertDescription className="flex-1 space-y-2">
            <p className="text-sm font-bold text-foreground">
              {MONTHLY_CLOSE_LABELS.REPORTS_GENERATED}
            </p>
            <p className="text-xs text-muted-foreground">
              {MONTHLY_CLOSE_LABELS.GENERATED_AT}
              {formatReportTimestamps(timestamps)}
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
          </AlertDescription>
        </Alert>
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
        {!isStageCompleted && !isReadOnly && (
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
