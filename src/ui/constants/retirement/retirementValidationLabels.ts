import type { RetirementSchemaErrorCode } from '@/domains/retirement/errorCodes';

/**
 * One zh-TW message per domain schema code. The `Record` annotation makes a
 * missing or extra entry a compile error.
 */
export const RETIREMENT_VALIDATION_LABELS: Record<RetirementSchemaErrorCode, string> = {
  NAME_REQUIRED: '名稱必填',
  NAME_TOO_LONG: '名稱最多 100 字',
  NOT_INTEGER: '必須是整數',
  OUT_OF_RANGE: '超出允許範圍',
  TOO_MANY_DECIMAL_PLACES: '小數最多 4 位',
  LIFE_EXPECTANCY_NOT_AFTER_RETIREMENT: '預期壽命必須大於退休年齡',
  LIFE_EXPECTANCY_BEFORE_CURRENT_AGE: '預期壽命不得小於目前年齡',
  CURRENT_AGE_TOO_HIGH: '目前年齡不得超過 130 歲',

  RULE_ID_REQUIRED: '規則 id 必填',
  RULE_NAME_REQUIRED: '規則名稱必填',
  METHOD_NOT_ALLOWED_FOR_RULE_TYPE: '此 Method 不適用於這個規則類型',
  SOURCE_REQUIRED: '此 Method 需要來源',
  SOURCE_FORBIDDEN: '固定金額不需要來源',
  SOURCE_INVALID: '來源格式不正確',
  SOURCE_ID_REQUIRED: '來源 id 必填',
  PERCENTAGE_SOURCE_MUST_BE_RULE: '比例規則的來源必須是另一條規則',
  DEBT_SOURCE_MUST_BE_DEBT_ACCOUNT: '債務攤還的來源必須是債務帳戶',
  SELF_REFERENCE: '規則不可參照自己',
  DANGLING_REFERENCE: '參照的規則不存在',
  CYCLE: '規則參照形成循環',
  PARAMETER_OUT_OF_RANGE: '參數超出允許範圍',
  PARAMETER_NOT_POSITIVE: '參數必須大於 0',
  PARAMETER_TOO_MANY_DECIMAL_PLACES: '參數小數最多 4 位',
  END_CONDITION_REQUIRED: '此 Method 需要結束條件',
  END_CONDITION_FORBIDDEN: '債務攤還不設結束條件',
  END_CONDITION_INVALID: '結束條件格式不正確',
  SPECIFIC_AGE_OUT_OF_RANGE: '指定年齡必須介於 1 到 130',
  SPECIFIC_YEAR_OUT_OF_RANGE: '指定年度必須介於 1900 到 2200',
  BASELINE_POLICY_REQUIRED: '此規則需要基準政策',
  BASELINE_POLICY_FORBIDDEN: '以規則為來源時不設基準政策',
  BASELINE_POLICY_INVALID: '基準政策格式不正確',

  EVENT_ID_REQUIRED: '事件 id 必填',
  EVENT_NAME_REQUIRED: '事件名稱必填',
  EVENT_TYPE_INVALID: '事件類型不正確',
  PHASES_REQUIRED: '事件至少需要一個階段',
  PHASES_NOT_SORTED: '階段必須依開始年度升冪排列',
  PHASE_YEAR_OUT_OF_RANGE: '階段年度必須介於 1900 到 2200',
  PHASE_END_BEFORE_START: '結束年度不得早於開始年度',
  PHASES_OVERLAP: '階段不可重疊',
  PHASE_NAME_BLANK: '階段名稱不可留白',
  AMOUNT_NEGATIVE: '金額不得為負',
  GROWTH_RATE_OUT_OF_RANGE: '成長率必須介於 -10% 到 20%',
  GROWTH_RATE_TOO_MANY_DECIMAL_PLACES: '成長率小數最多 4 位',
};
