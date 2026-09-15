import { z } from 'zod';

import { BaseSchema } from '@/shared/schemas/base';

// [DOMAIN ENTITY]
// WatchListTarget is one explicitly watched object for settlement completeness
// checks (ADR-0048). The watch list is an independent domain: the list itself is
// data, the completeness check is a later derived behavior.
// Path: households/{householdId}/watchList/{docId}

export const WatchListTargetType = z.enum(['PROJECT', 'LEDGER_CODE', 'DEBT_ACCOUNT']);
export type WatchListTargetType = z.infer<typeof WatchListTargetType>;

export const WATCH_LIST_TARGET_TYPES = WatchListTargetType.options;

export const WatchListTargetCreateSchema = z.object({
  targetType: WatchListTargetType,
  targetId: z.string().min(1),
  name: z.string().min(1),
});

export type WatchListTargetCreate = z.infer<typeof WatchListTargetCreateSchema>;

export const WatchListTargetSchema = BaseSchema.extend(WatchListTargetCreateSchema.shape);
export type WatchListTarget = z.infer<typeof WatchListTargetSchema>;

/**
 * Doc ID namespaced by target type so PROJECT/LEDGER_CODE/DEBT_ACCOUNT ids live
 * in one collection without colliding. Ledger codes contain ':' themselves, so
 * ':' is the only safe separator here.
 */
export const buildWatchListDocId = (
  targetType: WatchListTargetType,
  targetId: string,
): string => `${targetType}:${targetId}`;
