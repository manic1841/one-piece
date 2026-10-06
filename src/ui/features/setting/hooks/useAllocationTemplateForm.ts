import { useCallback, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';

import { saveAllocationTemplateUseCase } from '@/application/ledger/use_cases/saveAllocationTemplateUseCase';
import { type AllocationTemplate } from '@/domains/allocation/templateSchemas';

import {
  AllocationTemplateFormSchema,
  type AllocationTemplateFormVM,
  createDefaultAllocationTemplateFormVM,
  mapAllocationTemplateVMToItems,
  positivePercentage,
  toAllocationTemplateFormVM,
} from '../viewmodels/allocationTemplateForm.vm';

interface UseAllocationTemplateFormArgs {
  householdId: string;
  userEmail: string;
  /** The template being edited, or `null` for a new one. */
  selectedTemplateId: string | null;
}

/**
 * Controller for the income-allocation-template form (ADR-0064 / §4). The
 * repeater lives in RHF via `useFieldArray`; the live total is a derived preview
 * read with `useWatch` (never written back). `submit` returns the saved template
 * id so the section can reload and reseed.
 */
export function useAllocationTemplateForm({
  householdId,
  userEmail,
  selectedTemplateId,
}: UseAllocationTemplateFormArgs) {
  const form = useForm<AllocationTemplateFormVM>({
    resolver: zodResolver(AllocationTemplateFormSchema),
    mode: 'onTouched',
    defaultValues: createDefaultAllocationTemplateFormVM(),
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });
  const [error, setError] = useState('');

  const watchedItems = useWatch({ control: form.control, name: 'items' });
  // Same predicate as the schema/map: only usable positive rows count toward the
  // preview, so the total shown can never drift from what `submit` accepts.
  const totalPercentage = (watchedItems ?? []).reduce((sum, item) => {
    const value = positivePercentage(item.percentage);
    return value === null ? sum : sum + value;
  }, 0);

  const appendItem = useCallback(
    (projectId: string) => {
      append({ projectId, percentage: '' });
    },
    [append],
  );

  const reset = useCallback(
    (template?: AllocationTemplate) => {
      form.reset(
        template ? toAllocationTemplateFormVM(template) : createDefaultAllocationTemplateFormVM(),
      );
    },
    [form],
  );

  /** @returns the saved template id, or `undefined` when validation or the write failed. */
  const submit = async (): Promise<string | undefined> => {
    let savedId: string | undefined;

    await form.handleSubmit(async (vm) => {
      if (!householdId || !userEmail) return;

      const parsed = AllocationTemplateFormSchema.parse(vm);
      setError('');
      try {
        const id = await saveAllocationTemplateUseCase.execute({
          householdId,
          userEmail,
          data: {
            id: selectedTemplateId ?? undefined,
            name: parsed.name,
            ledgerCode: parsed.ledgerCode,
            isDefault: parsed.isDefault,
            items: mapAllocationTemplateVMToItems(parsed),
          },
        });
        savedId = id;
      } catch (err) {
        setError('儲存失敗: ' + (err instanceof Error ? err.message : String(err)));
      }
    })();

    return savedId;
  };

  return {
    form,
    fields,
    appendItem,
    removeItem: remove,
    reset,
    submit,
    totalPercentage,
    error,
    isSubmitting: form.formState.isSubmitting,
  };
}
