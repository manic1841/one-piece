import { useState } from 'react';

import { eyebrowClass } from '@/ui/components/eyebrow';
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
        <span className="w-6 font-mono text-[11px] text-muted-foreground">{number}</span>
        <span className="text-sm font-semibold uppercase">{title}</span>
        <span className="min-w-0 flex-1 truncate text-right text-xs text-muted-foreground">
          {text}
        </span>
        {children !== undefined && (
          <Button variant="text" size="sm" onClick={() => setOpen((value) => !value)}>
            {open ? WORKSPACE_ACTION_LABELS.HIDE_SUMMARY : WORKSPACE_ACTION_LABELS.SHOW_SUMMARY}
          </Button>
        )}
      </div>
      {open && children}
    </div>
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
  return (
    <section data-testid="workspace-summary" aria-label={WORKSPACE_ACTION_LABELS.PREVIEW_SUMMARY}>
      <p className={eyebrowClass}>{WORKSPACE_ACTION_LABELS.PREVIEW_SUMMARY}</p>

      <SummaryLine
        number={WORKSPACE_SECTION_LABELS.NUMBER_BASELINE}
        title={PROJECTION_WORKSPACE_LABELS.OPENING_SECTION}
        text={`${startYear} · ${openingAmount ?? PROJECTION_COMMON_LABELS.DASH}`}
      >
        <ul className="pt-2 text-xs text-muted-foreground">
          <li>
            {WORKSPACE_RAIL_LABELS.OPENING_SOURCE}:{' '}
            {opening.source === 'manual'
              ? WORKSPACE_RAIL_LABELS.OPENING_MANUAL
              : (opening.anchorYearMonth ?? PROJECTION_COMMON_LABELS.DASH)}
          </li>
        </ul>
      </SummaryLine>

      <SummaryLine
        number={WORKSPACE_SECTION_LABELS.NUMBER_ASSUMPTIONS}
        title={PROJECTION_WORKSPACE_LABELS.ASSUMPTIONS_SECTION}
        text={`${assumptions.birthYear} / ${assumptions.retirementAge} / ${assumptions.lifeExpectancy} · ${assumptions.inflationRate}% · ${assumptions.annualReturnRate}%`}
      >
        <ul className="pt-2 text-xs text-muted-foreground">
          <li>
            {ASSUMPTION_LABELS.BIRTH_YEAR}: {assumptions.birthYear}
          </li>
          <li>
            {ASSUMPTION_LABELS.RETIREMENT_AGE}: {assumptions.retirementAge}
          </li>
          <li>
            {ASSUMPTION_LABELS.LIFE_EXPECTANCY}: {assumptions.lifeExpectancy}
          </li>
          <li>
            {ASSUMPTION_LABELS.INFLATION_RATE}: {assumptions.inflationRate}
          </li>
          <li>
            {ASSUMPTION_LABELS.ANNUAL_RETURN_RATE}: {assumptions.annualReturnRate}
          </li>
        </ul>
      </SummaryLine>

      <SummaryLine
        number={WORKSPACE_SECTION_LABELS.NUMBER_RULES}
        title={WORKSPACE_SECTION_LABELS.RULES}
        text={`${rules.length}`}
      />

      <SummaryLine
        title={WORKSPACE_SECTION_LABELS.INCOME}
        text={`${rules.filter((rule) => rule.ruleType === 'income').length}`}
      >
        <ul className="pt-2 text-xs text-muted-foreground">
          {rules
            .filter((rule) => rule.ruleType === 'income')
            .map((rule) => (
              <li key={rule.id}>{rule.name || PROJECTION_COMMON_LABELS.DASH}</li>
            ))}
        </ul>
      </SummaryLine>

      <SummaryLine
        title={WORKSPACE_SECTION_LABELS.EXPENSE}
        text={`${rules.filter((rule) => rule.ruleType === 'expense').length}`}
      >
        <ul className="pt-2 text-xs text-muted-foreground">
          {rules
            .filter((rule) => rule.ruleType === 'expense')
            .map((rule) => (
              <li key={rule.id}>
                {rule.name || PROJECTION_COMMON_LABELS.DASH} · {labelForSource(rule.sourceId)}
              </li>
            ))}
        </ul>
      </SummaryLine>

      <SummaryLine
        number={WORKSPACE_SECTION_LABELS.NUMBER_EVENTS}
        title={PROJECTION_WORKSPACE_LABELS.EVENTS_SECTION}
        text={`${events.length}`}
      >
        <ul className="pt-2 text-xs text-muted-foreground">
          {events.map((event) => (
            <li key={event.id}>
              {event.name || PROJECTION_COMMON_LABELS.DASH} · {event.phases.length}
            </li>
          ))}
        </ul>
      </SummaryLine>
    </section>
  );
}
