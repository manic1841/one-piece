import {
  type Transaction as FirestoreTransaction,
  Timestamp,
  collection,
  doc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';

import {
  type OperationRecord,
  OperationRecordSchema,
  type OperationResultReference,
} from '@/domains/operation/schemas';
import { db } from '@/firebase';

export const buildOperationRecordId = (operationType: string, idempotencyKey: string): string =>
  encodeURIComponent(`${operationType}:${idempotencyKey}`);

const convertTimestamp = (value: unknown): Date => {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  throw new Error('Invalid operation timestamp');
};

class OperationRepository {
  private getDocRef(householdId: string, operationType: string, idempotencyKey: string) {
    return doc(
      collection(db, 'households', householdId, 'operations'),
      buildOperationRecordId(operationType, idempotencyKey),
    );
  }

  async getByKey(
    householdId: string,
    operationType: string,
    idempotencyKey: string,
    tx?: FirestoreTransaction,
  ): Promise<OperationRecord | null> {
    const snapshot = tx
      ? await tx.get(this.getDocRef(householdId, operationType, idempotencyKey))
      : await getDoc(this.getDocRef(householdId, operationType, idempotencyKey));
    if (!snapshot.exists()) return null;

    const data = snapshot.data();
    return OperationRecordSchema.parse({
      ...data,
      id: snapshot.id,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
      completedAt: data.completedAt === null ? null : convertTimestamp(data.completedAt),
    });
  }

  async createSucceeded(
    householdId: string,
    operationType: string,
    idempotencyKey: string,
    fingerprintVersion: number,
    payloadFingerprint: string,
    resultReference: OperationResultReference,
    createdByUid: string,
    tx: FirestoreTransaction,
  ): Promise<void> {
    const now = serverTimestamp();
    tx.set(this.getDocRef(householdId, operationType, idempotencyKey), {
      operationType,
      idempotencyKey,
      fingerprintVersion,
      payloadFingerprint,
      status: 'SUCCEEDED',
      resultReference,
      createdAt: now,
      updatedAt: now,
      completedAt: now,
      createdByUid,
    });
  }
}

export const operationRepository = new OperationRepository();
