import { z } from 'zod';

export const OperationStatus = z.enum(['IN_PROGRESS', 'SUCCEEDED', 'FAILED']);
export type OperationStatus = z.infer<typeof OperationStatus>;

export const OperationResultReferenceSchema = z.record(z.string(), z.unknown());
export type OperationResultReference = z.infer<typeof OperationResultReferenceSchema>;

export const OperationRecordSchema = z.object({
  id: z.string(),
  operationType: z.string(),
  idempotencyKey: z.string().min(1),
  fingerprintVersion: z.number().int().positive(),
  payloadFingerprint: z.string().min(1),
  status: OperationStatus,
  resultReference: OperationResultReferenceSchema.nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  completedAt: z.date().nullable().optional(),
  createdByUid: z.string().min(1),
});

export type OperationRecord = z.infer<typeof OperationRecordSchema>;