export const DebtPaymentCommandErrorCode = {
  INVALID_IDEMPOTENCY_KEY: 'INVALID_IDEMPOTENCY_KEY',
  IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',
  OPERATION_IN_PROGRESS: 'OPERATION_IN_PROGRESS',
} as const;

export type DebtPaymentCommandErrorCode =
  (typeof DebtPaymentCommandErrorCode)[keyof typeof DebtPaymentCommandErrorCode];

export class DebtPaymentCommandError extends Error {
  readonly code: DebtPaymentCommandErrorCode;

  constructor(code: DebtPaymentCommandErrorCode, message: string) {
    super(`${code}: ${message}`);
    this.code = code;
    this.name = 'DebtPaymentCommandError';
  }
}