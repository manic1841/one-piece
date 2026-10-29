import { useEffect, useRef, useState } from 'react';

import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { type PlanDraft } from '@/application/retirement/types';
import { PLAN_EDIT_LABELS } from '@/ui/constants/retirement/planLabels';
import { useNameField } from '@/ui/features/retirement/hooks/useNameField';
import { usePlanDrafts } from '@/ui/features/retirement/hooks/usePlanDrafts';
import { PLAN_LIST_HREF, usePlanResource } from '@/ui/features/retirement/hooks/usePlanResource';
import { useRetirementPlanAccess } from '@/ui/features/retirement/hooks/useRetirementPlanAccess';
import { useWorkspaceLeaveGuard } from '@/ui/features/retirement/hooks/useWorkspaceLeaveGuard';
import { getTaskErrorMessage } from '@/ui/hooks/getErrorMessage';
import { type LoadingTaskResult } from '@/ui/hooks/useLoadingTask';

/** What a plan write answers: an id when it created one, a code when it refused. */
type WriteOutcome = { ok: true; id?: string } | { ok: false; code: string };

export interface PlanFormSubmitOutcome {
  ok: boolean;
  messages?: string[];
}

interface UsePlanFormArgs {
  householdId: string | undefined;
  /**
   * The write itself. Create and edit differ only here, so the form never learns
   * which use case it is talking to.
   */
  submit: (
    name: string,
    draft: Omit<PlanDraft, 'name'>,
  ) => Promise<LoadingTaskResult<WriteOutcome>>;
  /** Shown when a draft group is still invalid, before anything is written. */
  invalidMessage: string;
  /** Shown when a failure carries no code the form has a message for. */
  fallbackMessage: string;
  /** Confirmation toast on success; the wording differs between create and edit. */
  successMessage: string;
}

/** Write failures that have their own message. */
const FAILURE_LABELS: Partial<Record<string, string>> = {
  NAME_TOO_LONG: PLAN_EDIT_LABELS.NAME_TOO_LONG,
  PLAN_NOT_FOUND: PLAN_EDIT_LABELS.NOT_FOUND_CODE,
  PLAN_INVALID: PLAN_EDIT_LABELS.INVALID_PLAN,
  PLAN_TOO_LARGE: PLAN_EDIT_LABELS.PLAN_TOO_LARGE,
};

/**
 * The plan form. One form for both routes: `/plans/new` has no plan to seed and
 * starts blank, `/plans/:id/edit` seeds once and locks the birth year. Every
 * other difference — the name of the write, where success lands — follows from
 * the route, so neither page carries a branch.
 */
export function usePlanForm({
  householdId,
  submit,
  invalidMessage,
  fallbackMessage,
  successMessage,
}: UsePlanFormArgs) {
  const navigate = useNavigate();
  const resource = usePlanResource(householdId);
  const { canManage } = useRetirementPlanAccess(householdId);
  const [saved, setSaved] = useState(false);
  const seededRef = useRef(false);

  const drafts = usePlanDrafts();
  const { field: nameForm, seed: seedName, submit: submitName } = useNameField();
  const routePlanId = resource.planId;
  /** Where BACK goes: the plan itself when the route names one, else the list. */
  const back = routePlanId === null ? PLAN_LIST_HREF : `${PLAN_LIST_HREF}/${routePlanId}`;

  useWorkspaceLeaveGuard(drafts.dirty && !saved);

  // Seed once: re-seeding on every refetch would drop the user's edits.
  useEffect(() => {
    const plan = resource.plan;
    if (plan === null || seededRef.current) return;
    seededRef.current = true;
    drafts.replaceAll({
      assumptions: plan.assumptions,
      projectionRules: plan.projectionRules,
      lifeEvents: plan.lifeEvents,
    });
    seedName(plan.name);
  }, [drafts, resource.plan, seedName]);

  const submitForm = () =>
    submitName(async (name) => {
      const draft = drafts.takeValidated();
      if (draft === null) return { ok: false, messages: [invalidMessage] };

      const task = await submit(name, draft);
      if (!task.ok) return { ok: false, messages: [getTaskErrorMessage(task, fallbackMessage)] };
      if (!task.value.ok) {
        return { ok: false, messages: [FAILURE_LABELS[task.value.code] ?? fallbackMessage] };
      }

      // Marked first: the leave guard reads `saved`, so navigating would block itself.
      setSaved(true);
      toast.success(successMessage);
      // A create has no route plan to return to, so it lands on the one it just made.
      navigate(routePlanId === null ? `${PLAN_LIST_HREF}/${task.value.id ?? ''}` : back, {
        replace: true,
      });
      return { ok: true };
    });

  return {
    ...drafts,
    form: nameForm,
    submit: submitForm,
    saved,
    canManage,
    readOnly: !canManage,
    // A route with no id is a create, so it can never be "not found".
    notFound: routePlanId !== null && resource.notFound,
    loading: resource.loading,
    errorMessage: resource.errorMessage,
    back,
    reload: resource.reload,
  };
}
