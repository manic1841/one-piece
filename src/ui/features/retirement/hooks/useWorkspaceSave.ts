import { useCallback } from 'react';

import { type PlanDraft, type ProjectionCalculation } from '@/application/retirement/types';
import { type CreateRetirementPlanOutcome } from '@/application/retirement/use_cases/createRetirementPlanUseCase';
import { type PersistProjectionOutcome } from '@/application/retirement/use_cases/persistProjectionUseCase';
import { resolveValidationIssueLabel } from '@/ui/constants/retirement/resultLabels';
import { PROJECTION_WORKSPACE_LABELS } from '@/ui/constants/retirement/workspaceLabels';
import { type PlanDraftPayload } from '@/ui/features/retirement/hooks/usePlanDrafts';
import { getTaskErrorMessage } from '@/ui/hooks/getErrorMessage';
import { type LoadingTaskResult } from '@/ui/hooks/useLoadingTask';

export interface SaveWorkspaceOutcome {
  ok: boolean;
  id?: string;
  messages?: string[];
}

interface UseWorkspaceSaveArgs {
  householdId: string | undefined;
  persist: (input: {
    name: string;
    calculation: ProjectionCalculation;
  }) => Promise<LoadingTaskResult<PersistProjectionOutcome>>;
  saveAsPlanCommand: (draft: PlanDraft) => Promise<LoadingTaskResult<CreateRetirementPlanOutcome>>;
  /** Returns `null` and reveals the field errors when the draft is invalid. */
  takeValidatedPlan: () => PlanDraftPayload | null;
  setSavedId: (id: string) => void;
  setLastSavedName: (name: string) => void;
  setSavedAsPlan: (saved: boolean) => void;
}

/**
 * The two workspace save actions. Failure text stays in the dialog; success only
 * records the outcome, and the dialog decides what to do with it.
 */
export function useWorkspaceSave({
  householdId,
  persist,
  saveAsPlanCommand,
  takeValidatedPlan,
  setSavedId,
  setLastSavedName,
  setSavedAsPlan,
}: UseWorkspaceSaveArgs) {
  const save = useCallback(
    async (
      name: string,
      calculation: ProjectionCalculation | null,
    ): Promise<SaveWorkspaceOutcome> => {
      if (calculation === null || householdId === undefined) {
        return { ok: false, messages: [PROJECTION_WORKSPACE_LABELS.SAVE_DIALOG_FAILED] };
      }

      const task = await persist({ name, calculation });
      if (!task.ok) {
        return { ok: false, messages: [getTaskErrorMessage(task)] };
      }

      const outcome = task.value;
      if (!outcome.ok) {
        return {
          ok: false,
          messages:
            outcome.issues !== undefined
              ? outcome.issues.map(resolveValidationIssueLabel)
              : [PROJECTION_WORKSPACE_LABELS.SAVE_DIALOG_FAILED],
        };
      }

      setSavedId(outcome.id);
      setLastSavedName(name);
      return { ok: true, id: outcome.id };
    },
    [householdId, persist, setLastSavedName, setSavedId],
  );

  const saveAsPlan = useCallback(
    async (name: string): Promise<SaveWorkspaceOutcome> => {
      const plan = takeValidatedPlan();
      if (plan === null) {
        return { ok: false, messages: [PROJECTION_WORKSPACE_LABELS.SAVE_AS_PLAN_INVALID] };
      }
      if (householdId === undefined) {
        return { ok: false, messages: [PROJECTION_WORKSPACE_LABELS.SAVE_DIALOG_FAILED] };
      }

      const task = await saveAsPlanCommand({
        name,
        assumptions: plan.assumptions,
        projectionRules: plan.projectionRules,
        lifeEvents: plan.lifeEvents,
      });
      if (!task.ok) {
        return { ok: false, messages: [getTaskErrorMessage(task)] };
      }

      const outcome = task.value;
      if (!outcome.ok) {
        return { ok: false, messages: [PROJECTION_WORKSPACE_LABELS.SAVE_AS_PLAN_FAILED] };
      }

      setSavedAsPlan(true);
      return { ok: true, id: outcome.id };
    },
    [householdId, saveAsPlanCommand, setSavedAsPlan, takeValidatedPlan],
  );

  return { save, saveAsPlan };
}
