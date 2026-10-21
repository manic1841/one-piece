import { type ProjectionResolveError } from '@/domains/retirement/logic/projectionTypes';

export const PROJECTION_RESULT_LABELS = {
  RESULTS_SECTION: 'RESULTS',
  SUMMARY_SECTION: 'SUMMARY',
  NET_WORTH_SECTION: 'NET WORTH TRAJECTORY',
  CASH_FLOW_SECTION: 'CASH FLOW',
  YEARS_SECTION: 'YEAR BY YEAR',
  METRIC_RETIREMENT_NET_WORTH: 'Net worth at retirement',
  METRIC_FINAL_NET_WORTH: 'Final net worth',
  METRIC_MIN_NET_WORTH: 'Lowest net worth',
  METRIC_MIN_NET_WORTH_YEAR: 'Lowest year',
  METRIC_BANKRUPTCY_YEAR: 'Bankruptcy year',
  METRIC_IS_BANKRUPT: 'Bankrupt',
  YES: 'Yes',
  NO: 'No',
  NONE: '—',
  CALCULATE_FAILED: 'Calculation failed.',
  WAIT_FOR_OPENING: 'The opening net worth is still loading.',
  OPENING_INVALID: 'Enter a whole-number opening net worth.',
  RESOLVE_FAILED: 'The projection could not be calculated.',
} as const;

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
