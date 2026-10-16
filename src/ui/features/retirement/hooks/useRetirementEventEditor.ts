import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { type UseFormReturn, useFieldArray, useForm } from 'react-hook-form';
import { ZodError } from 'zod';

import type { RetirementOneTimeEvent } from '@/domains/retirement/types';
import { showToast } from '@/ui/components/Toast';
import { RetirementEventsLabels as L } from '@/ui/constants/retirement/retirementWorkspaceLabels';
import {
  type RetirementEventFormInput,
  type RetirementEventFormVM,
  RetirementEventFormVMSchema,
  buildRetirementEventFormInput,
  mapRetirementEventVMToDomain,
} from '@/ui/features/retirement/viewmodels/retirementForm.vm';
import { logger } from '@/utils/logger';

import { useRetirementDialogForm } from './useRetirementDialogForm';

interface UseRetirementEventEditorOptions {
  initialData?: RetirementOneTimeEvent;
  currentYear: number;
  onSave: (event: Omit<RetirementOneTimeEvent, 'id'>) => Promise<void>;
}

export interface RetirementEventEditorHook {
  open: boolean;
  setOpen: (value: boolean) => void;
  loading: boolean;
  /** The RHF form; the component binds event + phase fields through it (ADR-0064). */
  form: UseFormReturn<RetirementEventFormInput, unknown, RetirementEventFormVM>;
  /** Row identities for the phase repeater keys. */
  phaseFields: { id: string }[];
  handleAddPhase: () => void;
  handleRemovePhase: (index: number) => void;
  submitError: string | null;
  handleSubmit: (event: React.FormEvent) => void;
}

/**
 * Controller for the life-event side editor (ADR-0064). RHF owns the event fields and
 * the `phases` repeater (via `useFieldArray`); submit runs the authoritative
 * `Schema.parse` gate before the mapper and the use case. 明示 Save 編輯器**不給 Undo**
 * （spec #301 §2.4），成功給 toast。
 */
export function useRetirementEventEditor({
  initialData,
  currentYear,
  onSave,
}: UseRetirementEventEditorOptions): RetirementEventEditorHook {
  const buildInput = (): RetirementEventFormInput =>
    buildRetirementEventFormInput(initialData, currentYear);

  const form = useForm<RetirementEventFormInput, unknown, RetirementEventFormVM>({
    resolver: zodResolver(RetirementEventFormVMSchema),
    mode: 'onTouched',
    defaultValues: buildInput(),
  });

  const [submitError, setSubmitError] = useState<string | null>(null);

  const { open, setOpen, loading, setLoading } = useRetirementDialogForm({
    resetOnOpen: () => {
      form.reset(buildInput());
      setSubmitError(null);
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'phases' });

  const handleAddPhase = () => {
    append({
      name: '',
      startYear: String(currentYear),
      endYear: String(currentYear),
      amount: '',
      growthRate: '',
    });
  };

  const handleRemovePhase = (index: number) => remove(index);

  const onSubmit = form.handleSubmit(async () => {
    setLoading(true);
    setSubmitError(null);
    try {
      // The resolver only drives field display; this parse is the gate.
      const vm = RetirementEventFormVMSchema.parse(form.getValues());
      await onSave(mapRetirementEventVMToDomain(vm));
      showToast(L.savedEvent);
      setOpen(false);
    } catch (error) {
      if (error instanceof ZodError) {
        setSubmitError(error.issues[0]?.message ?? L.loadError);
      } else {
        setSubmitError(error instanceof Error ? error.message : L.loadError);
      }
      logger.error('Event save failed', 'retirement/useRetirementEventEditor', {
        error: error instanceof Error ? error.message : String(error),
      });
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
    phaseFields: fields,
    handleAddPhase,
    handleRemovePhase,
    submitError,
    handleSubmit,
  };
}
