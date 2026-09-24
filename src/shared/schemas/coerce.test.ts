import { describe, expect, it } from 'vitest';

import { optionalNumber, requiredNumber } from './coerce';

describe('requiredNumber', () => {
  it('coerces a numeric string to a number', () => {
    expect(requiredNumber().parse('123.45')).toBe(123.45);
    expect(requiredNumber().parse(' 42 ')).toBe(42);
    expect(requiredNumber().parse('0')).toBe(0);
    expect(requiredNumber().parse(7)).toBe(7);
  });

  it('rejects blank input instead of coercing it to 0', () => {
    expect(requiredNumber('必填').safeParse('').success).toBe(false);
    expect(requiredNumber().safeParse('   ').success).toBe(false);
  });

  it('rejects non-finite input', () => {
    expect(requiredNumber().safeParse('abc').success).toBe(false);
    expect(requiredNumber().safeParse(Number.POSITIVE_INFINITY).success).toBe(false);
    expect(requiredNumber().safeParse(Number.NaN).success).toBe(false);
  });

  it('surfaces the custom message', () => {
    const result = requiredNumber('金額不能為空').safeParse('');
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('金額不能為空');
  });
});

describe('optionalNumber', () => {
  it('treats blank input as missing, not 0', () => {
    expect(optionalNumber().parse('')).toBeUndefined();
    expect(optionalNumber().parse('   ')).toBeUndefined();
  });

  it('accepts an absent value', () => {
    expect(optionalNumber().parse(undefined)).toBeUndefined();
  });

  it('coerces a provided value', () => {
    expect(optionalNumber().parse('0')).toBe(0);
    expect(optionalNumber().parse('12.5')).toBe(12.5);
  });

  it('still rejects a non-numeric non-blank value', () => {
    expect(optionalNumber().safeParse('abc').success).toBe(false);
  });
});
