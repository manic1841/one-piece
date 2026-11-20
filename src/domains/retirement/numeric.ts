import { z } from 'zod';

import { RetirementSchemaErrorCode } from './errorCodes';

const MAX_DECIMAL_PLACES = 4;
const DECIMAL_EPSILON = 1e-9;

export function hasMoreThanFourDecimalPlaces(value: number): boolean {
  return (
    Math.abs(value * 10 ** MAX_DECIMAL_PLACES - Math.round(value * 10 ** MAX_DECIMAL_PLACES)) >
    DECIMAL_EPSILON
  );
}

export function integerField(min: number, max: number) {
  return z.number().superRefine((value, ctx) => {
    if (!Number.isInteger(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: RetirementSchemaErrorCode.NOT_INTEGER,
      });
      return;
    }
    if (value < min || value > max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: RetirementSchemaErrorCode.OUT_OF_RANGE,
        params: { min, max },
      });
    }
  });
}

interface DecimalFieldOptions {
  belowCode?: string;
  aboveCode?: string;
  tooManyCode?: string;
  /** Treat `min` as exclusive (used by ratios: `> 0`). */
  minExclusive?: boolean;
}

/**
 * Decimal field with caller-emitted issue codes, so bespoke wording stays a
 * schema concern instead of a re-implemented superRefine.
 */
export function decimalField(min: number, max: number, options: DecimalFieldOptions = {}) {
  const {
    belowCode = RetirementSchemaErrorCode.OUT_OF_RANGE,
    aboveCode = RetirementSchemaErrorCode.OUT_OF_RANGE,
    tooManyCode = RetirementSchemaErrorCode.TOO_MANY_DECIMAL_PLACES,
    minExclusive = false,
  } = options;

  return z.number().superRefine((value, ctx) => {
    if (!Number.isFinite(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: aboveCode,
        params: { min, max },
      });
      return;
    }
    const below = minExclusive ? value <= min : value < min;
    if (below) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: belowCode,
        params: minExclusive ? { minExclusive: min } : { min, max },
      });
      return;
    }
    if (value > max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: aboveCode,
        params: { min, max },
      });
    }
    if (hasMoreThanFourDecimalPlaces(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: tooManyCode,
      });
    }
  });
}

export function addIssue(
  ctx: z.RefinementCtx,
  message: string,
  path: (string | number)[] = [],
  params?: Record<string, unknown>,
): void {
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message,
    path,
    params,
  });
}
