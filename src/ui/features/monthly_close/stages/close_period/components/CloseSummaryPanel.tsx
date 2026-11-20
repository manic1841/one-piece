import React from 'react';

import { StatusGlyph, type StatusGlyphType } from '@/ui/components/StatusGlyph';
import { useConfirm } from '@/ui/components/confirm/useConfirm';
import { MobileDataList, MobileDataRow } from '@/ui/components/data-table';
import { eyebrowClass } from '@/ui/components/eyebrow';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { CloseSectionHeading } from '@/ui/features/monthly_close/components/CloseSectionHeading';
import { CloseStageLoadError } from '@/ui/features/monthly_close/components/CloseStageLoadError';
import {
  formatDriftEdgeLine,
  formatDriftEdges,
  isDrifted,
} from '@/ui/features/monthly_close/viewmodels/reportDrift.vm';
import { cn } from '@/ui/utils';

import {
  CLOSE_ACTIVITY_STATUS,
  type CloseActivityStatus,
  type CloseSummaryVM,
  type FinancialResultVM,
} from '../../../mappers/closeSummary.mappers';

interface CloseSummaryPanelProps {
  summary: CloseSummaryVM;
  /** The period being closed, e.g. "2026 年 9 月"; names the dialog's target. */
  periodTitle: string;
  /** Set when the report data CLOSE_PERIOD renders failed to load (#228). */
  loadErrorMessage?: string | null;
  /**
   * Whether any figure in FINANCIAL_REPORTS statements drifted from the
   * persisted report (#234). Derived live by the registry from the drift tree
   * FINANCIAL_REPORTS already renders, so the gate cannot disagree with the
   * warnings the user saw. A boolean, not a count: the tree mixes independent
   * figures with render-time sums the screen does not draw, so no tally matches
   * what the user can count.
   */
  hasDrift: boolean;
  /** Sends the user back to FINANCIAL_REPORTS to regenerate the reports. */
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

/** One summary row in either representation: list row on the phone, lined row on the desktop. */
const SummaryRow: React.FC<{
  mobile: boolean;
  leading?: React.ReactNode;
  label: React.ReactNode;
  trailing?: React.ReactNode;
  /** Second line (the phone has no column to keep it on the first). */
  note?: React.ReactNode;
}> = ({ mobile, leading, label, trailing, note }) => {
  const content = (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {leading}
        <span className="min-w-0 truncate text-sm text-foreground">{label}</span>
      </div>
      {trailing !== undefined && <div className="shrink-0">{trailing}</div>}
    </div>
  );
  return mobile ? (
    <MobileDataRow className="py-2">
      {content}
      {note}
    </MobileDataRow>
  ) : (
    <div className="border-b border-border/60 px-3 py-2 last:border-b-0">
      {content}
      {note}
    </div>
  );
};

export const CloseSummaryPanel: React.FC<CloseSummaryPanelProps> = ({
  summary,
  periodTitle,
  loadErrorMessage = null,
  hasDrift,
  onReviewReports,
  onClose,
  confirming,
  isConfirmable,
  isReadOnly,
}) => {
  const { confirm: confirmDialog } = useConfirm();

  // Drift is resolved once per figure; both representations read the same rows.
  const financial = financialRows.map((row) => {
    const drift = summary.financialDrift?.[row.key];
    const drifted = isDrifted(drift);
    const edges = drift !== undefined && drifted ? formatDriftEdges(drift) : null;
    return {
      ...row,
      drifted,
      text: summary.financialText[row.key],
      // The phone has no column for the delta, so it prints the ending figure
      // and puts both ends on the line below.
      mobileText: edges?.toText ?? summary.financialText[row.key],
      edgeLine: edges === null ? null : formatDriftEdgeLine(edges),
    };
  });

  const activityGlyph = (status: CloseActivityStatus) =>
    status === CLOSE_ACTIVITY_STATUS.NOT_CONFIRMED ? 'waiting' : 'verified';

  const reportGlyph = (isGenerated: boolean | null): { type: StatusGlyphType; label: string } => ({
    type: isGenerated === true ? 'verified' : isGenerated === null ? 'review' : 'waiting',
    label:
      isGenerated === true
        ? MONTHLY_CLOSE_LABELS.PERSISTED
        : isGenerated === null
          ? MONTHLY_CLOSE_LABELS.PERSISTENCE_UNKNOWN
          : MONTHLY_CLOSE_LABELS.NOT_PERSISTED,
  });

  const handleClose = async () => {
    const confirmed = await confirmDialog({
      title: `${MONTHLY_CLOSE_LABELS.SUMMARY_CLOSE_TITLE}：${periodTitle}`,
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
      <CloseSectionHeading
        eyebrow={MONTHLY_CLOSE_LABELS.SUMMARY_LABEL}
        title={MONTHLY_CLOSE_LABELS.SUMMARY_TITLE}
        trailing={
          <span className="font-mono text-[13px] tabular-nums text-muted-foreground">
            {summary.reportsGeneratedCount} / {summary.reports.length}
          </span>
        }
        className="border-b border-border pb-4"
      />

      <div
        className="space-y-6 md:hidden"
        data-testid="close-summary-mobile"
        role="group"
        aria-label={MONTHLY_CLOSE_LABELS.SUMMARY_LABEL}
      >
        <div className="space-y-2">
          <p className={eyebrowClass}>{MONTHLY_CLOSE_LABELS.SUMMARY_ACTIVITY}</p>
          <MobileDataList className="space-y-0">
            {summary.activity.map((row) => (
              <SummaryRow
                key={row.stepText}
                mobile
                leading={<StatusGlyph type={activityGlyph(row.status)} />}
                label={row.stepText}
                trailing={
                  row.dataText ? (
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      {row.dataText}
                    </span>
                  ) : undefined
                }
              />
            ))}
          </MobileDataList>
        </div>

        <div className="space-y-2">
          <p className={eyebrowClass}>{MONTHLY_CLOSE_LABELS.SUMMARY_FINANCIAL}</p>
          <MobileDataList className="space-y-0">
            {financial.map((row) => (
              <SummaryRow
                key={row.key}
                mobile
                label={row.label}
                trailing={
                  <span
                    className={cn(
                      'font-mono text-[13px] tabular-nums',
                      row.drifted ? 'text-warning' : 'text-muted-foreground',
                    )}
                  >
                    {row.mobileText}
                  </span>
                }
                note={
                  row.edgeLine === null ? undefined : (
                    <p className="text-right font-mono text-[11px] tabular-nums text-warning">
                      {row.edgeLine}
                    </p>
                  )
                }
              />
            ))}
          </MobileDataList>
        </div>

        <div className="space-y-2">
          <p className={eyebrowClass}>{MONTHLY_CLOSE_LABELS.SUMMARY_REPORTS}</p>
          <MobileDataList className="space-y-0">
            {summary.reports.map((report) => (
              <SummaryRow
                key={report.title}
                mobile
                label={report.title}
                trailing={<StatusGlyph {...reportGlyph(report.isGenerated)} />}
              />
            ))}
          </MobileDataList>
        </div>
      </div>

      <div className="hidden gap-6 md:grid lg:grid-cols-2" data-testid="close-summary-desktop">
        <div className="space-y-2">
          <p className={eyebrowClass}>{MONTHLY_CLOSE_LABELS.SUMMARY_ACTIVITY}</p>
          <ul className="space-y-1">
            {summary.activity.map((row) => (
              <li key={row.stepText}>
                <SummaryRow
                  mobile={false}
                  leading={<StatusGlyph type={activityGlyph(row.status)} />}
                  label={row.stepText}
                  trailing={
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      {row.dataText ?? MONTHLY_CLOSE_LABELS.NO_DATA}
                    </span>
                  }
                />
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className={eyebrowClass}>{MONTHLY_CLOSE_LABELS.SUMMARY_FINANCIAL}</p>
            <div className="space-y-1">
              {financial.map((row) => (
                <SummaryRow
                  key={row.key}
                  mobile={false}
                  label={row.label}
                  trailing={
                    <span
                      data-testid={`close-summary-figure-${row.key}`}
                      className={cn(
                        'font-mono text-[13px] tabular-nums',
                        row.drifted ? 'text-warning' : 'text-muted-foreground',
                      )}
                    >
                      {row.text}
                    </span>
                  }
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className={eyebrowClass}>{MONTHLY_CLOSE_LABELS.SUMMARY_REPORTS}</p>
            <div className="space-y-1">
              {summary.reports.map((report) => (
                <SummaryRow
                  key={report.title}
                  mobile={false}
                  label={report.title}
                  trailing={<StatusGlyph {...reportGlyph(report.isGenerated)} />}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {!isReadOnly && (
        <div className="space-y-3 border-t border-border pt-[26px] pb-16 pr-20 md:pb-0 md:pr-24">
          {/* The backend close gate only checks that the reports are persisted,
              so a drift that appeared after FINANCIAL_REPORTS was confirmed
              would be frozen into the closed period. The block lives here, next
              to the action it refuses (#234). */}
          {hasDrift && (
            <Alert variant="warning" data-testid="close-drift-block">
              <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-warning">{MONTHLY_CLOSE_LABELS.DRIFT_BLOCK_MESSAGE}</span>
                <Button
                  type="button"
                  variant="outline"
                  data-testid="review-reports"
                  onClick={onReviewReports}
                  className="h-8 shrink-0 px-3 text-xs font-semibold"
                >
                  {MONTHLY_CLOSE_LABELS.DRIFT_BLOCK_ACTION}
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {/* The close is the app's one irreversible step: it wears the
              destructive tone, names the period and says what closing locks. */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {MONTHLY_CLOSE_LABELS.SUMMARY_CLOSE_LOCK_HINT}
            </p>
            <Button
              data-testid="close-period-confirm"
              variant="destructive"
              onClick={() => void handleClose()}
              disabled={confirming || !isConfirmable || hasDrift}
              className="min-h-11 w-full px-[18px] text-xs font-semibold uppercase tracking-[0.08em] sm:w-auto"
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
