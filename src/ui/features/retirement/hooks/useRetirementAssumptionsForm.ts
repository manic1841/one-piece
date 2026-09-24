import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { type UseFormReturn, useForm } from 'react-hook-form';

import { type RetirementAssumptionsDisplayVM } from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';
import {
  type RetirementAssumptionsFormInput,
  type RetirementAssumptionsFormVM,
  RetirementAssumptionsFormVMSchema,
  type RetirementPlanCreate,
  buildRetirementAssumptionsFormInput,
} from '@/ui/features/retirement/viewmodels/retirementForm.vm';

interface UseRetirementAssumptionsFormOptions {
  assumptions: RetirementAssumptionsDisplayVM;
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
}

/**
 * Controller for the plan assumptions editor (ADR-0064). RHF owns the six
 * numeric fields; `editing` is view state. Entering edit mode — and cancelling —
 * re-seed the form from the plan, so a stale draft can never be saved.
 */
export function useRetirementAssumptionsForm({
  assumptions,
  onSave,
}: UseRetirementAssumptionsFormOptions): RetirementAssumptionsFormHook {
  const [editing, setEditing] = useState(false);

  const form = useForm<RetirementAssumptionsFormInput, unknown, RetirementAssumptionsFormVM>({
    resolver: zodResolver(RetirementAssumptionsFormVMSchema),
    mode: 'onTouched',
    defaultValues: buildRetirementAssumptionsFormInput(assumptions),
  });

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
    onSave(RetirementAssumptionsFormVMSchema.parse(form.getValues()));
    setEditing(false);
  });

  return { editing, startEdit, cancel, form, submit };
}
