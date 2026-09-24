import { zodResolver } from '@hookform/resolvers/zod';
import { type UseFormReturn, useFieldArray, useForm, useWatch } from 'react-hook-form';

import type { RetirementOneTimeEvent } from '@/domains/retirement/types';
import {
  type RetirementEventFormInput,
  type RetirementEventFormVM,
  RetirementEventFormVMSchema,
  buildRetirementEventFormInput,
  mapRetirementEventVMToDomain,
} from '@/ui/features/retirement/viewmodels/retirementForm.vm';

import { useRetirementDialogForm } from './useRetirementDialogForm';

interface UseRetirementEventDialogOptions {
  initialData?: RetirementOneTimeEvent;
  currentYear: number;
  onSave: (event: Omit<RetirementOneTimeEvent, 'id'>) => Promise<void>;
}

export interface RetirementEventDialogHook {
  open: boolean;
  setOpen: (value: boolean) => void;
  loading: boolean;
  /** The RHF form; the component binds fields through it. */
  form: UseFormReturn<RetirementEventFormInput, unknown, RetirementEventFormVM>;
  values: RetirementEventFormInput;
  /** Row identities for the phase repeater keys. */
  phaseFields: { id: string }[];
  handleAddPhase: () => void;
  handleRemovePhase: (index: number) => void;
  handleSubmit: (event: React.FormEvent) => void;
}

/**
 * Controller for the one-time event dialog (ADR-0064). RHF owns the editable
 * fields including the `phases` repeater (via `useFieldArray`); submit runs the
 * authoritative `Schema.parse` gate before the mapper and the use case.
 */
export function useRetirementEventDialog({
  initialData,
  currentYear,
  onSave,
}: UseRetirementEventDialogOptions): RetirementEventDialogHook {
  const initialForm = buildRetirementEventFormInput(initialData, currentYear);

  const form = useForm<RetirementEventFormInput, unknown, RetirementEventFormVM>({
    resolver: zodResolver(RetirementEventFormVMSchema),
    mode: 'onTouched',
    defaultValues: initialForm,
  });

  const { open, setOpen, loading, setLoading } = useRetirementDialogForm({
    resetOnOpen: () => form.reset(buildRetirementEventFormInput(initialData, currentYear)),
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'phases' });

  const watched = useWatch({ control: form.control });
  const values = (watched ?? initialForm) as RetirementEventFormInput;

  const handleAddPhase = () => {
    append({
      name: `Phase ${fields.length + 1}`,
      startYear: String(currentYear),
      endYear: String(currentYear),
      amount: '',
      growthRate: '',
    });
  };

  const handleRemovePhase = (index: number) => remove(index);

  const onSubmit = form.handleSubmit(async () => {
    setLoading(true);
    try {
      // The resolver only drives field display; this parse is the gate.
      const vm = RetirementEventFormVMSchema.parse(form.getValues());
      await onSave(mapRetirementEventVMToDomain(vm));
      setOpen(false);
    } catch (error) {
      console.error('Failed to save event:', error);
    } finally {
      setLoading(false);
    }
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void onSubmit();
  };

  return {
    open,
    setOpen,
    loading,
    form,
    values,
    phaseFields: fields,
    handleAddPhase,
    handleRemovePhase,
    handleSubmit,
  };
}
