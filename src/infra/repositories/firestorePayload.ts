import { type DocumentData, Timestamp } from 'firebase/firestore';

/** UTF-8 byte size of the JSON payload used for the 900 KB document guard. */
export function byteLength(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

/**
 * Firestore rejects `undefined`, so drop it recursively. Dates stay as dates;
 * the caller converts them to timestamps where the schema requires it.
 */
export function sanitize(value: unknown): unknown {
  if (value === undefined) return undefined;

  if (value instanceof Date) return value;

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
