export const ReorderCommandErrorCode = {
  INVALID_ORDERS: 'INVALID_ORDERS',
  TARGET_NOT_FOUND: 'TARGET_NOT_FOUND',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
} as const;

export type ReorderCommandErrorCode =
  (typeof ReorderCommandErrorCode)[keyof typeof ReorderCommandErrorCode];

export class ReorderCommandError extends Error {
  readonly code: ReorderCommandErrorCode;

  constructor(code: ReorderCommandErrorCode, message: string) {
    super(`${code}: ${message}`);
    this.code = code;
    this.name = 'ReorderCommandError';
  }
}
