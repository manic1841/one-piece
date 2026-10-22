import { DangerZone } from '@/ui/components/DangerZone';
import { DefinitionRows } from '@/ui/components/DefinitionRows';
import { PageSection } from '@/ui/components/PageSection';
import { EVENT_LABELS } from '@/ui/constants/retirement/eventLabels';
import { PLAN_DETAIL_LABELS } from '@/ui/constants/retirement/planLabels';
import { RULE_LABELS } from '@/ui/constants/retirement/setupLabels';
import {
  type PlanEventVM,
  type PlanRuleVM,
  type RetirementPlanVM,
} from '@/ui/features/retirement/viewmodels/retirementPlan.vm';

function RuleBlock({ rule }: { rule: PlanRuleVM }) {
  return (
    <div data-testid="plan-rule" className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{rule.name}</h3>
      <DefinitionRows
        divided
        items={[
          { label: RULE_LABELS.RULE_TYPE, value: rule.side },
          { label: RULE_LABELS.METHOD, value: rule.method },
          { label: RULE_LABELS.SOURCE, value: rule.source },
          { label: RULE_LABELS.END_CONDITION, value: rule.endCondition },
          { label: RULE_LABELS.KEEPS_PACE_DETAIL, value: rule.keepsPace },
          { label: RULE_LABELS.BASELINE_POLICY, value: rule.baselinePolicy },
          { label: rule.parameterLabel, value: rule.parameter },
          { label: 'State', value: rule.enabled },
        ]}
      />
    </div>
  );
}

function EventBlock({ event }: { event: PlanEventVM }) {
  return (
    <div data-testid="plan-event" className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{event.name}</h3>
      <DefinitionRows
        divided
        items={[
          { label: EVENT_LABELS.TYPE, value: event.type },
          { label: 'State', value: event.enabled },
        ]}
      />

      <h4 className="pt-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        {PLAN_DETAIL_LABELS.PHASES}
      </h4>
      <dl className="grid gap-3">
        {event.phases.map((phase) => (
          <div key={phase.key} className="grid gap-1 border-b border-border pb-3">
            <dt className="text-sm font-medium text-foreground">{phase.name}</dt>
            <dd className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-3">
              <span>
                {PLAN_DETAIL_LABELS.START_YEAR}: {phase.startYear}
              </span>
              <span>
                {PLAN_DETAIL_LABELS.END_YEAR}: {phase.endYear}
              </span>
              <span>
                {PLAN_DETAIL_LABELS.AMOUNT}: {phase.amount}
              </span>
              <span className="sm:col-span-3">
                {PLAN_DETAIL_LABELS.GROWTH_RATE}: {phase.growthRate}
              </span>
            </dd>
          </div>
        ))}
      </dl>
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
  return (
    <div className="space-y-8 pb-20">
      <PageSection title={PLAN_DETAIL_LABELS.ASSUMPTIONS_SECTION} spacing="compact">
        <DefinitionRows items={plan.assumptions} />
      </PageSection>

      <PageSection title={PLAN_DETAIL_LABELS.RULES_SECTION} spacing="compact">
        {plan.rules.length === 0 ? (
          <p className="text-sm text-muted-foreground">{PLAN_DETAIL_LABELS.RULES_EMPTY}</p>
        ) : (
          <div className="grid gap-6">
            {plan.rules.map((rule) => (
              <RuleBlock key={rule.id} rule={rule} />
            ))}
          </div>
        )}
      </PageSection>

      <PageSection title={PLAN_DETAIL_LABELS.EVENTS_SECTION} spacing="compact">
        {plan.events.length === 0 ? (
          <p className="text-sm text-muted-foreground">{PLAN_DETAIL_LABELS.EVENTS_EMPTY}</p>
        ) : (
          <div className="grid gap-6">
            {plan.events.map((event) => (
              <EventBlock key={event.id} event={event} />
            ))}
          </div>
        )}
      </PageSection>

      {canDelete && <DangerZone actionLabel={PLAN_DETAIL_LABELS.DANGER_ZONE} onAction={onDelete} />}
    </div>
  );
}
