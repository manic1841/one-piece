import { Metric, MetricGroup } from '@/ui/components/MetricGroup';
import { PageSection } from '@/ui/components/PageSection';
import { eyebrowClass } from '@/ui/components/eyebrow';
import { Button } from '@/ui/components/ui/button';
import { PROJECTION_COMMON_LABELS } from '@/ui/constants/retirement/displayLabels';
import { PROJECTION_VIEW_LABELS } from '@/ui/constants/retirement/projectionLabels';
import { PROJECTION_RESULT_LABELS } from '@/ui/constants/retirement/resultLabels';
import { NetWorthChart } from '@/ui/features/retirement/components/NetWorthChart';
import { type ProjectionViewVM } from '@/ui/features/retirement/viewmodels/projectionView.vm';
import { cn } from '@/ui/utils/cn';

interface ProjectionOverviewTabProps {
  view: ProjectionViewVM;
  onSelectYear: (year: number) => void;
}

const ageText = (year: number | null, birthYear: number | null): string =>
  year === null || birthYear === null ? PROJECTION_COMMON_LABELS.DASH : String(year - birthYear);

const metaLine = (year: number | null, birthYear: number | null): string =>
  `${PROJECTION_VIEW_LABELS.AGE_PREFIX} ${ageText(year, birthYear)} · ${
    year === null ? PROJECTION_COMMON_LABELS.DASH : String(year)
  }`;

/**
 * Overview tab: the verdict first, the number it rests on second, then the
 * trajectory and two supporting metrics — conclusion first, trend second.
 */
export function ProjectionOverviewTab({ view, onSelectYear }: ProjectionOverviewTabProps) {
  const { summary, projection, birthYear } = view;
  const isEmpty = projection.chartData.length === 0;
  const negativeYear = summary.bankruptcyYear;
  const minYear = summary.minNetWorthYear;
  const retirementYear = projection.retirementYear === 0 ? null : projection.retirementYear;

  const verdict = isEmpty
    ? { text: PROJECTION_VIEW_LABELS.EMPTY_RESULTS, jumpYear: null, isNegative: false }
    : negativeYear !== null
      ? {
          text: PROJECTION_VIEW_LABELS.VERDICT_DEPLETED(negativeYear, summary.finalNetWorthText),
          jumpYear: negativeYear as number | null,
          isNegative: true,
        }
      : {
          text: PROJECTION_VIEW_LABELS.VERDICT_SUSTAINED(
            view.planEndYear,
            minYear ?? view.planEndYear,
            summary.minNetWorthText,
          ),
          jumpYear: minYear,
          isNegative: false,
        };

  return (
    <div className="space-y-6" data-testid="projection-overview-tab">
      <PageSection spacing="compact">
        <p className={eyebrowClass}>{PROJECTION_VIEW_LABELS.VERDICT_EYEBROW}</p>
        <p
          className={cn(
            'mt-2 max-w-2xl text-2xl font-semibold leading-snug tracking-heading',
            verdict.isNegative ? 'text-negative' : 'text-foreground',
          )}
          data-testid={isEmpty ? 'overview-empty' : 'overview-verdict'}
        >
          {verdict.text}
        </p>
        <div
          className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1"
          data-testid="overview-retirement-net-worth"
        >
          <span className="font-mono text-sm tabular-nums text-foreground">
            {summary.retirementNetWorthText ?? PROJECTION_COMMON_LABELS.DASH}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {PROJECTION_VIEW_LABELS.RETIREMENT_OPENING_PREFIX} ·{' '}
            {metaLine(retirementYear, birthYear)}
          </span>
          {verdict.jumpYear !== null && (
            <Button
              variant="text"
              size="sm"
              className="px-0"
              onClick={() => onSelectYear(verdict.jumpYear as number)}
            >
              {PROJECTION_VIEW_LABELS.VIEW_SPECIFIC_YEAR(verdict.jumpYear)}
            </Button>
          )}
        </div>
      </PageSection>

      {!isEmpty && (
        <>
          <PageSection spacing="compact">
            <NetWorthChart projection={projection} onSelectYear={onSelectYear} />
          </PageSection>

          <PageSection spacing="compact">
            <MetricGroup columns={2}>
              <Metric
                label={PROJECTION_RESULT_LABELS.METRIC_MIN_NET_WORTH}
                value={summary.minNetWorthText}
                change={metaLine(minYear, birthYear)}
                action={
                  minYear === null ? undefined : (
                    <Button
                      variant="text"
                      size="sm"
                      className="px-0"
                      onClick={() => onSelectYear(minYear)}
                    >
                      {PROJECTION_VIEW_LABELS.VIEW_YEAR}
                    </Button>
                  )
                }
              />
              <Metric
                label={PROJECTION_RESULT_LABELS.METRIC_FINAL_NET_WORTH}
                value={summary.finalNetWorthText}
                change={metaLine(view.planEndYear === 0 ? null : view.planEndYear, birthYear)}
                action={
                  view.planEndYear === 0 ? undefined : (
                    <Button
                      variant="text"
                      size="sm"
                      className="px-0"
                      onClick={() => onSelectYear(view.planEndYear)}
                    >
                      {PROJECTION_VIEW_LABELS.VIEW_YEAR}
                    </Button>
                  )
                }
              />
            </MetricGroup>
          </PageSection>
        </>
      )}
    </div>
  );
}
