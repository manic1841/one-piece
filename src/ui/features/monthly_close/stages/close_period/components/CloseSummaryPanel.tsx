import React from 'react';

import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { Button } from '@/ui/components/ui/button';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { useConfirm } from '@/ui/features/app/confirm/useConfirm';
import { CloseStageLoadError } from '@/ui/features/monthly_close/components/CloseStageLoadError';
import { formatDriftDelta, isDrifted } from '@/ui/features/monthly_close/viewmodels/reportDrift.vm';
import { cn, formatCurrency } from '@/ui/utils';

import {
  CLOSE_ACTIVITY_STATUS,
  type CloseSummaryVM,
  type FinancialResultVM,
} from '../../../mappers/closeSummary.mappers';

interface CloseSummaryPanelProps {
  summary: CloseSummaryVM;
  /** Set when the report data Step 9 renders failed to load (#228). */
  loadErrorMessage?: string | null;
  /**
   * Whether any figure in Step 8's statements drifted from the persisted report
   * (#234). Derived live by the registry from the drift tree Step 8 already
   * renders, so the gate cannot disagree with the warnings the user saw. A
   * boolean, not a count: the tree mixes independent figures with render-time
   * sums the screen does not draw, so no tally matches what the user can count.
   */
  hasDrift: boolean;
  /** Sends the user back to Step 8 to regenerate the reports. */
  onReviewReports: () => void;
  onClose: () => void;
  confirming: boolean;
  /** While paused, only the walk position's confirm button is enabled (ADR-0070). */
  isConfirmable: boolean;
  /** A closed or cascade-demoted period hides the close action. */
  isReadOnly: boolean;
}

const financialRows: { key: keyof FinancialResultVM; label: string }[] = [
  { key: 'totalAssets', label: MONTHLY_CLOSE_LABELS.ASSETS_SECTION },
  { key: 'totalLiabilities', label: MONTHLY_CLOSE_LABELS.LIABILITIES_SECTION },
  { key: 'equity', label: MONTHLY_CLOSE_LABELS.EQUITY_SECTION },
  { key: 'netIncome', label: MONTHLY_CLOSE_LABELS.NET_INCOME },
  { key: 'netCashFlow', label: MONTHLY_CLOSE_LABELS.NET_CASH_CHANGE },
];

export const CloseSummaryPanel: React.FC<CloseSummaryPanelProps> = ({
  summary,
  loadErrorMessage = null,
  hasDrift,
  onReviewReports,
  onClose,
  confirming,
  isConfirmable,
  isReadOnly,
}) => {
  const { confirm: confirmDialog } = useConfirm();

  const handleClose = async () => {
    const confirmed = await confirmDialog({
      title: MONTHLY_CLOSE_LABELS.SUMMARY_CLOSE_TITLE,
      context: MONTHLY_CLOSE_LABELS.SUMMARY_CLOSE_CONTEXT,
      consequence: MONTHLY_CLOSE_LABELS.SUMMARY_CLOSE_CONSEQUENCE,
      confirmLabel: MONTHLY_CLOSE_LABELS.SUMMARY_CLOSE_ACTION,
      cancelLabel: MONTHLY_CLOSE_LABELS.CANCEL,
    });
    if (!confirmed) return;
    onClose();
  };

  return (
    <section className="space-y-6 pt-8" data-testid="close-summary-panel">
      <CloseStageLoadError message={loadErrorMessage} />
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            {MONTHLY_CLOSE_LABELS.SUMMARY_LABEL}
          </p>
          <h2 className="text-[22px] font-medium leading-tight text-foreground">
            {MONTHLY_CLOSE_LABELS.SUMMARY_TITLE}
          </h2>
        </div>
        <span className="font-mono text-[13px] tabular-nums text-muted-foreground">
          {summary.reportsGeneratedCount} / {summary.reports.length}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {MONTHLY_CLOSE_LABELS.SUMMARY_ACTIVITY}
          </p>
          <ul className="space-y-1">
            {summary.activity.map((row) => (
              <li
                key={row.stepText}
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 odd:bg-muted/30"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <StatusGlyph
                    type={
                      row.status === CLOSE_ACTIVITY_STATUS.NOT_CONFIRMED ? 'waiting' : 'verified'
                    }
                  />
                  <span className="truncate text-sm text-foreground">{row.stepText}</span>
                </div>
                <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                  {row.dataText ?? MONTHLY_CLOSE_LABELS.NO_DATA}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {MONTHLY_CLOSE_LABELS.SUMMARY_FINANCIAL}
            </p>
            <div className="space-y-1">
              {financialRows.map((row) => {
                const value = summary.financial[row.key];
                const drift = summary.financialDrift?.[row.key];
                const delta = drift ? formatDriftDelta(drift) : null;
                return (
                  <div
                    key={row.key}
                    className="flex items-center justify-between rounded-lg px-3 py-2 odd:bg-muted/30"
                  >
                    <span className="text-sm text-foreground">{row.label}</span>
                    <span
                      className={cn(
                        'font-mono text-[13px] tabular-nums',
                        isDrifted(drift) ? 'text-warning' : 'text-muted-foreground',
                      )}
                    >
                      {value === null
                        ? MONTHLY_CLOSE_LABELS.NO_DATA
                        : (delta ?? formatCurrency(value))}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {MONTHLY_CLOSE_LABELS.SUMMARY_REPORTS}
            </p>
            <div className="space-y-1">
              {summary.reports.map((report) => (
                <div
                  key={report.title}
                  className="flex items-center justify-between rounded-lg px-3 py-2 odd:bg-muted/30"
                >
                  <span className="text-sm text-foreground">{report.title}</span>
                  <StatusGlyph
                    type={
                      report.isGenerated === true
                        ? 'verified'
                        : report.isGenerated === null
                          ? 'review'
                          : 'waiting'
                    }
                    label={
                      report.isGenerated === true
                        ? MONTHLY_CLOSE_LABELS.PERSISTED
                        : report.isGenerated === null
                          ? MONTHLY_CLOSE_LABELS.PERSISTENCE_UNKNOWN
                          : MONTHLY_CLOSE_LABELS.NOT_PERSISTED
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {!isReadOnly && (
        <div className="space-y-3 border-t border-border pt-[26px]">
          {/* The backend close gate only checks that the reports are persisted,
              so a drift that appeared after Step 8 was confirmed would be frozen
              into the closed period. The block lives here, next to the action
              it refuses (#234). */}
          {hasDrift && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3">
              <p className="text-sm text-warning" role="alert" data-testid="close-drift-block">
                {MONTHLY_CLOSE_LABELS.DRIFT_BLOCK_MESSAGE}
              </p>
              <Button
                type="button"
                variant="outline"
                data-testid="review-reports"
                onClick={onReviewReports}
                className="h-8 shrink-0 px-3 text-xs font-semibold"
              >
                {MONTHLY_CLOSE_LABELS.DRIFT_BLOCK_ACTION}
              </Button>
            </div>
          )}
          <div className="flex items-center justify-end">
            <Button
              data-testid="close-period-confirm"
              onClick={() => void handleClose()}
              disabled={confirming || !isConfirmable || hasDrift}
              className="h-[38px] px-[18px] text-xs font-semibold uppercase tracking-[0.08em]"
            >
              {confirming
                ? MONTHLY_CLOSE_LABELS.LOADING
                : MONTHLY_CLOSE_LABELS.SUMMARY_CLOSE_ACTION}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
};
