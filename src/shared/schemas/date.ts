import { z } from 'zod';

/**
 * A persisted timestamp.
 *
 * In memory, and as it comes out of Firestore, this is a `Date`. Once a document
 * has been through `JSON.stringify` — which is what the household backup file is
 * — the same instant arrives as an ISO-8601 string. Accepting both and
 * normalizing to `Date` keeps one timestamp concept across the round-trip: a
 * restored document comes back with the type it was written as.
 *
 * The alternative — scanning a payload for date-shaped strings — cannot work,
 * because the file format is ambiguous: an ISO string is a timestamp for
 * `household.members[uid].joinedAt` and a plain string for
 * `retirementPlans[].incomes[].calculatedFrom.importedAt`. Only the schema knows
 * which, so the schema is where the decision belongs.
 *
 * The zone designator is required (`Z` or `±hh:mm`), so a zone-less `…T08:00:00`
 * cannot be read as a different instant by accident, and `2026-10-08` is not a
 * timestamp.
 */
export const TimestampSchema = z.union([
  z.date(),
  z.iso.datetime({ offset: true }).transform((value) => new Date(value)),
]);

export type Timestamp = z.infer<typeof TimestampSchema>;
