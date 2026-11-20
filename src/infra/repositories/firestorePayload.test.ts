import { Timestamp, serverTimestamp } from 'firebase/firestore';
import { describe, expect, it } from 'vitest';

import { fromFirestore, sanitize, toFirestore } from './firestorePayload';

/**
 * `sanitize` sits between a domain object and a Firestore write. It must drop
 * `undefined` (Firestore rejects it) and stay on the `Date` side of the boundary:
 * a `Timestamp` reaching it means the caller converted too early.
 */
describe('sanitize', () => {
  it('keeps a Date instance', () => {
    const date = new Date('2026-01-01T00:00:00.000Z');

    expect(sanitize(date)).toBe(date);
  });

  it('drops undefined keys and array slots recursively', () => {
    const result = sanitize({
      keep: 1,
      drop: undefined,
      nested: { drop: undefined, keep: 'yes' },
      list: [1, undefined, 2],
    });

    expect(result).toEqual({ keep: 1, nested: { keep: 'yes' }, list: [1, 2] });
  });

  it('passes primitives and null through', () => {
    expect(sanitize('x')).toBe('x');
    expect(sanitize(0)).toBe(0);
    expect(sanitize(false)).toBe(false);
    expect(sanitize(null)).toBe(null);
  });

  it('throws on a Timestamp, which must be converted after sanitize', () => {
    const timestamp = Timestamp.fromDate(new Date('2026-01-01T00:00:00.000Z'));

    expect(() => sanitize({ createdAt: timestamp })).toThrow(/after sanitize, not before/);
  });

  it('throws on a FieldValue, which would otherwise flatten to `_methodName`', () => {
    expect(() => sanitize({ updatedAt: serverTimestamp() })).toThrow(/after sanitize, not before/);
  });
});

describe('toFirestore', () => {
  it('turns Dates into Timestamps, including nested ones', () => {
    const date = new Date('2026-01-01T00:00:00.000Z');

    const result = toFirestore({ createdAt: date, list: [date] }) as {
      createdAt: unknown;
      list: unknown[];
    };

    expect(result.createdAt).toBeInstanceOf(Timestamp);
    expect(result.list[0]).toBeInstanceOf(Timestamp);
  });

  it('leaves non-date values alone', () => {
    expect(toFirestore({ a: 1, b: 'x', c: null })).toEqual({ a: 1, b: 'x', c: null });
    expect(toFirestore(undefined)).toBe(undefined);
  });
});

describe('fromFirestore', () => {
  it('turns Timestamps back into Dates, including nested ones', () => {
    const date = new Date('2026-01-01T00:00:00.000Z');
    const stored = {
      createdAt: Timestamp.fromDate(date),
      list: [{ updatedAt: Timestamp.fromDate(date) }],
    };

    expect(fromFirestore(stored)).toEqual({
      createdAt: date,
      list: [{ updatedAt: date }],
    });
  });

  // The regression this pair guards: sanitize used to flatten a Timestamp, and
  // the stored map never came back as a Date.
  it('round-trips a write payload back to Dates', () => {
    const date = new Date('2026-01-01T00:00:00.000Z');
    const stored = toFirestore(sanitize({ createdAt: date, id: 'p1' }));

    expect(fromFirestore(stored as Record<string, unknown>)).toEqual({
      createdAt: date,
      id: 'p1',
    });
  });
});
