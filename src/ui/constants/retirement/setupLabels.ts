/** Setup-stage chrome for the projection workspace (#342). */

export const ASSUMPTION_LABELS = {
  AGE_GROUP: 'AGE',
  RATE_GROUP: 'RETURNS & INFLATION',
  BIRTH_YEAR: 'Birth year',
  BIRTH_YEAR_LOCKED: 'From the selected plan. Choose another plan to use a different birth year.',
  RETIREMENT_AGE: 'Retirement age',
  LIFE_EXPECTANCY: 'Life expectancy',
  INFLATION_RATE: 'Inflation rate (%)',
  ANNUAL_RETURN_RATE: 'Annual return rate (%)',
  PERCENT_SUFFIX: '%',
  INVALID_NUMBER: '請輸入數字',
} as const;

export const RULE_LABELS = {
  ADD: 'ADD RULE',
  EMPTY: 'No projection rules yet. Add one to start from a source.',
  NAME: 'Rule name',
  RULE_TYPE: 'Side',
  METHOD: 'Method',
  ENABLED: 'Enabled',
  DISABLED: 'Disabled',
  STATE: 'State',
  SOURCE_TYPE: 'Source type',
  SOURCE: 'Source',
  NO_SOURCE: 'No source selected.',
  SOURCE_SEARCH: 'Search a source',
  SOURCE_NO_MATCH: 'No matching source.',
  SOURCE_UNASSIGNED: '{count} ledger codes still unassigned',
  SOURCE_IN_USE: 'In use',
  SOURCE_UNUSED: 'Unused',
  SOURCE_USED_BY: 'used by {count}',
  RULE_SOURCE: 'Another rule',
  UNNAMED_RULE: '(unnamed rule)',
  ERROR_COUNT: '{count} errors',
  SUMMARY_OF: 'of',
  SUMMARY_PER_YEAR: '/ year',
  SUMMARY_FOLLOWS_INFLATION: 'follows inflation',
  SUMMARY_ANNUAL_GROWTH: 'annual growth',
  SUMMARY_LOAN_SCHEDULE: 'follows loan schedule',
  SUMMARY_UNTIL_RETIREMENT: 'until retirement',
  SUMMARY_LIFELONG: 'for life',
  SUMMARY_THROUGH_AGE: 'through age {age}',
  SUMMARY_THROUGH_YEAR: 'through {year}',
  LEDGER_SOURCE: 'Ledger code',
  DEBT_SOURCE: 'Debt account',
  PARAMETER_RATE: 'Rate (%)',
  PARAMETER_RATIO: 'Ratio (%)',
  PARAMETER_AMOUNT: 'Amount',
  KEEPS_PACE: '每年至少跟隨通膨',
  KEEPS_PACE_DETAIL: '維持通膨',
  END_CONDITION: 'End condition',
  END_AGE: 'Age',
  END_YEAR: 'Year',
  DEBT_END: 'Ends with the debt account (follows debt).',
  BASELINE_POLICY: 'Baseline policy',
  BASELINE_YEAR: 'Baseline year',
  CHOOSE_PLACEHOLDER: 'Not selected',
  DELETE: 'Delete rule',
  CREATE: 'ADD',
  DONE: 'DONE',
  CANCEL: 'Cancel',
  NEW_TITLE: 'New income rule',
  NEW_TITLE_EXPENSE: 'New expense rule',
  EDIT_TITLE: 'Edit rule',
  ADD_ACTION_PREFIX: 'Add',
} as const;

export const RULE_TYPE_LABELS = {
  income: 'Income',
  expense: 'Expense',
} as const;

export const RULE_METHOD_LABELS = {
  inflation: 'Inflation',
  growthRate: 'Growth rate',
  percentage: 'Percentage',
  fixedAmount: 'Fixed amount',
  debtAmortization: 'Debt amortization',
} as const;

export const END_CONDITION_LABELS = {
  retirementYearExclusive: 'Until retirement',
  specificAge: 'Age',
  specificYear: 'Year',
  lifelong: 'Lifelong',
} as const;

export const BASELINE_POLICY_LABELS = {
  previousCompleteYear: 'Previous complete year',
  specificYear: 'Year',
} as const;
