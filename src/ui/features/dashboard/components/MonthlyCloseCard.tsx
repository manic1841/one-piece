import React from 'react';
import { useNavigate } from 'react-router-dom';

import { DASHBOARD_CLOSE_LABELS } from '@/ui/constants/dashboard/monthlyCloseStatus';
import { mapNextMonthDueText } from '@/ui/features/dashboard/viewmodels/dashboardCloseStatus.vm';
import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { ChevronRight } from 'lucide-react';

import type { NextMonthDebtDueResult } from '@/application/debt/use_cases/getNextMonthDebtDueUseCase';
import type { DashboardCloseStatusVM } from '@/ui/features/dashboard/viewmodels/dashboardCloseStatus.vm';

interface MonthlyCloseCardProps {
  vm: DashboardCloseStatusVM | null;
  loading: boolean;
  error: string | null;
  nextMonthDue: NextMonthDebtDueResult | null;
  nextMonthDueLoading: boolean;
}

export const MonthlyCloseCard: React.FC<MonthlyCloseCardProps> = ({
  vm,
  loading,
  error,
  nextMonthDue,
  nextMonthDueLoading,
}) => {
  const navigate = useNavigate();
  const nextMonthDueText = mapNextMonthDueText(nextMonthDue);

  return (
    <button
      type="button"
      onClick={() => navigate('/close')}
      className="block w-full cursor-pointer rounded-lg border border-border bg-elevated/30 backdrop-blur-sm p-6 text-left transition-colors hover:bg-elevated/50"
    >
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-medium tracking-widest text-muted-foreground">
          {DASHBOARD_CLOSE_LABELS.SECTION_TITLE}
        </p>
        <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </div>
      {loading ? (
        <div className="mt-4 h-6 w-40 animate-pulse rounded bg-muted" />
      ) : error ? (
        <p className="mt-4 text-sm text-negative">{error}</p>
      ) : vm ? (
        <div className="mt-4 space-y-3" data-testid="monthly-close-card">
          <div className="flex items-center gap-3">
            <p className="font-mono text-lg tabular-nums text-foreground">{vm.periodText}</p>
            <StatusGlyph type={vm.glyphType} label={vm.statusText} />
          </div>
          <div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                data-testid="close-progress"
                role="progressbar"
                aria-valuenow={vm.completedCount}
                aria-valuemin={0}
                aria-valuemax={vm.totalCount}
                aria-label={`${vm.completedCount} of ${vm.totalCount} close stages completed`}
                className={
                  vm.glyphType === 'verified'
                    ? 'h-full bg-positive'
                    : vm.glyphType === 'review'
                      ? 'h-full bg-warning'
                      : 'h-full bg-chart-1'
                }
                style={{ width: `${(vm.completedCount / vm.totalCount) * 100}%` }}
              />
            </div>
            <p className="mt-1.5 font-mono text-[10px] tracking-widest text-muted-foreground">
              {vm.completedCount}/{vm.totalCount}
              {vm.nextStageLabel != null && ` · NEXT ${vm.nextStageLabel}`}
            </p>
          </div>
          {nextMonthDueLoading ? (
            <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
              <span className="text-xs font-medium tracking-wider text-muted-foreground">
                下月應付
              </span>
              <div className="h-5 w-20 animate-pulse rounded bg-muted" />
            </div>
          ) : nextMonthDueText != null ? (
            <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
              <span className="text-xs font-medium tracking-wider text-muted-foreground">
                下月應付
              </span>
              <span className="font-mono text-sm tabular-nums text-foreground">
                {nextMonthDueText}
              </span>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">{DASHBOARD_CLOSE_LABELS.ENTRY_HINT}</p>
      )}
    </button>
  );
};
