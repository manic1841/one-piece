import { type DocumentData, FieldValue, Timestamp } from 'firebase/firestore';

import { DOCUMENT_MAX_BYTES } from '@/shared/documentSize';

export { DOCUMENT_MAX_BYTES };

/** UTF-8 byte size of the JSON payload used for the document guard. */
export function byteLength(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

export function isDocumentTooLarge(value: unknown): boolean {
  return byteLength(value) > DOCUMENT_MAX_BYTES;
}

/**
 * Firestore rejects `undefined`, so drop it recursively. Dates stay as dates.
 *
 * Firestore values (`Timestamp`, `FieldValue`) are rejected rather than kept.
 * They are structurally plain objects — `Object.keys(Timestamp.fromDate(d))` is
 * `['seconds', 'nanoseconds']`, `Object.keys(serverTimestamp())` is
 * `['_methodName']` — so walking them silently flattens them into an untyped
 * map that Firestore stores as a map and `fromFirestore` cannot turn back into a
 * `Date`. Sorting it out here would mean this function guessing which fields
 * mean what. The order is therefore fixed: `sanitize` the `Date`-typed domain
 * object, then `toFirestore`.
 */
export function sanitize(value: unknown): unknown {
  if (value === undefined) return undefined;

  if (value instanceof Date) return value;

  if (value instanceof Timestamp || value instanceof FieldValue) {
    throw new Error(
      `sanitize: Firestore values must be converted after sanitize, not before (got ${value.constructor.name}). Sanitize the Date-typed object, then call toFirestore.`,
    );
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item)).filter((item) => item !== undefined);
  }

  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value)
      .map(([key, entry]) => [key, sanitize(entry)] as const)
      .filter(([, entry]) => entry !== undefined);

    return Object.fromEntries(entries);
  }

  return value;
}

/** Dates to Timestamps on the way out. Always run this *after* `sanitize`. */
export function toFirestore(data: unknown): unknown {
  if (data instanceof Date) return Timestamp.fromDate(data);
  if (Array.isArray(data)) return data.map((entry) => toFirestore(entry));
  if (data && typeof data === 'object') {
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, toFirestore(value)]),
    );
  }
  return data;
}

/** Timestamps back to `Date` before a domain schema sees the document. */
export function fromFirestore(data: DocumentData): unknown {
  if (data instanceof Timestamp) return data.toDate();
  if (data instanceof Date) return data;
  if (Array.isArray(data)) return data.map((entry) => fromFirestore(entry));
  if (data && typeof data === 'object') {
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, fromFirestore(value)]),
    );
  }
  return data;
}
