import { useCallback, useState } from 'react';

import { getRetirementAssumptionBounds } from '@/domains/retirement/bounds';
import { useAssumptionDraft } from '@/ui/features/retirement/hooks/useAssumptionDraft';
import { useLifeEventDrafts } from '@/ui/features/retirement/hooks/useLifeEventDrafts';
import { useRuleDrafts } from '@/ui/features/retirement/hooks/useRuleDrafts';
import { useWorkspaceUndo } from '@/ui/features/retirement/hooks/useWorkspaceUndo';
import { type PlanFormPreviewVM } from '@/ui/features/retirement/viewmodels/planForm.vm';
import {
  currentAgeFor,
  retirementAgeRange,
  retirementYearFor,
} from '@/ui/features/retirement/viewmodels/railIndicators.vm';
import { buildSectionState } from '@/ui/features/retirement/viewmodels/workspaceSectionState.vm';

/**
 * The three draft groups, their shared validation gate and the values the form
 * previews. Create and edit differ only in what they do with a valid draft.
 */
export function usePlanDraftForm() {
  const currentYear = new Date().getFullYear();
  const [dirty, setDirty] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const markDirty = useCallback(() => setDirty(true), []);

  const assumptions = useAssumptionDraft(markDirty, currentYear);
  const rules = useRuleDrafts(markDirty);
  const events = useLifeEventDrafts(markDirty);
  const undo = useWorkspaceUndo();

  const { values } = assumptions;

  /** A timeline gesture pushes its restore callback once, before it writes. */
  const rememberEvents = () => {
    const snapshot = events.snapshot();
    undo.push(() => events.replaceDrafts(snapshot));
  };

  const sectionState = buildSectionState({
    blockers: [],
    assumptionsInvalid: revealed && !assumptions.valid,
    rulesInvalid: revealed && !rules.valid,
    eventsInvalid: revealed && !events.valid,
  });

  const preview: PlanFormPreviewVM = {
    birthYear: Number(values.birthYear),
    lifeExpectancy: Number(values.lifeExpectancy),
    retirementYear: retirementYearFor(values.birthYear, values.retirementAge),
    ageRange: retirementAgeRange(
      currentAgeFor(values.birthYear, currentYear),
      Number(values.lifeExpectancy) || 90,
    ),
    assumptionBounds: getRetirementAssumptionBounds(currentYear),
    projectionStartYear: currentYear,
  };

  /**
   * One pass over every group, revealing each offending field. Returns the
   * three domain payloads, or `null` when a group is still invalid.
   */
  const validateAll = useCallback(() => {
    setRevealed(true);
    const parsedAssumptions = assumptions.validate();
    const parsedRules = rules.validate();
    const parsedEvents = events.validate();

    if (
      !parsedAssumptions.ok ||
      !parsedRules.ok ||
      !parsedEvents.ok ||
      parsedAssumptions.data === undefined ||
      parsedRules.data === undefined ||
      parsedEvents.data === undefined
    ) {
      assumptions.revealAll();
      rules.revealAll();
      events.revealAll();
      return null;
    }

    return {
      assumptions: parsedAssumptions.data,
      projectionRules: parsedRules.data,
      lifeEvents: parsedEvents.data,
    };
  }, [assumptions, events, rules]);

  return {
    dirty,
    assumptions,
    rules,
    events,
    preview,
    undo: { canUndo: undo.canUndo, run: undo.undo },
    sectionState,
    rememberEvents,
    validateAll,
  };
}
