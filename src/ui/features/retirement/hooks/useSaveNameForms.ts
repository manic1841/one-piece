import { PROJECTION_WORKSPACE_LABELS } from '@/ui/constants/retirement/workspaceLabels';
import {
  type SaveNameSubmitOutcome,
  useSaveNameForm,
} from '@/ui/features/retirement/hooks/useSaveNameForm';

/**
 * The three save-name forms, as Controller state rather than part of a command
 * bundle. Each is a `react-hook-form` instance bound to the message its dialog
 * needs; the commands only supply the write.
 */
export function useSaveNameForms() {
  const planForm = useSaveNameForm(PROJECTION_WORKSPACE_LABELS.SAVE_AS_PLAN_DIALOG_NAME_REQUIRED);
  const saveForm = useSaveNameForm(PROJECTION_WORKSPACE_LABELS.SAVE_DIALOG_NAME_REQUIRED);
  const saveAsPlanForm = useSaveNameForm(
    PROJECTION_WORKSPACE_LABELS.SAVE_AS_PLAN_DIALOG_NAME_REQUIRED,
  );

  return {
    planForm: planForm.form,
    submitPlanForm: (onSubmit: (name: string) => Promise<SaveNameSubmitOutcome>) =>
      planForm.submit(onSubmit),
    saveForm: saveForm.form,
    submitSaveForm: (onSubmit: (name: string) => Promise<SaveNameSubmitOutcome>) =>
      saveForm.submit(onSubmit),
    saveAsPlanForm: saveAsPlanForm.form,
    submitSaveAsPlanForm: (onSubmit: (name: string) => Promise<SaveNameSubmitOutcome>) =>
      saveAsPlanForm.submit(onSubmit),
  };
}
