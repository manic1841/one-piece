export const TransactionWithAllocationCommandErrorCode = {
  INVALID_IDEMPOTENCY_KEY: 'INVALID_IDEMPOTENCY_KEY',
  IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',
  OPERATION_IN_PROGRESS: 'OPERATION_IN_PROGRESS',
  INVALID_PAYLOAD: 'INVALID_PAYLOAD',
  UNSUPPORTED_INTENT_TYPE: 'UNSUPPORTED_INTENT_TYPE',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
} as const;

export type TransactionWithAllocationCommandErrorCode =
  (typeof TransactionWithAllocationCommandErrorCode)[keyof typeof TransactionWithAllocationCommandErrorCode];

export class TransactionWithAllocationCommandError extends Error {
  readonly code: TransactionWithAllocationCommandErrorCode;

  constructor(code: TransactionWithAllocationCommandErrorCode, message: string) {
    super(`${code}: ${message}`);
    this.code = code;
    this.name = 'TransactionWithAllocationCommandError';
  }
}
