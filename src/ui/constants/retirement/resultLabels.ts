import { type z } from 'zod';

import { type ProjectionResolveError } from '@/domains/retirement/projectionTypes';
import { RETIREMENT_VALIDATION_LABELS } from '@/ui/constants/retirement/validationLabels';

export const PROJECTION_RESULT_LABELS = {
  RESULTS_SECTION: 'RESULTS',
  SUMMARY_SECTION: 'SUMMARY',
  TRAJECTORY_SECTION: 'TRAJECTORY',
  YEARS_SECTION: 'YEAR BY YEAR',
  METRIC_RETIREMENT_NET_WORTH: 'Net worth at retirement',
  METRIC_FINAL_NET_WORTH: 'Final net worth',
  METRIC_MIN_NET_WORTH: 'Lowest net worth',
  METRIC_MIN_NET_WORTH_YEAR: 'Lowest year',
  METRIC_BANKRUPTCY_YEAR: 'Bankruptcy year',
  METRIC_IS_BANKRUPT: 'Bankrupt',
  YES: 'Yes',
  NO: 'No',
  CALCULATE_FAILED: 'Calculation failed.',
  WAIT_FOR_OPENING: 'The opening net worth is still loading.',
  OPENING_INVALID: 'Enter a whole-number opening net worth.',
  START_YEAR_INVALID: 'Enter a whole-number start year.',
  RESOLVE_FAILED: 'The projection could not be calculated.',
  ISSUE_SEPARATOR: ' · ',
} as const;

/** One readable line per Zod issue; every issue is listed, never collapsed. */
export function resolveValidationIssueLabel(issue: z.ZodIssue): string {
  const label =
    RETIREMENT_VALIDATION_LABELS[issue.message as keyof typeof RETIREMENT_VALIDATION_LABELS];
  const path = issue.path.filter((part) => typeof part === 'string').join('.');
  if (label === undefined) return path === '' ? issue.message : `${path}: ${issue.message}`;
  return path === '' ? label : `${path}: ${label}`;
}

const text = (value: unknown): string =>
  value === undefined || value === null ? '' : String(value);

/** Stable zh-TW copy for every resolver error and warning code. */
export function resolveErrorLabel(error: ProjectionResolveError): string {
  const params = error.params;

  switch (error.code) {
    case 'CYCLE':
      return `規則參照形成循環：${(params.ruleIds as string[] | undefined)?.join(' → ') ?? ''}`;
    case 'DANGLING_REFERENCE':
      return `規則 ${text(params.ruleId)} 參照的規則不存在：${text(params.targetId)}`;
    case 'MISSING_LEDGER_CODE':
      return `找不到科目：${text(params.ledgerCodeId)}`;
    case 'MISSING_DEBT_ACCOUNT':
      return `找不到債務帳戶：${text(params.debtAccountId)}`;
    case 'MISSING_BASELINE':
      return params.kind === 'opening'
        ? '缺少期初淨資產基準。'
        : `規則 ${text(params.ruleId)} 缺少基準金額。`;
    case 'LEDGER_BASELINE_EMPTY':
      return `規則「${text(params.ruleName)}」的基準年度 ${text(params.baselineYear)} 沒有科目 ${text(params.ledgerCodeId)} 的分錄，請改基準年度或先補分錄。`;
    case 'DISABLED_REFERENCE':
      return `規則 ${text(params.ruleId)} 參照的規則已停用。`;
    case 'BASELINE_BEHIND':
      return `基準年度 ${text(params.baselineYear ?? params.anchorYearMonth)} 早於投影起點。`;
    case 'BASELINE_AFTER_START':
      return `基準年度 ${text(params.baselineYear ?? params.anchorYearMonth)} 晚於投影起點。`;
    case 'DEBT_ENDED_BEFORE_START':
      return `債務已於 ${text(params.endYear)} 結束，整段期間早於投影起點。`;
  }
}
