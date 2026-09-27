/**
 * Number input change parsers for data-table numeric inputs.
 *
 * A blank input becomes `undefined` (missing), not `0` — same explicit
 * empty/NaN semantics as the Form VM schema boundary in shared/schemas/coerce.ts,
 * but standalone (data-table inputs are not RHF-free schema fields).
 */
export const parseOptionalAmount = (value: string): number | undefined =>
  value === '' ? undefined : Number(value);
