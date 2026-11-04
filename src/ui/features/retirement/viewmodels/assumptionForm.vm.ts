import { z } from 'zod';

import {
  type RetirementAssumptions,
  createAssumptionsSchema,
} from '@/domains/retirement/assumptions';
import { RetirementSchemaErrorCode } from '@/domains/retirement/errorCodes';
import { ASSUMPTION_LABELS } from '@/ui/constants/retirement/setupLabels';
import { RETIREMENT_VALIDATION_LABELS } from '@/ui/constants/retirement/validationLabels';

const FIELD_NAMES = [
  'birthYear',
  'retirementAge',
  'lifeExpectancy',
  'inflationRate',
  'annualReturnRate',
] as const;

const INTEGER_FIELDS = new Set<AssumptionField>(['birthYear', 'retirementAge', 'lifeExpectancy']);

export type AssumptionField = (typeof FIELD_NAMES)[number];

export const ASSUMPTION_FIELDS: readonly AssumptionField[] = FIELD_NAMES;

export const AssumptionTextSchema = z.object({
  birthYear: z.string(),
  retirementAge: z.string(),
  lifeExpectancy: z.string(),
  inflationRate: z.string(),
  annualReturnRate: z.string(),
});

export type AssumptionsVM = z.infer<typeof AssumptionTextSchema>;

export type AssumptionErrors = Partial<Record<AssumptionField, string>>;

/**
 * A new draft starts from a usable scenario instead of five empty boxes, so the
 * user edits values rather than transcribing them.
 */
export const DEFAULT_ASSUMPTIONS_VM: AssumptionsVM = {
  birthYear: '1995',
  retirementAge: '65',
  lifeExpectancy: '100',
  inflationRate: '2',
  annualReturnRate: '5',
};

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

function isAssumptionField(value: PropertyKey): value is AssumptionField {
  return typeof value === 'string' && (FIELD_NAMES as readonly string[]).includes(value);
}

/** The only VM -> domain path; the schema gate and the submit both use it. */
export function mapAssumptionsVMToDomain(vm: AssumptionsVM): RetirementAssumptions {
  return {
    birthYear: parseField(vm.birthYear),
    retirementAge: parseField(vm.retirementAge),
    lifeExpectancy: parseField(vm.lifeExpectancy),
    inflationRate: percentToDecimal(vm.inflationRate),
    annualReturnRate: percentToDecimal(vm.annualReturnRate),
  };
}

export function mapAssumptionsToVM(assumptions: RetirementAssumptions): AssumptionsVM {
  return {
    birthYear: String(assumptions.birthYear),
    retirementAge: String(assumptions.retirementAge),
    lifeExpectancy: String(assumptions.lifeExpectancy),
    inflationRate: decimalToPercentText(assumptions.inflationRate),
    annualReturnRate: decimalToPercentText(assumptions.annualReturnRate),
  };
}

/**
 * Form VM schema. Range and cross-field rules stay in the domain schema; this
 * schema only re-attributes their issue paths to VM fields so a single parse
 * can drive the resolver, the submit gate and the error display.
 */
export function createAssumptionFormSchema(currentYear: number) {
  const domainSchema = createAssumptionsSchema(currentYear);

  return AssumptionTextSchema.superRefine((value, ctx) => {
    const parsed = domainSchema.safeParse(mapAssumptionsVMToDomain(value));
    if (parsed.success) return;

    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (!isAssumptionField(field)) continue;
      ctx.addIssue({ ...issue, path: [field] });
    }
  });
}

export function assumptionErrorLabel(
  code: string,
  field: AssumptionField,
  message: string,
): string {
  const known = RETIREMENT_VALIDATION_LABELS[message as RetirementSchemaErrorCode];
  if (known !== undefined) return known;
  if (code === 'invalid_type' && INTEGER_FIELDS.has(field)) {
    return RETIREMENT_VALIDATION_LABELS[RetirementSchemaErrorCode.NOT_INTEGER];
  }
  return ASSUMPTION_LABELS.INVALID_NUMBER;
}

/** First label per field wins; later issues for the same field are noise. */
export function collectAssumptionErrors(error: z.ZodError): AssumptionErrors {
  const errors: AssumptionErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (!isAssumptionField(field) || errors[field] !== undefined) continue;
    errors[field] = assumptionErrorLabel(issue.code, field, issue.message);
  }

  return errors;
}
