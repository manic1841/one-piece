import { Metric, MetricGroup } from '@/ui/components/MetricGroup';
import { subSectionTitleClass } from '@/ui/components/eyebrow';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { PROJECTION_COMMON_LABELS } from '@/ui/constants/retirement/displayLabels';
import { PREVIEW_LABELS as LABELS } from '@/ui/constants/retirement/previewLabels';
import { PROJECTION_RESULT_LABELS } from '@/ui/constants/retirement/resultLabels';
import { PreviewRetirementComparison } from '@/ui/features/retirement/components/PreviewRetirementComparison';
import { ProjectionTrajectory } from '@/ui/features/retirement/components/ProjectionTrajectory';
import { WorkspaceSummary } from '@/ui/features/retirement/components/WorkspaceSummary';
import { YearlyDetails } from '@/ui/features/retirement/components/YearlyDetails';
import { type AssumptionsVM } from '@/ui/features/retirement/viewmodels/assumptionForm.vm';
import { type LifeEventDraftVM } from '@/ui/features/retirement/viewmodels/lifeEventForm.vm';
import { type RetirementProjectionVM } from '@/ui/features/retirement/viewmodels/projectionDisplay.vm';
import { type ProjectionSummaryVM } from '@/ui/features/retirement/viewmodels/projectionView.vm';
import { type RetirementComparisonVM } from '@/ui/features/retirement/viewmodels/retirementComparison.vm';
import { type RuleDraftVM } from '@/ui/features/retirement/viewmodels/ruleForm.vm';
import { type OpeningNetWorthVM } from '@/ui/features/retirement/viewmodels/workspaceDraft.vm';
import { formatCurrency } from '@/ui/utils';
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
            <h2 className={subSectionTitleClass}>{LABELS.OUTCOME}</h2>
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
                animatedValue={calculated.summary.retirementNetWorth}
                animateFormat={formatCurrency}
                animateOnMount
                change={yearMeta(calculated.projection.retirementYear)}
              />
              <Metric
                testId="metric-min-net-worth"
                label={PROJECTION_RESULT_LABELS.METRIC_MIN_NET_WORTH}
                value={calculated.summary.minNetWorthText}
                animatedValue={calculated.summary.minNetWorth}
                animateFormat={formatCurrency}
                animateOnMount
                tone={calculated.summary.minNetWorthNegative ? 'negative' : 'default'}
                change={yearMeta(calculated.summary.minNetWorthYear)}
              />
              <Metric
                testId="metric-final-net-worth"
                label={PROJECTION_RESULT_LABELS.METRIC_FINAL_NET_WORTH}
                value={calculated.summary.finalNetWorthText}
                animatedValue={calculated.summary.finalNetWorth}
                animateFormat={formatCurrency}
                animateOnMount
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
            <h2 className={cn(subSectionTitleClass, 'mb-4')}>
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
        <h2 className={subSectionTitleClass}>{LABELS.SETTINGS}</h2>
        <dl className="mt-3 grid gap-1.5 text-xs" data-testid="settings-facts">
          {[
            { label: LABELS.SETTINGS_START_YEAR, value: String(startYear) },
            {
              label: LABELS.SETTINGS_RETIREMENT,
              value: LABELS.RETIREMENT_RANGE(
                assumptions.retirementAge,
                birthYear + Number(assumptions.retirementAge),
                assumptions.lifeExpectancy,
              ),
            },
            {
              label: LABELS.SETTINGS_RATES,
              value: LABELS.RATES(assumptions.inflationRate, assumptions.annualReturnRate),
            },
            {
              label: LABELS.SETTINGS_VOLUME,
              value: LABELS.VOLUME(
                rules.filter((rule) => rule.ruleType === 'income').length,
                events.length,
              ),
            },
          ].map((fact) => (
            <div key={fact.label} className="flex items-baseline justify-between gap-4">
              <dt className="text-muted-foreground">{fact.label}</dt>
              <dd className="text-right tabular-nums text-foreground">{fact.value}</dd>
            </div>
          ))}
        </dl>
        <details className="mt-3 text-xs text-muted-foreground">
          <summary className="cursor-pointer py-1">{LABELS.SETTINGS_DETAILS}</summary>
          <div className="grid gap-4 pt-4">
            {appliedPlanName && (
              <p data-testid="applied-plan-name">
                {LABELS.BASED_ON} <span className="text-foreground">{appliedPlanName}</span>
              </p>
            )}
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
    </div>
  );
}
