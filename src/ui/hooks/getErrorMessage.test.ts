import { describe, expect, it } from 'vitest';

import { getErrorMessage } from './getErrorMessage';

const FALLBACK = '發生未知錯誤';

describe('getErrorMessage', () => {
  it('returns the message of an Error', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('falls back when an Error carries no message', () => {
    expect(getErrorMessage(new Error(''))).toBe(FALLBACK);
  });

  it('returns a non-empty string as-is', () => {
    expect(getErrorMessage('offline')).toBe('offline');
  });

  it('falls back for an empty string', () => {
    expect(getErrorMessage('')).toBe(FALLBACK);
  });

  it('falls back for a plain object instead of stringifying it', () => {
    expect(getErrorMessage({ code: 'X' })).toBe(FALLBACK);
  });

  it('falls back for null and undefined', () => {
    expect(getErrorMessage(null)).toBe(FALLBACK);
    expect(getErrorMessage(undefined)).toBe(FALLBACK);
  });

  it('uses the caller-supplied fallback', () => {
    expect(getErrorMessage({ code: 'X' }, '載入失敗')).toBe('載入失敗');
  });
});
