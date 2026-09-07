export const RetirementPlanCommandErrorCode = {
  PLAN_NOT_FOUND: 'PLAN_NOT_FOUND',
  PLAN_TOO_LARGE: 'PLAN_TOO_LARGE',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
} as const;

export type RetirementPlanCommandErrorCode =
  (typeof RetirementPlanCommandErrorCode)[keyof typeof RetirementPlanCommandErrorCode];

export class RetirementPlanCommandError extends Error {
  readonly code: RetirementPlanCommandErrorCode;

  constructor(code: RetirementPlanCommandErrorCode, message: string) {
    super(`${code}: ${message}`);
    this.code = code;
    this.name = 'RetirementPlanCommandError';
  }
}

export const RETIREMENT_PLAN_TRANSACTION_WRITE_LIMIT = 400;
