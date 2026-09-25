export const AllocationReplacementCommandErrorCode = {
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  INVALID_PAYLOAD: 'INVALID_PAYLOAD',
  UNSUPPORTED_INTENT_TYPE: 'UNSUPPORTED_INTENT_TYPE',
  TRANSACTION_NOT_FOUND: 'TRANSACTION_NOT_FOUND',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
} as const;

export type AllocationReplacementCommandErrorCode =
  (typeof AllocationReplacementCommandErrorCode)[keyof typeof AllocationReplacementCommandErrorCode];

export class AllocationReplacementCommandError extends Error {
  readonly code: AllocationReplacementCommandErrorCode;

  constructor(code: AllocationReplacementCommandErrorCode, message: string) {
    super(`${code}: ${message}`);
    this.code = code;
    this.name = 'AllocationReplacementCommandError';
  }
}
