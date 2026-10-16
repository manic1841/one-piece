import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { type UseFormReturn, useForm, useWatch } from 'react-hook-form';

import { type StartingNetWorthSource } from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';
import { type RetirementAssumptionsDisplayVM } from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';
import {
  type RetirementAssumptionPreviewVM,
  type RetirementAssumptionsFormInput,
  type RetirementAssumptionsFormVM,
  RetirementAssumptionsFormVMSchema,
  type RetirementPlan,
  type RetirementPlanCreate,
  buildRetirementAssumptionsFormInput,
  calculateRetirementAssumptionPreview,
  mapRetirementAssumptionsVMToPlanUpdates,
} from '@/ui/features/retirement/viewmodels/retirementForm.vm';

interface UseRetirementAssumptionsFormOptions {
  assumptions: RetirementAssumptionsDisplayVM;
  /** The persisted plan, used as the base for the draft-only preview projection. */
  plan: RetirementPlan;
  /** Supplies `startingNetWorth`; preview is unavailable when it lacks one. */
  netWorthSource: StartingNetWorthSource | null;
  onSave: (updates: Partial<RetirementPlanCreate>) => void;
}

export interface RetirementAssumptionsFormHook {
  /** View state: whether the read-only summary is swapped for the editor. */
  editing: boolean;
  startEdit: () => void;
  cancel: () => void;
  /** The RHF form; the component binds fields through it. */
  form: UseFormReturn<RetirementAssumptionsFormInput, unknown, RetirementAssumptionsFormVM>;
  submit: () => void;
  /** Live draft projection, or null when `startingNetWorth` is unavailable. */
  preview: RetirementAssumptionPreviewVM | null;
}

/**
 * Controller for the plan assumptions editor (ADR-0064). RHF owns the six
 * numeric fields; `editing` is view state. Entering edit mode — and cancelling —
 * re-seed the form from the plan, so a stale draft can never be saved.
 *
 * The preview recomputes on every render (no debounce; the engine is cheap) and is
 * a draft-only projection — its inputs are the watched form values plus the plan.
 */
export function useRetirementAssumptionsForm({
  assumptions,
  plan,
  netWorthSource,
  onSave,
}: UseRetirementAssumptionsFormOptions): RetirementAssumptionsFormHook {
  const [editing, setEditing] = useState(false);

  const form = useForm<RetirementAssumptionsFormInput, unknown, RetirementAssumptionsFormVM>({
    resolver: zodResolver(RetirementAssumptionsFormVMSchema),
    mode: 'onTouched',
    defaultValues: buildRetirementAssumptionsFormInput(assumptions),
  });

  const draft = useWatch({ control: form.control }) as RetirementAssumptionsFormInput;
  const startingNetWorth =
    netWorthSource && 'startingNetWorth' in netWorthSource ? netWorthSource.startingNetWorth : null;
  const preview =
    startingNetWorth === null
      ? null
      : calculateRetirementAssumptionPreview(plan, startingNetWorth, draft);

  const startEdit = () => {
    form.reset(buildRetirementAssumptionsFormInput(assumptions));
    setEditing(true);
  };

  const cancel = () => {
    form.reset(buildRetirementAssumptionsFormInput(assumptions));
    setEditing(false);
  };

  const submit = form.handleSubmit(() => {
    // The resolver only drives field display; this parse is the gate.
    onSave(
      mapRetirementAssumptionsVMToPlanUpdates(
        RetirementAssumptionsFormVMSchema.parse(form.getValues()),
      ),
    );
    setEditing(false);
  });

  return { editing, startEdit, cancel, form, submit, preview };
}
