import { Metric } from '@/ui/components/MetricGroup';
import { eyebrowClass } from '@/ui/components/eyebrow';
import { PROJECTION_COMMON_LABELS } from '@/ui/constants/retirement/displayLabels';
import { WORKSPACE_RAIL_LABELS } from '@/ui/constants/retirement/workspaceRailLabels';
import { type RailIndicators } from '@/ui/features/retirement/viewmodels/railIndicators.vm';
import { cn } from '@/ui/utils/cn';

interface WorkspaceRailProps {
  indicators: RailIndicators;
  retirementYear: number | null;
  finalYear: number | null;
  onJumpToYear: (year: number) => void;
  className?: string;
}

/** Year affordance under a metric: jumps the timeline window to that year. */
function JumpYear({ year, onJump }: { year: number; onJump: (year: number) => void }) {
  return (
    <button
      type="button"
      className="text-muted-foreground text-xs underline-offset-2 hover:underline"
      aria-label={WORKSPACE_RAIL_LABELS.JUMP_TO_YEAR.replace('{year}', String(year))}
      onClick={() => onJump(year)}
    >
      {year}
    </button>
  );
}

/**
 * Derived summary rail. Readiness and the opening value stay out because the
 * action bar and the baseline section already carry them.
 */
export function WorkspaceRail({
  indicators,
  retirementYear,
  finalYear,
  onJumpToYear,
  className,
}: WorkspaceRailProps) {
  const muted = indicators.status === 'stale';

  return (
    <aside
      data-testid="workspace-rail"
      className={cn('grid content-start gap-6 md:border-l md:border-border md:pl-6', className)}
    >
      <section className="hidden gap-2 md:grid" data-testid="rail-indicators">
        <span className={eyebrowClass}>
          {WORKSPACE_RAIL_LABELS.METRICS}
          {indicators.status === 'stale' && (
            <span className="ml-2 normal-case text-muted-foreground">
              {WORKSPACE_RAIL_LABELS.METRICS_OUTDATED}
            </span>
          )}
        </span>
        <p className="text-xs text-muted-foreground">
          {retirementYear === null
            ? PROJECTION_COMMON_LABELS.DASH
            : `${WORKSPACE_RAIL_LABELS.RETIREMENT_YEAR} ${retirementYear}`}
        </p>
        <div className="-mx-3 grid md:-mx-5">
          <Metric
            label={WORKSPACE_RAIL_LABELS.METRIC_RETIREMENT}
            value={indicators.retirementNetWorthText ?? PROJECTION_COMMON_LABELS.DASH}
            className={cn(muted && 'opacity-60')}
            action={
              retirementYear === null ? undefined : (
                <JumpYear year={retirementYear} onJump={onJumpToYear} />
              )
            }
          />
          <Metric
            label={WORKSPACE_RAIL_LABELS.METRIC_MIN}
            value={indicators.minNetWorthText ?? PROJECTION_COMMON_LABELS.DASH}
            className={cn(muted && 'opacity-60')}
            action={
              indicators.minNetWorthYear === null ? undefined : (
                <JumpYear year={indicators.minNetWorthYear} onJump={onJumpToYear} />
              )
            }
          />
          <Metric
            label={WORKSPACE_RAIL_LABELS.METRIC_FINAL}
            value={indicators.finalNetWorthText ?? PROJECTION_COMMON_LABELS.DASH}
            className={cn(muted && 'opacity-60')}
            action={
              finalYear === null ? undefined : <JumpYear year={finalYear} onJump={onJumpToYear} />
            }
          />
        </div>
        {indicators.status === 'error' && indicators.reason !== null && (
          <p className="text-xs text-muted-foreground">{indicators.reason}</p>
        )}
      </section>
    </aside>
  );
}
