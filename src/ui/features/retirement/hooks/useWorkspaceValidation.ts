import { useCallback } from 'react';

import { type RetirementAssumptions } from '@/domains/retirement/assumptions';
import { type LifeEvent } from '@/domains/retirement/lifeEvents';
import { type ProjectionRule } from '@/domains/retirement/projectionRules';
import { PROJECTION_RESULT_LABELS } from '@/ui/constants/retirement/resultLabels';
import {
  type OpeningNetWorthVM,
  openingSchema,
  startYearSchema,
} from '@/ui/features/retirement/viewmodels/workspaceDraft.vm';

export interface ValidatedPlan {
  assumptions: RetirementAssumptions;
  rules: ProjectionRule[];
  lifeEvents: LifeEvent[];
}

interface DraftBundle {
  assumptions: {
    validate: () => { ok: boolean; data?: RetirementAssumptions };
    revealAll: () => void;
  };
  rules: { validate: () => { ok: boolean; data?: ProjectionRule[] }; revealAll: () => void };
  events: { validate: () => { ok: boolean; data?: LifeEvent[] }; revealAll: () => void };
}

interface UseWorkspaceValidationOptions extends DraftBundle {
  opening: OpeningNetWorthVM;
  startYear: number;
}

/**
 * The workspace's validation gate. All three drafts validate in one pass so a
 * single CALCULATE reports every problem at once, and only an all-clear
 * produces a plan the commands may use.
 */
export function useWorkspaceValidation({
  assumptions,
  rules,
  events,
  opening,
  startYear,
}: UseWorkspaceValidationOptions) {
  const validateOpening = useCallback(
    (): string | undefined =>
      openingSchema.safeParse(opening).success
        ? undefined
        : PROJECTION_RESULT_LABELS.OPENING_INVALID,
    [opening],
  );

  const validateStartYear = useCallback(
    (): string | undefined =>
      startYearSchema.safeParse(startYear).success
        ? undefined
        : PROJECTION_RESULT_LABELS.START_YEAR_INVALID,
    [startYear],
  );

  const validate = useCallback(() => {
    const assumptionResult = assumptions.validate();
    const ruleResult = rules.validate();
    const eventResult = events.validate();
    const openingError = validateOpening();
    const startYearError = validateStartYear();

    return {
      ok:
        assumptionResult.ok &&
        ruleResult.ok &&
        eventResult.ok &&
        openingError === undefined &&
        startYearError === undefined,
      assumptions: assumptionResult,
      rules: ruleResult,
      events: eventResult,
      openingError,
      startYearError,
    };
  }, [assumptions, events, rules, validateOpening, validateStartYear]);

  const revealErrors = useCallback(() => {
    assumptions.revealAll();
    rules.revealAll();
    events.revealAll();
  }, [assumptions, events, rules]);

  /** Shared by CALCULATE and SAVE AS PLAN; reveals the errors on failure. */
  const takeValidatedPlan = useCallback((): ValidatedPlan | null => {
    const validation = validate();
    const { data: parsedAssumptions } = validation.assumptions;
    const { data: parsedRules } = validation.rules;
    const { data: parsedEvents } = validation.events;

    if (!validation.ok || !parsedAssumptions || !parsedRules || !parsedEvents) {
      revealErrors();
      return null;
    }

    return { assumptions: parsedAssumptions, rules: parsedRules, lifeEvents: parsedEvents };
  }, [revealErrors, validate]);

  return { validate, revealErrors, takeValidatedPlan, validateOpening, validateStartYear };
}
