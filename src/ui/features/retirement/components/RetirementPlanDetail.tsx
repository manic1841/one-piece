import { DangerZone } from '@/ui/components/DangerZone';
import { FinancialNumber } from '@/ui/components/FinancialNumber';
import { Metric, MetricGroup } from '@/ui/components/MetricGroup';
import { PageSection } from '@/ui/components/PageSection';
import { eyebrowClass } from '@/ui/components/eyebrow';
import { PLAN_DETAIL_LABELS } from '@/ui/constants/retirement/planLabels';
import { LifeEventTimeline } from '@/ui/features/retirement/components/LifeEventTimeline';
import { type RetirementPlanVM } from '@/ui/features/retirement/viewmodels/retirementPlan.vm';
import { cn } from '@/ui/utils/cn';

interface PlanRuleListProps {
  groups: RetirementPlanVM['ruleGroups'];
}

/** One row per rule: the name over the behaviour sentence, no per-column labels. */
function PlanRuleList({ groups }: PlanRuleListProps) {
  return (
    <div className="grid gap-5">
      {groups.map((group) => (
        <section key={group.key} className="grid gap-1" aria-label={group.title}>
          <p className={cn(eyebrowClass, 'flex items-baseline gap-2')}>
            {group.title}
            <span className="font-mono text-muted-foreground/70">{group.rows.length}</span>
          </p>
          <ul>
            {group.rows.map((rule) => (
              <li
                key={rule.id}
                data-testid="plan-rule"
                className={cn(
                  'grid gap-0.5 border-b border-border py-2 last:border-b-0',
                  rule.isDisabled && 'opacity-60',
                )}
              >
                <span className="text-sm text-foreground">
                  {rule.name}
                  {rule.isDisabled && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {PLAN_DETAIL_LABELS.RULE_DISABLED}
                    </span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">{rule.summary}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

interface RetirementPlanDetailProps {
  plan: RetirementPlanVM;
  canDelete: boolean;
  onDelete: () => void;
}

/** Read-only plan body. The header (and rename) belongs to the page. */
export function RetirementPlanDetail({ plan, canDelete, onDelete }: RetirementPlanDetailProps) {
  const hasEvents = plan.events.length > 0;

  return (
    <div className="space-y-8 pb-20">
      <PageSection spacing="compact" ariaLabel={PLAN_DETAIL_LABELS.SCENARIO_SECTION}>
        <p className={eyebrowClass}>{PLAN_DETAIL_LABELS.SCENARIO_SECTION}</p>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <FinancialNumber value={plan.scenario.retirementYearText} size="hero" />
          <span className="text-sm text-muted-foreground">{plan.scenario.distanceText}</span>
        </div>
        <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">
          {plan.scenario.spanText}
        </p>
      </PageSection>

      <PageSection spacing="compact" title={PLAN_DETAIL_LABELS.ASSUMPTIONS_SECTION}>
        <MetricGroup columns={5} lastSpansFull className="-mx-3 md:-mx-5">
          {plan.assumptions.map((item) => (
            <Metric key={item.label} label={item.label} value={item.value} />
          ))}
        </MetricGroup>
      </PageSection>

      <PageSection
        spacing="compact"
        title={PLAN_DETAIL_LABELS.RULES_SECTION}
        action={
          plan.ruleCount === 0 ? undefined : (
            <span className="font-mono text-[11px] text-muted-foreground">
              {PLAN_DETAIL_LABELS.RULES_TRAILING(plan.ruleCount)}
            </span>
          )
        }
      >
        {plan.ruleCount === 0 ? (
          <p className="text-sm text-muted-foreground">{PLAN_DETAIL_LABELS.RULES_EMPTY}</p>
        ) : (
          <PlanRuleList groups={plan.ruleGroups} />
        )}
      </PageSection>

      <PageSection
        spacing="compact"
        title={PLAN_DETAIL_LABELS.EVENTS_SECTION}
        action={
          hasEvents ? (
            <span className="font-mono text-[11px] text-muted-foreground">
              {PLAN_DETAIL_LABELS.EVENTS_TRAILING(plan.events.length)}
            </span>
          ) : undefined
        }
      >
        {hasEvents ? (
          <LifeEventTimeline
            events={plan.events}
            startYear={plan.timeline.startYear}
            endYear={plan.timeline.endYear}
            retirementYear={plan.timeline.retirementYear}
          />
        ) : (
          <p className="text-sm text-muted-foreground">{PLAN_DETAIL_LABELS.EVENTS_EMPTY}</p>
        )}
      </PageSection>

      {canDelete && <DangerZone actionLabel={PLAN_DETAIL_LABELS.DANGER_ZONE} onAction={onDelete} />}
    </div>
  );
}
