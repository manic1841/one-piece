import { useEffect, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { PLAN_CREATE_PAGE_LABELS } from '@/ui/constants/retirement/planCreateLabels';
import { usePlanDraftForm } from '@/ui/features/retirement/hooks/usePlanDraftForm';
import { useRetirementPlanCmds } from '@/ui/features/retirement/hooks/useRetirementPlanCmds';
import { useSaveNameForms } from '@/ui/features/retirement/hooks/useSaveNameForms';
import { useWorkspaceLeaveGuard } from '@/ui/features/retirement/hooks/useWorkspaceLeaveGuard';
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
  const [createdId, setCreatedId] = useState<string | null>(null);
  const drafts = usePlanDraftForm();
  const { createPlan } = useRetirementPlanCmds(householdId);
  const { planForm, submitPlanForm } = useSaveNameForms();

  useWorkspaceLeaveGuard(drafts.dirty && createdId === null);

  useEffect(() => {
    if (createdId === null) return;
    navigate(`/retirement/plans/${createdId}`, { replace: true });
  }, [createdId, navigate]);

  const submit = () =>
    submitPlanForm(async (name) => {
      const draft = drafts.validateAll();
      if (draft === null) return { ok: false, messages: [PLAN_CREATE_PAGE_LABELS.INVALID] };

      const task = await createPlan({ name, ...draft });
      if (!task.ok) return { ok: false, messages: [getTaskErrorMessage(task)] };
      if (!task.value.ok) return { ok: false, messages: [PLAN_CREATE_PAGE_LABELS.FAILED] };

      setCreatedId(task.value.id);
      return { ok: true };
    });

  return {
    ...drafts,
    form: planForm,
    submit,
  };
}
