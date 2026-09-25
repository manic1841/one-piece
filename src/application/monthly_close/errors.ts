export const MonthlyCloseCommandErrorCode = {
  PERIOD_NOT_STARTED: 'PERIOD_NOT_STARTED',
  PERIOD_CLOSED: 'PERIOD_CLOSED',
  PERIOD_NOT_REOPENABLE: 'PERIOD_NOT_REOPENABLE',
  STAGE_ALREADY_COMPLETED: 'STAGE_ALREADY_COMPLETED',
  STAGE_INPUT_REQUIRED: 'STAGE_INPUT_REQUIRED',
  NEEDS_REVIEW_BLOCKED: 'NEEDS_REVIEW_BLOCKED',
  REPORTS_NOT_PERSISTED: 'REPORTS_NOT_PERSISTED',
} as const;

export type MonthlyCloseCommandErrorCode =
  (typeof MonthlyCloseCommandErrorCode)[keyof typeof MonthlyCloseCommandErrorCode];

export class MonthlyCloseCommandError extends Error {
  readonly code: MonthlyCloseCommandErrorCode;

  constructor(code: MonthlyCloseCommandErrorCode, message: string) {
    super(`[${code}] ${message}`);
    this.code = code;
    this.name = 'MonthlyCloseCommandError';
  }
}
