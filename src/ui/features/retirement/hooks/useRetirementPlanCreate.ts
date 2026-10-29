import { useCallback, useEffect, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { getRetirementAssumptionBounds } from '@/domains/retirement/bounds';
import { PLAN_CREATE_LABELS } from '@/ui/constants/retirement/planCreateLabels';
import { useAssumptionDraft } from '@/ui/features/retirement/hooks/useAssumptionDraft';
import { useLifeEventDrafts } from '@/ui/features/retirement/hooks/useLifeEventDrafts';
import { useRetirementPlanCmds } from '@/ui/features/retirement/hooks/useRetirementPlanCmds';
import { useRuleDrafts } from '@/ui/features/retirement/hooks/useRuleDrafts';
import { useWorkspaceLeaveGuard } from '@/ui/features/retirement/hooks/useWorkspaceLeaveGuard';
import { useWorkspaceUndo } from '@/ui/features/retirement/hooks/useWorkspaceUndo';
import {
  currentAgeFor,
  retirementAgeRange,
  retirementYearFor,
} from '@/ui/features/retirement/viewmodels/railIndicators.vm';
import { buildSectionState } from '@/ui/features/retirement/viewmodels/workspaceSectionState.vm';
import { getTaskErrorMessage } from '@/ui/hooks/getErrorMessage';

/**
 * Controller for the standalone plan form. It edits the same three draft groups
 * the workspace does, without an opening balance or a start year: a plan is a
 * template, so nothing here resolves against accounting data.
 *
 * Validation runs in one pass on submit and reveals every offending field, the
 * same gate `SAVE AS PLAN` uses. The page is left only after the plan exists,
 * so the leave guard never fires on the success path.
 */
export function useRetirementPlanCreate(householdId: string | undefined) {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [dirty, setDirty] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const markDirty = useCallback(() => setDirty(true), []);
  const { createPlan, planForm, submitPlanForm } = useRetirementPlanCmds(householdId);
  const assumptions = useAssumptionDraft(markDirty, currentYear);
  const rules = useRuleDrafts(markDirty);
  const events = useLifeEventDrafts(markDirty);
  const undo = useWorkspaceUndo();

  useWorkspaceLeaveGuard(dirty && createdId === null);

  /** A timeline gesture pushes its restore callback once, before it writes. */
  const rememberEvents = () => {
    const snapshot = events.snapshot();
    undo.push(() => events.replaceDrafts(snapshot));
  };

  useEffect(() => {
    if (createdId === null) return;
    navigate(`/retirement/plans/${createdId}`, { replace: true });
  }, [createdId, navigate]);

  const values = assumptions.values;
  const birthYear = Number(values.birthYear);
  const lifeExpectancy = Number(values.lifeExpectancy);

  const sectionState = buildSectionState({
    blockers: [],
    assumptionsInvalid: revealed && !assumptions.valid,
    rulesInvalid: revealed && !rules.valid,
    eventsInvalid: revealed && !events.valid,
  });

  const submit = () =>
    submitPlanForm(async (name) => {
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
        return { ok: false, messages: [PLAN_CREATE_LABELS.INVALID] };
      }

      const task = await createPlan({
        name,
        assumptions: parsedAssumptions.data,
        projectionRules: parsedRules.data,
        lifeEvents: parsedEvents.data,
      });
      if (!task.ok) return { ok: false, messages: [getTaskErrorMessage(task)] };
      if (!task.value.ok) return { ok: false, messages: [PLAN_CREATE_LABELS.FAILED] };

      setCreatedId(task.value.id);
      return { ok: true };
    });

  return {
    form: planForm,
    submit,
    dirty,
    assumptions,
    rules,
    events,
    derived: {
      birthYear,
      lifeExpectancy,
      retirementYear: retirementYearFor(values.birthYear, values.retirementAge),
      ageRange: retirementAgeRange(
        currentAgeFor(values.birthYear, currentYear),
        lifeExpectancy || 90,
      ),
      assumptionBounds: getRetirementAssumptionBounds(currentYear),
      projectionStartYear: currentYear,
    },
    undo: { canUndo: undo.canUndo, run: undo.undo, push: undo.push },
    sectionState,
    rememberEvents,
  };
}
