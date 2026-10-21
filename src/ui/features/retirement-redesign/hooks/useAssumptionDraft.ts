import { useCallback, useMemo, useState } from 'react';

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

export interface ValidationOutcome<T, E = Partial<Record<string, string>>> {
  ok: boolean;
  data?: T;
  errors: E;
}

export function useAssumptionDraft(markDirty: () => void, currentYear = new Date().getFullYear()) {
  const [values, setValues] = useState<AssumptionsVM>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<AssumptionField, boolean>>>({});
  const [birthYearLocked, setBirthYearLocked] = useState(false);

  const schema = useMemo(() => createAssumptionsSchema(currentYear), [currentYear]);

  const setField = useCallback(
    (field: AssumptionField, text: string) => {
      setValues((current) => ({ ...current, [field]: text }));
      setTouched((current) => ({ ...current, [field]: true }));
      markDirty();
    },
    [markDirty],
  );

  const validate = useCallback((): ValidationOutcome<RetirementAssumptions> => {
    const errors: AssumptionErrors = {};
    const parsed = schema.safeParse({
      birthYear: parseField(values.birthYear),
      retirementAge: parseField(values.retirementAge),
      lifeExpectancy: parseField(values.lifeExpectancy),
      inflationRate: percentToDecimal(values.inflationRate),
      annualReturnRate: percentToDecimal(values.annualReturnRate),
    });

    if (parsed.success) return { ok: true, data: parsed.data, errors };

    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field !== 'string' || !FIELDS.includes(field as AssumptionField)) continue;
      if (errors[field as AssumptionField] === undefined) {
        errors[field as AssumptionField] = labelFor(
          issue.code,
          field as AssumptionField,
          issue.message,
        );
      }
    }
    return { ok: false, errors };
  }, [schema, values]);

  const validation = useMemo(() => validate(), [validate]);

  const visibleErrors = useMemo(() => {
    const visible: AssumptionErrors = {};
    for (const field of FIELDS) {
      if (touched[field] && validation.errors[field]) visible[field] = validation.errors[field];
    }
    return visible;
  }, [touched, validation.errors]);

  const resetFrom = useCallback((assumptions: RetirementAssumptions) => {
    setValues({
      birthYear: String(assumptions.birthYear),
      retirementAge: String(assumptions.retirementAge),
      lifeExpectancy: String(assumptions.lifeExpectancy),
      inflationRate: decimalToPercentText(assumptions.inflationRate),
      annualReturnRate: decimalToPercentText(assumptions.annualReturnRate),
    });
    setTouched({});
    setBirthYearLocked(true);
  }, []);

  return {
    values,
    errors: visibleErrors,
    birthYearLocked,
    valid: validation.ok,
    setField,
    validate,
    resetFrom,
  };
}
