import { useCallback, useMemo, useState } from 'react';

import { type Resolver, type ResolverResult, useForm } from 'react-hook-form';

import { type RetirementAssumptions } from '@/domains/retirement/assumptions';
import {
  ASSUMPTION_FIELDS,
  type AssumptionErrors,
  type AssumptionField,
  type AssumptionsVM,
  DEFAULT_ASSUMPTIONS_VM,
  collectAssumptionErrors,
  createAssumptionFormSchema,
  mapAssumptionsToVM,
  mapAssumptionsVMToDomain,
} from '@/ui/features/retirement/viewmodels/assumptionForm.vm';
import { type ValidationOutcome } from '@/ui/features/retirement/viewmodels/formValidation';

export function useAssumptionDraft(markDirty: () => void, currentYear = new Date().getFullYear()) {
  const [birthYearLocked, setBirthYearLocked] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const schema = useMemo(() => createAssumptionFormSchema(currentYear), [currentYear]);

  const resolver = useCallback<Resolver<AssumptionsVM>>(
    (values): ResolverResult<AssumptionsVM> => {
      const parsed = schema.safeParse(values);
      if (parsed.success) return { values, errors: {} };

      const fieldErrors: Record<string, { type: string; message: string }> = {};
      for (const [field, message] of Object.entries(collectAssumptionErrors(parsed.error))) {
        fieldErrors[field] = { type: 'validation', message };
      }

      return { values, errors: fieldErrors } as unknown as ResolverResult<AssumptionsVM>;
    },
    [schema],
  );

  const form = useForm<AssumptionsVM>({
    mode: 'onChange',
    defaultValues: DEFAULT_ASSUMPTIONS_VM,
    resolver,
  });

  const values = form.watch();

  const setField = useCallback(
    (field: AssumptionField, text: string) => {
      form.setValue(field, text, { shouldTouch: true, shouldDirty: true, shouldValidate: true });
      markDirty();
    },
    [form, markDirty],
  );

  const validate = useCallback((): ValidationOutcome<RetirementAssumptions, AssumptionErrors> => {
    const parsed = schema.safeParse(form.getValues());
    if (parsed.success) {
      return { ok: true, data: mapAssumptionsVMToDomain(parsed.data), errors: {} };
    }
    return { ok: false, errors: collectAssumptionErrors(parsed.error) };
  }, [form, schema]);

  const validation = useMemo<{ ok: boolean; errors: AssumptionErrors }>(() => {
    const parsed = schema.safeParse(values);
    return parsed.success
      ? { ok: true, errors: {} }
      : { ok: false, errors: collectAssumptionErrors(parsed.error) };
  }, [schema, values]);

  const errors = useMemo(() => {
    const visible: AssumptionErrors = {};
    for (const field of ASSUMPTION_FIELDS) {
      const error = form.formState.errors[field]?.message;
      const show =
        revealed || form.formState.touchedFields[field] || form.formState.dirtyFields[field];
      if (!show) continue;
      if (typeof error === 'string') visible[field] = error;
      else if (validation.errors[field] !== undefined) visible[field] = validation.errors[field];
    }
    return visible;
  }, [
    form.formState.dirtyFields,
    form.formState.errors,
    form.formState.touchedFields,
    revealed,
    validation.errors,
  ]);

  const resetFrom = useCallback(
    (assumptions: RetirementAssumptions) => {
      form.reset(mapAssumptionsToVM(assumptions));
      setBirthYearLocked(true);
      setRevealed(false);
    },
    [form],
  );

  /** CALCULATE reveals every field error, not only the touched ones. */
  const revealAll = useCallback(() => {
    setRevealed(true);
    void form.trigger();
  }, [form]);

  return {
    form,
    values,
    errors,
    birthYearLocked,
    valid: validation.ok,
    setField,
    validate,
    revealAll,
    resetFrom,
  };
}
