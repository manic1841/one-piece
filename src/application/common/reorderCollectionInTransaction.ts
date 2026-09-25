import { type Transaction, doc, runTransaction } from 'firebase/firestore';

import { ReorderCommandError, ReorderCommandErrorCode } from '@/application/common/reorderErrors';
import { db } from '@/firebase';

export interface ReorderEntry {
  id: string;
  order: number;
}

/**
 * Shared all-or-nothing reorder boundary (ADR-0041): one transaction writes the
 * full desired ordering for one household collection, or nothing at all.
 *
 * `getDocRef` resolves a target document reference inside the caller's
 * collection so each domain reuses one validated write path.
 */
export const reorderCollectionInTransaction = async (input: {
  getDocRef: (id: string) => ReturnType<typeof doc>;
  orders: ReorderEntry[];
  userEmail: string;
}): Promise<void> => {
  const { getDocRef, orders, userEmail } = input;

  const seen = new Set<string>();
  for (const entry of orders) {
    if (seen.has(entry.id)) {
      throw new ReorderCommandError(
        ReorderCommandErrorCode.INVALID_ORDERS,
        `duplicate target id: ${entry.id}`,
      );
    }
    seen.add(entry.id);
  }

  if (orders.length === 0) return;

  try {
    await runTransaction(db, async (tx: Transaction) => {
      for (const entry of orders) {
        const snapshot = await tx.get(getDocRef(entry.id));
        if (!snapshot.exists()) {
          throw new ReorderCommandError(
            ReorderCommandErrorCode.TARGET_NOT_FOUND,
            `target not found: ${entry.id}`,
          );
        }
      }

      const now = new Date();
      for (const entry of orders) {
        tx.update(getDocRef(entry.id), {
          order: entry.order,
          updatedAt: now,
          updatedBy: userEmail,
        });
      }
    });
  } catch (error: unknown) {
    if (error instanceof ReorderCommandError) throw error;

    const message = error instanceof Error ? error.message : 'unknown transaction failure';
    throw new ReorderCommandError(ReorderCommandErrorCode.TRANSACTION_FAILED, message);
  }
};
