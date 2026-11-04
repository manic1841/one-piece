import { READINESS_BLOCKER_LABELS } from '@/ui/constants/retirement/workspaceRailLabels';
import { type ReadinessBlocker } from '@/ui/features/retirement/viewmodels/workspaceReadiness.vm';

/** What one numbered band reports about itself; absent when it reports nothing. */
export interface SectionState {
  status?: 'error';
  hint?: string;
}

export interface SectionStateInput {
  blockers: ReadinessBlocker[];
  openingValidationError?: string;
  assumptionsInvalid: boolean;
  rulesInvalid: boolean;
  eventsInvalid: boolean;
}

export type SectionStates = Record<
  'baseline' | 'assumptions' | 'rules' | 'events',
  SectionState | undefined
>;

/**
 * Puts each readiness blocker on the band it belongs to, so the action bar does
 * not have to restate them.
 *
 * Two rules keep it quiet: a missing value (unresolved opening, no income rule)
 * is a gap, not an error, so it gets a hint and no glyph; and the global
 * `schema` blocker is hung only on the band that actually holds an invalid row,
 * never repeated on all three.
 */
export const buildSectionState = ({
  blockers,
  openingValidationError,
  assumptionsInvalid,
  rulesInvalid,
  eventsInvalid,
}: SectionStateInput): SectionStates => {
  const blocked = (blocker: ReadinessBlocker) => blockers.includes(blocker);

  const baseline: SectionState = {};
  if (openingValidationError !== undefined) baseline.status = 'error';
  // The field prints its own error, so the band only carries the empty case.
  if (openingValidationError === undefined && blocked('opening')) {
    baseline.hint = READINESS_BLOCKER_LABELS.opening;
  }

  const assumptions: SectionState = {};
  if (assumptionsInvalid) {
    assumptions.status = 'error';
    assumptions.hint = READINESS_BLOCKER_LABELS.schema;
  }

  const rules: SectionState = {};
  if (rulesInvalid) {
    rules.status = 'error';
    rules.hint = READINESS_BLOCKER_LABELS.schema;
  } else if (blocked('noIncome')) {
    rules.hint = READINESS_BLOCKER_LABELS.noIncome;
  }

  const events: SectionState = {};
  if (eventsInvalid) {
    events.status = 'error';
    events.hint = READINESS_BLOCKER_LABELS.schema;
  }

  const defined = (state: SectionState) =>
    state.status === undefined && state.hint === undefined ? undefined : state;

  return {
    baseline: defined(baseline),
    assumptions: defined(assumptions),
    rules: defined(rules),
    events: defined(events),
  };
};
