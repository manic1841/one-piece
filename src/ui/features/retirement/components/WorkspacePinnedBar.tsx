import { PROJECTION_COMMON_LABELS } from '@/ui/constants/retirement/displayLabels';
import {
  READINESS_BLOCKER_LABELS,
  WORKSPACE_RAIL_LABELS,
} from '@/ui/constants/retirement/workspaceRailLabels';
import { type RailIndicators } from '@/ui/features/retirement/viewmodels/railIndicators.vm';
import { type Readiness } from '@/ui/features/retirement/viewmodels/workspaceReadiness.vm';

interface WorkspacePinnedBarProps {
  readiness: Readiness;
  indicators: RailIndicators;
  onJumpToYear: (year: number) => void;
}

/**
 * Mobile only: readiness and the three core metrics stay pinned directly
 * above the action bar so a decision never needs a scroll to the rail.
 */
export function WorkspacePinnedBar({
  readiness,
  indicators,
  onJumpToYear,
}: WorkspacePinnedBarProps) {
  const muted = indicators.status === 'stale' || indicators.status === 'idle';
  const value = (text: string | null) => (
    <span className={muted ? 'text-muted-foreground' : undefined}>
      {text ?? PROJECTION_COMMON_LABELS.DASH}
    </span>
  );

  return (
    <div
      data-testid="workspace-pinned-bar"
      className="material-chrome grid gap-1 border-t border-border py-2 text-xs md:hidden"
    >
      <p className="text-muted-foreground">
        {readiness.ready
          ? WORKSPACE_RAIL_LABELS.READY
          : readiness.blockers.map((blocker) => READINESS_BLOCKER_LABELS[blocker]).join(' ')}
      </p>
      {indicators.status !== 'idle' && (
        <dl className="flex flex-wrap gap-x-4 gap-y-1 font-mono tabular-nums">
          <div className="flex gap-1">
            <dt className="text-muted-foreground">{WORKSPACE_RAIL_LABELS.METRIC_RETIREMENT}</dt>
            <dd>{value(indicators.retirementNetWorthText)}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-muted-foreground">{WORKSPACE_RAIL_LABELS.METRIC_MIN}</dt>
            <dd>{value(indicators.minNetWorthText)}</dd>
            {indicators.minNetWorthYear !== null && (
              <button
                type="button"
                className="underline-offset-2 hover:underline"
                onClick={() => onJumpToYear(indicators.minNetWorthYear ?? 0)}
              >
                {indicators.minNetWorthYear}
              </button>
            )}
          </div>
          <div className="flex gap-1">
            <dt className="text-muted-foreground">{WORKSPACE_RAIL_LABELS.METRIC_FINAL}</dt>
            <dd>{value(indicators.finalNetWorthText)}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}
