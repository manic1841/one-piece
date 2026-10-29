import { useCallback } from 'react';

import { defaultProjectionName } from '@/shared/projectionName';
import { type useProjectionCalculate } from '@/ui/features/retirement/hooks/useProjectionCalculate';
import { type useProjectionCmds } from '@/ui/features/retirement/hooks/useProjectionCmds';
import { type useSaveNameForms } from '@/ui/features/retirement/hooks/useSaveNameForms';
import {
  type SaveWorkspaceOutcome,
  useWorkspaceSave,
} from '@/ui/features/retirement/hooks/useWorkspaceSave';
import { type useWorkspaceUndo } from '@/ui/features/retirement/hooks/useWorkspaceUndo';
import { type useWorkspaceValidation } from '@/ui/features/retirement/hooks/useWorkspaceValidation';

type Commands = ReturnType<typeof useProjectionCmds>;
type Forms = ReturnType<typeof useSaveNameForms>;

interface UseWorkspaceSaveFlowArgs {
  householdId: string | undefined;
  /** Only the command fields saving needs; the rest of the command bag is unused. */
  cmds: Pick<Commands, 'persist' | 'saveWorkspaceAsPlan'>;
  /** Save-name forms, owned by the caller as Controller state. */
  forms: Pick<Forms, 'saveForm' | 'submitSaveForm' | 'planForm' | 'submitPlanForm'>;
  takeValidatedPlan: ReturnType<typeof useWorkspaceValidation>['takeValidatedPlan'];
  calculated: ReturnType<typeof useProjectionCalculate>['calculated'];
  undo: ReturnType<typeof useWorkspaceUndo>;
  setSavedId: (id: string | null) => void;
  setLastSavedName: (name: string | null) => void;
  setSavedAsPlan: (saved: boolean) => void;
}

/** Saving a workspace and saving it as a reusable plan: both write only on SAVE. */
export function useWorkspaceSaveFlow({
  householdId,
  cmds,
  forms,
  takeValidatedPlan,
  calculated,
  undo,
  setSavedId,
  setLastSavedName,
  setSavedAsPlan,
}: UseWorkspaceSaveFlowArgs) {
  const { save: saveAction, saveAsPlan } = useWorkspaceSave({
    householdId,
    persist: cmds.persist,
    saveAsPlanCommand: cmds.saveWorkspaceAsPlan,
    takeValidatedPlan,
    setSavedId,
    setLastSavedName: (name) => {
      setLastSavedName(name);
      undo.clear();
    },
    setSavedAsPlan,
  });

  const save = useCallback(
    async (name: string): Promise<SaveWorkspaceOutcome> =>
      saveAction(name, calculated === null ? null : calculated.calculation),
    [calculated, saveAction],
  );

  return {
    save,
    saveAsPlan,
    defaultName: defaultProjectionName,
    saveForm: forms.saveForm,
    submitSave: (onSuccess?: () => void) =>
      forms.submitSaveForm(async (name) => {
        const outcome = await save(name);
        if (outcome.ok) onSuccess?.();
        return outcome;
      }),
    saveAsPlanForm: forms.planForm,
    submitSaveAsPlan: (onSuccess?: () => void) =>
      forms.submitPlanForm(async (name) => {
        const outcome = await saveAsPlan(name);
        if (outcome.ok) onSuccess?.();
        return outcome;
      }),
  };
}
