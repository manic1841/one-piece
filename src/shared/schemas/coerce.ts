import { z } from 'zod';

/**
 * String→number coercion helpers for Form VM schemas.
 *
 * Form inputs are native and RHF-free, so a field value arrives as a `string`
 * (see ADR-0065). Numeric VM fields therefore coerce at the schema boundary.
 *
 * Do **not** reach for a blanket `z.coerce.number()`: `Number('') === 0` and
 * `Number(null) === 0`, so an untouched field would silently become `0`. These
 * helpers make the empty/NaN semantics explicit.
 */

const trim = (value: string | number): string | number =>
  typeof value === 'string' ? value.trim() : value;

/** Number that must be present. Blank input and non-finite values are errors. */
export const requiredNumber = (message = '此欄位為必填') =>
  z
    .union([z.string(), z.number()])
    .transform(trim)
    .refine((value) => value !== '' && Number.isFinite(Number(value)), { error: message })
    .transform((value) => Number(value));

/** Number that may be absent. Blank input becomes `undefined` (missing), not `0`. */
export const optionalNumber = (message = '請輸入有效數字') =>
  z
    .union([z.string(), z.number()])
    .transform(trim)
    .refine((value) => value === '' || Number.isFinite(Number(value)), { error: message })
    .transform((value) => (value === '' ? undefined : Number(value)))
    .optional();

/**
 * Text that may be absent. An empty input becomes `undefined` (missing), not
 * `''`, so downstream `??`/`||` fallbacks and optional payload fields behave the
 * same as when the caller omitted the key. Whitespace is preserved.
 */
export const optionalText = () =>
  z.string().transform((value) => (value === '' ? undefined : value));
