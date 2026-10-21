import { useCallback, useMemo, useState } from 'react';

import { type Resolver, type ResolverResult, useForm } from 'react-hook-form';

import {
  type RetirementAssumptions,
  createAssumptionsSchema,
} from '@/domains/retirement/assumptions';
import { RetirementSchemaErrorCode } from '@/domains/retirement/errorCodes';
import { ASSUMPTION_LABELS } from '@/ui/constants/retirement-redesign/setupLabels';
import { RETIREMENT_VALIDATION_LABELS } from '@/ui/constants/retirement/retirementValidationLabels';

export interface AssumptionsVM {
  birthYear: string;
  retirementAge: string;
  lifeExpectancy: string;
  inflationRate: string;
  annualReturnRate: string;
}

export type AssumptionField = keyof AssumptionsVM;

const EMPTY: AssumptionsVM = {
  birthYear: '',
  retirementAge: '',
  lifeExpectancy: '',
  inflationRate: '',
  annualReturnRate: '',
};

type AssumptionErrors = Partial<Record<AssumptionField, string>>;

const FIELDS: AssumptionField[] = [
  'birthYear',
  'retirementAge',
  'lifeExpectancy',
  'inflationRate',
  'annualReturnRate',
];

const INTEGER_FIELDS = new Set<AssumptionField>(['birthYear', 'retirementAge', 'lifeExpectancy']);

/** Field text is a percentage; the stored value is the 4 dp decimal. */
export function percentToDecimal(text: string): number {
  if (text.trim() === '') return Number.NaN;
  return Number((Number(text) / 100).toFixed(4));
}

export function decimalToPercentText(value: number): string {
  return String(Number((value * 100).toFixed(4)));
}

function parseField(text: string): number {
  if (text.trim() === '') return Number.NaN;
  return Number(text);
}

function labelFor(code: string, field: AssumptionField, message: string): string {
  if (code === 'invalid_type') {
    return INTEGER_FIELDS.has(field)
      ? RETIREMENT_VALIDATION_LABELS[RetirementSchemaErrorCode.NOT_INTEGER]
      : ASSUMPTION_LABELS.INVALID_NUMBER;
  }
  if (code !== 'custom') return ASSUMPTION_LABELS.INVALID_NUMBER;
  return RETIREMENT_VALIDATION_LABELS[message as RetirementSchemaErrorCode] ?? 'Invalid value';
}

function toDomain(values: AssumptionsVM) {
  return {
    birthYear: parseField(values.birthYear),
    retirementAge: parseField(values.retirementAge),
    lifeExpectancy: parseField(values.lifeExpectancy),
    inflationRate: percentToDecimal(values.inflationRate),
    annualReturnRate: percentToDecimal(values.annualReturnRate),
  };
}

export interface ValidationOutcome<T, E = Partial<Record<string, string>>> {
  ok: boolean;
  data?: T;
  errors: E;
}

export function useAssumptionDraft(markDirty: () => void, currentYear = new Date().getFullYear()) {
  const [birthYearLocked, setBirthYearLocked] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const schema = useMemo(() => createAssumptionsSchema(currentYear), [currentYear]);

  const parse = useCallback(
    (values: AssumptionsVM) => {
      const errors: AssumptionErrors = {};
      const parsed = schema.safeParse(toDomain(values));

      if (parsed.success) return { ok: true as const, data: parsed.data, errors };

      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field !== 'string' || !FIELDS.includes(field as AssumptionField)) continue;
        if (errors[field as AssumptionField] !== undefined) continue;
        errors[field as AssumptionField] = labelFor(
          issue.code,
          field as AssumptionField,
          issue.message,
        );
      }
      return { ok: false as const, errors };
    },
    [schema],
  );

  const resolver = useCallback<Resolver<AssumptionsVM>>(
    (values): ResolverResult<AssumptionsVM> => {
      const outcome = parse(values);
      if (outcome.ok) return { values, errors: {} };

      return {
        values,
        errors: Object.fromEntries(
          Object.entries(outcome.errors).map(([field, message]) => [
            field,
            { type: 'validation', message },
          ]),
        ),
      } as unknown as ResolverResult<AssumptionsVM>;
    },
    [parse],
  );

  const form = useForm<AssumptionsVM>({
    mode: 'onChange',
    defaultValues: EMPTY,
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

  const validate = useCallback((): ValidationOutcome<RetirementAssumptions> => {
    return parse(form.getValues());
  }, [form, parse]);

  const validation = useMemo(() => parse(values), [parse, values]);

  const errors = useMemo(() => {
    const visible: AssumptionErrors = {};
    for (const field of FIELDS) {
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
      form.reset({
        birthYear: String(assumptions.birthYear),
        retirementAge: String(assumptions.retirementAge),
        lifeExpectancy: String(assumptions.lifeExpectancy),
        inflationRate: decimalToPercentText(assumptions.inflationRate),
        annualReturnRate: decimalToPercentText(assumptions.annualReturnRate),
      });
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
