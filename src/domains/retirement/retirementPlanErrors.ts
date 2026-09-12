export const RetirementPlanCommandErrorCode = {
  PLAN_NOT_FOUND: 'PLAN_NOT_FOUND',
  PLAN_TOO_LARGE: 'PLAN_TOO_LARGE',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
} as const;

export type RetirementPlanCommandErrorCode =
  (typeof RetirementPlanCommandErrorCode)[keyof typeof RetirementPlanCommandErrorCode];

export const RETIREMENT_PLAN_TRANSACTION_WRITE_LIMIT = 400;

export class RetirementPlanCommandError extends Error {
  readonly code: RetirementPlanCommandErrorCode;

  constructor(code: RetirementPlanCommandErrorCode, message: string) {
    super(`${code}: ${message}`);
    this.code = code;
    this.name = 'RetirementPlanCommandError';
  }
}

export const estimateRetirementPlanWriteCount = (input: {
  staleChildCount: number;
  newChildCount: number;
  fanOutUpdateCount: number;
}): number => 1 + input.staleChildCount + input.newChildCount + input.fanOutUpdateCount;
