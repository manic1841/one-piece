import React from 'react';

import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { CliProgress } from '@/ui/components/CliProgress';
import { Skeleton } from '@/ui/components/Skeleton';
import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { DASHBOARD_CLOSE_LABELS } from '@/ui/constants/dashboard/monthlyCloseStatus';
import { mapNextMonthDueText } from '@/ui/features/dashboard/viewmodels/dashboardCloseStatus.vm';
import type {
  DashboardCloseStatusVM,
  NextMonthDebtDueResult,
} from '@/ui/features/dashboard/viewmodels/dashboardCloseStatus.vm';

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
      onClick={() => navigate(vm ? `/close/${vm.yearMonth}` : '/close')}
      className="block w-full cursor-pointer rounded-lg border border-border bg-elevated/30 backdrop-blur-sm p-6 text-left transition-colors hover:bg-elevated/50"
    >
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-medium tracking-widest text-muted-foreground">
          {DASHBOARD_CLOSE_LABELS.SECTION_TITLE}
        </p>
        <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </div>
      {loading ? (
        <Skeleton className="mt-4 h-6 w-40" />
      ) : error ? (
        <p className="mt-4 text-sm text-negative">{error}</p>
      ) : vm ? (
        <div className="mt-4 space-y-4" data-testid="monthly-close-card">
          <div className="flex items-center gap-3">
            <p className="font-mono text-lg tabular-nums text-foreground">{vm.periodText}</p>
            <StatusGlyph type={vm.glyphType} label={vm.statusText} />
          </div>
          <div className="space-y-3">
            {vm.stages.map((stage, index) => (
              <div key={stage.stageId}>
                {index > 0 && <div className="mb-3 h-px bg-border" />}
                <StatusGlyph type={stage.glyphType} label={stage.label} />
              </div>
            ))}
          </div>
          <CliProgress
            value={(vm.completedCount / vm.totalCount) * 100}
            tone={
              vm.glyphType === 'verified'
                ? 'positive'
                : vm.glyphType === 'review'
                  ? 'warning'
                  : 'default'
            }
            detail={`${vm.completedCount}/${vm.totalCount}${
              vm.nextStageLabel != null ? ` · NEXT ${vm.nextStageLabel}` : ''
            }`}
            ariaLabel={`${vm.completedCount} of ${vm.totalCount} close stages completed`}
          />
          {nextMonthDueLoading ? (
            <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
              <span className="text-xs font-medium tracking-wider text-muted-foreground">
                下月應付
              </span>
              <Skeleton className="h-5 w-20" />
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
