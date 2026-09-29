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
                    type={report.isGenerated ? 'verified' : 'waiting'}
                    label={
                      report.isGenerated
                        ? MONTHLY_CLOSE_LABELS.PERSISTED
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
        <div className="flex items-center justify-end border-t border-border pt-[26px]">
          <Button
            data-testid="close-period-confirm"
            onClick={() => void handleClose()}
            disabled={confirming || !isConfirmable}
            className="h-[38px] px-[18px] text-xs font-semibold uppercase tracking-[0.08em]"
          >
            {confirming ? MONTHLY_CLOSE_LABELS.LOADING : MONTHLY_CLOSE_LABELS.SUMMARY_CLOSE_ACTION}
          </Button>
        </div>
      )}
    </section>
  );
};
