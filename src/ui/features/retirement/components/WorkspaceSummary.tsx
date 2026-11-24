import { useState } from 'react';

import { DefinitionRows } from '@/ui/components/DefinitionRows';
import { eyebrowClass, subSectionTitleClass } from '@/ui/components/eyebrow';
import { Button } from '@/ui/components/ui/button';
import { PROJECTION_COMMON_LABELS } from '@/ui/constants/retirement/displayLabels';
import { ASSUMPTION_LABELS } from '@/ui/constants/retirement/setupLabels';
import { PROJECTION_WORKSPACE_LABELS } from '@/ui/constants/retirement/workspaceLabels';
import {
  WORKSPACE_ACTION_LABELS,
  WORKSPACE_RAIL_LABELS,
  WORKSPACE_SECTION_LABELS,
} from '@/ui/constants/retirement/workspaceRailLabels';
import { type AssumptionsVM } from '@/ui/features/retirement/viewmodels/assumptionForm.vm';
import { type LifeEventDraftVM } from '@/ui/features/retirement/viewmodels/lifeEventForm.vm';
import { type RuleDraftVM } from '@/ui/features/retirement/viewmodels/ruleForm.vm';
import { type OpeningNetWorthVM } from '@/ui/features/retirement/viewmodels/workspaceDraft.vm';
import { cn } from '@/ui/utils/cn';

interface WorkspaceSummaryProps {
  startYear: number;
  opening: OpeningNetWorthVM;
  /** Opening amount already formatted, or null while it is not a number. */
  openingAmount: string | null;
  assumptions: AssumptionsVM;
  rules: RuleDraftVM[];
  events: LifeEventDraftVM[];
  labelForSource: (sourceId: string) => string;
}

function SummaryLine({
  number,
  title,
  text,
  children,
}: {
  /** Mono section number; omitted for a sub-group of the previous line. */
  number?: string;
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border py-3" data-testid={`summary-${number ?? title}`}>
      <div className="flex items-center gap-3">
        <span className={cn(eyebrowClass, 'w-6 shrink-0')}>{number}</span>
        <span className={subSectionTitleClass}>{title}</span>
        <span className="min-w-0 flex-1 truncate text-right text-xs text-muted-foreground">
          {text}
        </span>
        {children !== undefined && (
          <Button variant="text" size="sm" onClick={() => setOpen((value) => !value)}>
            {open ? WORKSPACE_ACTION_LABELS.HIDE_SUMMARY : WORKSPACE_ACTION_LABELS.SHOW_SUMMARY}
          </Button>
        )}
      </div>
      {open && children !== undefined && (
        <div className="mt-2 ml-9 border-l border-border pl-3">{children}</div>
      )}
    </div>
  );
}

/** Names of one rule side; the detail column only repeats what the row already says. */
function RuleList({
  rules,
  detail,
}: {
  rules: RuleDraftVM[];
  detail?: (rule: RuleDraftVM) => string;
}) {
  return (
    <ul className="space-y-1 text-sm">
      {rules.map((rule) => (
        <li key={rule.id} className="flex items-baseline justify-between gap-4">
          <span className="min-w-0 break-words">{rule.name || PROJECTION_COMMON_LABELS.DASH}</span>
          {detail !== undefined && (
            <span className="shrink-0 text-xs text-muted-foreground">{detail(rule)}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Read-only single-line setup recap above the preview results. */
export function WorkspaceSummary({
  startYear,
  opening,
  openingAmount,
  assumptions,
  rules,
  events,
  labelForSource,
}: WorkspaceSummaryProps) {
  const incomeRules = rules.filter((rule) => rule.ruleType === 'income');
  const expenseRules = rules.filter((rule) => rule.ruleType === 'expense');
  return (
    <section data-testid="workspace-summary" aria-label={WORKSPACE_ACTION_LABELS.PREVIEW_SUMMARY}>
      <p className={eyebrowClass}>{WORKSPACE_ACTION_LABELS.PREVIEW_SUMMARY}</p>

      <SummaryLine
        number={WORKSPACE_SECTION_LABELS.NUMBER_BASELINE}
        title={PROJECTION_WORKSPACE_LABELS.OPENING_SECTION}
        text={`${startYear} · ${openingAmount ?? PROJECTION_COMMON_LABELS.DASH}`}
      >
        <DefinitionRows
          layout="row"
          divided
          items={[
            {
              label: WORKSPACE_RAIL_LABELS.OPENING_SOURCE,
              value:
                opening.source === 'manual'
                  ? WORKSPACE_RAIL_LABELS.OPENING_MANUAL
                  : (opening.anchorYearMonth ?? PROJECTION_COMMON_LABELS.DASH),
            },
          ]}
        />
      </SummaryLine>

      <SummaryLine
        number={WORKSPACE_SECTION_LABELS.NUMBER_ASSUMPTIONS}
        title={PROJECTION_WORKSPACE_LABELS.ASSUMPTIONS_SECTION}
        text={`${assumptions.birthYear} / ${assumptions.retirementAge} / ${assumptions.lifeExpectancy} · ${assumptions.inflationRate}% · ${assumptions.annualReturnRate}%`}
      >
        <DefinitionRows
          layout="row"
          divided
          items={[
            { label: ASSUMPTION_LABELS.BIRTH_YEAR, value: assumptions.birthYear },
            { label: ASSUMPTION_LABELS.RETIREMENT_AGE, value: assumptions.retirementAge },
            { label: ASSUMPTION_LABELS.LIFE_EXPECTANCY, value: assumptions.lifeExpectancy },
            { label: ASSUMPTION_LABELS.INFLATION_RATE, value: assumptions.inflationRate },
            { label: ASSUMPTION_LABELS.ANNUAL_RETURN_RATE, value: assumptions.annualReturnRate },
          ]}
        />
      </SummaryLine>

      <SummaryLine
        number={WORKSPACE_SECTION_LABELS.NUMBER_RULES}
        title={WORKSPACE_SECTION_LABELS.INCOME}
        text={
          incomeRules.length === 0 ? WORKSPACE_ACTION_LABELS.SUMMARY_NONE : `${incomeRules.length}`
        }
      >
        {incomeRules.length === 0 ? undefined : <RuleList rules={incomeRules} />}
      </SummaryLine>

      <SummaryLine
        title={WORKSPACE_SECTION_LABELS.EXPENSE}
        text={
          expenseRules.length === 0
            ? WORKSPACE_ACTION_LABELS.SUMMARY_NONE
            : `${expenseRules.length}`
        }
      >
        {expenseRules.length === 0 ? undefined : (
          <RuleList rules={expenseRules} detail={(rule) => labelForSource(rule.sourceId)} />
        )}
      </SummaryLine>

      <SummaryLine
        number={WORKSPACE_SECTION_LABELS.NUMBER_EVENTS}
        title={PROJECTION_WORKSPACE_LABELS.EVENTS_SECTION}
        text={events.length === 0 ? WORKSPACE_ACTION_LABELS.SUMMARY_NONE : `${events.length}`}
      >
        {events.length === 0 ? undefined : (
          <ul className="space-y-1 text-sm">
            {events.map((event) => (
              <li key={event.id} className="flex items-baseline justify-between gap-4">
                <span className="min-w-0 break-words">
                  {event.name || PROJECTION_COMMON_LABELS.DASH}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {event.phases.length}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SummaryLine>
    </section>
  );
}
