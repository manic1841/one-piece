import { Metric, MetricGroup } from '@/ui/components/MetricGroup';
import { sectionTitleClass } from '@/ui/components/eyebrow';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { PROJECTION_COMMON_LABELS } from '@/ui/constants/retirement/displayLabels';
import { PREVIEW_LABELS as LABELS } from '@/ui/constants/retirement/previewLabels';
import { PROJECTION_RESULT_LABELS } from '@/ui/constants/retirement/resultLabels';
import { PreviewRetirementComparison } from '@/ui/features/retirement/components/PreviewRetirementComparison';
import { ProjectionTrajectory } from '@/ui/features/retirement/components/ProjectionTrajectory';
import { WorkspaceNotices } from '@/ui/features/retirement/components/WorkspaceNotices';
import { WorkspaceSummary } from '@/ui/features/retirement/components/WorkspaceSummary';
import { YearlyDetails } from '@/ui/features/retirement/components/YearlyDetails';
import { type AssumptionsVM } from '@/ui/features/retirement/viewmodels/assumptionForm.vm';
import { type LifeEventDraftVM } from '@/ui/features/retirement/viewmodels/lifeEventForm.vm';
import { type RetirementProjectionVM } from '@/ui/features/retirement/viewmodels/projectionDisplay.vm';
import { type ProjectionSummaryVM } from '@/ui/features/retirement/viewmodels/projectionView.vm';
import { type RetirementComparisonVM } from '@/ui/features/retirement/viewmodels/retirementComparison.vm';
import { type RuleDraftVM } from '@/ui/features/retirement/viewmodels/ruleForm.vm';
import { type OpeningNetWorthVM } from '@/ui/features/retirement/viewmodels/workspaceDraft.vm';
import { cn } from '@/ui/utils/cn';

interface WorkspacePreviewProps {
  startYear: number;
  opening: OpeningNetWorthVM;
  openingAmount: string | null;
  assumptions: AssumptionsVM;
  rules: RuleDraftVM[];
  events: LifeEventDraftVM[];
  labelForSource: (sourceId: string) => string;
  calculateError: string | null;
  warningLabels: string[];
  calculated: { projection: RetirementProjectionVM; summary: ProjectionSummaryVM } | null;
  savedAsPlan: boolean;
  savedId: string | null;
  appliedPlanName: string | null;
  retirementComparisons: RetirementComparisonVM[];
  onApplyRetirementAge: (age: number) => void;
}

/** Results first; retirement trials stay separate until explicitly applied. */
export function WorkspacePreview({
  startYear,
  opening,
  openingAmount,
  assumptions,
  rules,
  events,
  labelForSource,
  calculateError,
  warningLabels,
  calculated,
  savedAsPlan,
  savedId,
  appliedPlanName,
  retirementComparisons,
  onApplyRetirementAge,
}: WorkspacePreviewProps) {
  const birthYear = Number(assumptions.birthYear);
  const endYear = birthYear + Number(assumptions.lifeExpectancy);
  const yearMeta = (year: number | null) =>
    year === null ? undefined : LABELS.AGE_YEAR(year - birthYear, year);
  return (
    <div className="grid gap-8">
      {calculateError !== null && (
        <Alert variant="destructive">
          <AlertDescription>{calculateError}</AlertDescription>
        </Alert>
      )}

      {calculated !== null && (
        <div className="grid gap-8" data-testid="projection-results">
          <section aria-label={LABELS.OUTCOME}>
            <h2 className={sectionTitleClass}>{LABELS.OUTCOME}</h2>
            <p
              className={cn(
                'mt-2 text-2xl font-semibold tracking-heading',
                calculated.summary.isBankrupt && 'text-negative',
              )}
            >
              {calculated.projection.chartData.length === 0
                ? LABELS.EMPTY_RESULTS
                : calculated.summary.bankruptcyYear !== null
                  ? LABELS.DEPLETED(calculated.summary.bankruptcyYear)
                  : LABELS.SUSTAINED(assumptions.lifeExpectancy)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {LABELS.PERIOD(startYear, endYear)}
            </p>
            <MetricGroup columns={3} lastSpansFull className="mt-6">
              <Metric
                testId="metric-retirement-net-worth"
                label={PROJECTION_RESULT_LABELS.METRIC_RETIREMENT_NET_WORTH}
                value={calculated.summary.retirementNetWorthText ?? PROJECTION_COMMON_LABELS.DASH}
                change={yearMeta(calculated.projection.retirementYear)}
              />
              <Metric
                testId="metric-min-net-worth"
                label={PROJECTION_RESULT_LABELS.METRIC_MIN_NET_WORTH}
                value={calculated.summary.minNetWorthText}
                tone={calculated.summary.minNetWorthNegative ? 'negative' : 'default'}
                change={yearMeta(calculated.summary.minNetWorthYear)}
              />
              <Metric
                testId="metric-final-net-worth"
                label={PROJECTION_RESULT_LABELS.METRIC_FINAL_NET_WORTH}
                value={calculated.summary.finalNetWorthText}
                tone={calculated.summary.finalNetWorthNegative ? 'negative' : 'default'}
                change={yearMeta(endYear)}
              />
            </MetricGroup>
            {warningLabels.length > 0 && (
              <details
                className="mt-5 text-xs text-muted-foreground"
                data-testid="projection-warnings"
              >
                <summary className="cursor-pointer py-1 text-warning">
                  {LABELS.WARNINGS(warningLabels.length)}
                </summary>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  {[...new Set(warningLabels)].map((warning) => (
                    <li key={warning}>
                      {warning}
                      {warningLabels.filter((item) => item === warning).length > 1
                        ? ` ×${warningLabels.filter((item) => item === warning).length}`
                        : ''}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>
          <PreviewRetirementComparison
            retirementAge={Number(assumptions.retirementAge)}
            comparisons={retirementComparisons}
            onApply={onApplyRetirementAge}
            summary={calculated.summary}
          />
          <section>
            <h2 className={cn(sectionTitleClass, 'mb-4')}>
              {PROJECTION_RESULT_LABELS.TRAJECTORY_SECTION}
            </h2>
            <ProjectionTrajectory projection={calculated.projection} />
          </section>
          <YearlyDetails
            projection={calculated.projection}
            title={PROJECTION_RESULT_LABELS.YEARS_SECTION}
          />
        </div>
      )}

      <section className="border-t border-border pt-6">
        <h2 className={sectionTitleClass}>{LABELS.SETTINGS}</h2>
        {appliedPlanName && (
          <p className="mt-2 text-xs text-muted-foreground" data-testid="applied-plan-name">
            {LABELS.BASED_ON} <span className="text-foreground">{appliedPlanName}</span>
          </p>
        )}
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {LABELS.SUMMARY(
            openingAmount ?? PROJECTION_COMMON_LABELS.DASH,
            startYear,
            assumptions.retirementAge,
            assumptions.lifeExpectancy,
            rules.length,
            events.length,
          )}
        </p>
        <details className="mt-3 text-xs text-muted-foreground">
          <summary className="cursor-pointer py-1">{LABELS.SETTINGS_DETAILS}</summary>
          <div className="pt-4">
            <WorkspaceSummary
              startYear={startYear}
              opening={opening}
              openingAmount={openingAmount}
              assumptions={assumptions}
              rules={rules}
              events={events}
              labelForSource={labelForSource}
            />
          </div>
        </details>
      </section>
      <WorkspaceNotices savedAsPlan={savedAsPlan} savedId={savedId} />
    </div>
  );
}
