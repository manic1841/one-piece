import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { type UseFormReturn, useForm } from 'react-hook-form';
import { ZodError } from 'zod';

import type { RetirementOneTimeEvent } from '@/domains/retirement/types';
import { showToast } from '@/ui/components/Toast';
import { RetirementEventsLabels as L } from '@/ui/constants/retirement/retirementWorkspaceLabels';
import {
  type RetirementPhaseFormInput,
  type RetirementPhaseFormVM,
  RetirementPhaseFormVMSchema,
  buildRetirementPhaseFormInput,
  mapRetirementPhaseVMToDomain,
} from '@/ui/features/retirement/viewmodels/retirementForm.vm';
import { logger } from '@/utils/logger';

import { useRetirementDialogForm } from './useRetirementDialogForm';

type RetirementEventPhase = RetirementOneTimeEvent['phases'][number];

interface UseRetirementPhaseEditorOptions {
  initialData?: RetirementEventPhase;
  currentYear: number;
  onSave: (phase: RetirementEventPhase) => Promise<void>;
}

export interface RetirementPhaseEditorHook {
  open: boolean;
  setOpen: (value: boolean) => void;
  loading: boolean;
  /** The RHF form; the component binds the five phase fields through it (ADR-0064). */
  form: UseFormReturn<RetirementPhaseFormInput, unknown, RetirementPhaseFormVM>;
  submitError: string | null;
  handleSubmit: (event: React.FormEvent) => void;
}

/**
 * Controller for the single-phase side editor (ADR-0064)。RHF owns the phase fields;
 * submit runs the authoritative `Schema.parse` gate before the mapper and the use
 * case. 明示 Save 編輯器**不給 Undo**（spec #301 §2.4），成功給 toast。
 */
export function useRetirementPhaseEditor({
  initialData,
  currentYear,
  onSave,
}: UseRetirementPhaseEditorOptions): RetirementPhaseEditorHook {
  const buildInput = (): RetirementPhaseFormInput =>
    buildRetirementPhaseFormInput(initialData, currentYear);

  const form = useForm<RetirementPhaseFormInput, unknown, RetirementPhaseFormVM>({
    resolver: zodResolver(RetirementPhaseFormVMSchema),
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

  const onSubmit = form.handleSubmit(async () => {
    setLoading(true);
    setSubmitError(null);
    try {
      // The resolver only drives field display; this parse is the gate.
      const vm = RetirementPhaseFormVMSchema.parse(form.getValues());
      await onSave(mapRetirementPhaseVMToDomain(vm));
      showToast(L.savedPhase);
      setOpen(false);
    } catch (error) {
      if (error instanceof ZodError) {
        setSubmitError(error.issues[0]?.message ?? L.loadError);
      } else {
        setSubmitError(error instanceof Error ? error.message : L.loadError);
      }
      logger.error('Phase save failed', 'retirement/useRetirementPhaseEditor', {
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

  return { open, setOpen, loading, form, submitError, handleSubmit };
}
