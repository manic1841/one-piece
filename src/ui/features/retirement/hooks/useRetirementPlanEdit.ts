import { useEffect, useRef, useState } from 'react';

import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { type UpdateRetirementPlanOutcome } from '@/application/retirement/use_cases/updateRetirementPlanUseCase';
import { PLAN_EDIT_LABELS } from '@/ui/constants/retirement/planLabels';
import { usePlanDraftForm } from '@/ui/features/retirement/hooks/usePlanDraftForm';
import { usePlanResource } from '@/ui/features/retirement/hooks/usePlanResource';
import { useRetirementPlanAccess } from '@/ui/features/retirement/hooks/useRetirementPlanAccess';
import { useRetirementPlanCmds } from '@/ui/features/retirement/hooks/useRetirementPlanCmds';
import { useSaveNameForms } from '@/ui/features/retirement/hooks/useSaveNameForms';
import { useWorkspaceLeaveGuard } from '@/ui/features/retirement/hooks/useWorkspaceLeaveGuard';
import { getTaskErrorMessage } from '@/ui/hooks/getErrorMessage';

type UpdateFailureCode = Extract<UpdateRetirementPlanOutcome, { ok: false }>['code'];

/**
 * `NAME_REQUIRED` is absent on purpose: the name field's resolver rejects a blank
 * name before submit runs.
 */
const UPDATE_FAILURE_LABELS: Partial<Record<UpdateFailureCode, string>> = {
  NAME_TOO_LONG: PLAN_EDIT_LABELS.NAME_TOO_LONG,
  PLAN_NOT_FOUND: PLAN_EDIT_LABELS.NOT_FOUND_CODE,
  PLAN_INVALID: PLAN_EDIT_LABELS.INVALID_PLAN,
  PLAN_TOO_LARGE: PLAN_EDIT_LABELS.INVALID_PLAN,
};

/**
 * Controller for the plan form in edit mode. The same draft groups and single
 * validation gate as create; the plan is seeded once, its birth year stays
 * locked, and submit replaces the stored document in full.
 */
export function useRetirementPlanEdit(householdId: string | undefined) {
  const navigate = useNavigate();
  const resource = usePlanResource(householdId);
  const { canManage } = useRetirementPlanAccess(householdId);
  const [saved, setSaved] = useState(false);
  const seededRef = useRef(false);

  const drafts = usePlanDraftForm();
  const { updatePlan } = useRetirementPlanCmds(householdId);
  const { planForm, submitPlanForm } = useSaveNameForms();
  const { assumptions, rules, events } = drafts;

  useWorkspaceLeaveGuard(drafts.dirty && !saved);

  // Seed once: re-seeding on every refetch would drop the user's edits.
  useEffect(() => {
    const plan = resource.plan;
    if (plan === null || seededRef.current) return;
    seededRef.current = true;
    assumptions.resetFrom(plan.assumptions);
    rules.replaceAll(plan.projectionRules);
    events.replaceAll(plan.lifeEvents);
    planForm.reset({ name: plan.name });
  }, [assumptions, events, planForm, resource.plan, rules]);

  const submit = () =>
    submitPlanForm(async (name) => {
      if (resource.planId === null) {
        return { ok: false, messages: [PLAN_EDIT_LABELS.NOT_FOUND_CODE] };
      }

      const draft = drafts.validateAll();
      if (draft === null) return { ok: false, messages: [PLAN_EDIT_LABELS.INVALID] };

      const task = await updatePlan(resource.planId, { name, ...draft });
      if (!task.ok) return { ok: false, messages: [getTaskErrorMessage(task)] };
      if (!task.value.ok) {
        return {
          ok: false,
          messages: [UPDATE_FAILURE_LABELS[task.value.code] ?? PLAN_EDIT_LABELS.SAVE_FAILED],
        };
      }

      setSaved(true);
      toast.success(PLAN_EDIT_LABELS.SAVED);
      navigate(resource.back, { replace: true });
      return { ok: true };
    });

  return {
    ...drafts,
    form: planForm,
    submit,
    canManage,
    loading: resource.loading,
    errorMessage: resource.errorMessage,
    notFound: resource.notFound,
    back: resource.back,
    reload: resource.reload,
  };
}
