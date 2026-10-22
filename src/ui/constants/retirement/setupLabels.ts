/** Setup-stage chrome for the projection workspace (#342). */

export const ASSUMPTION_LABELS = {
  BIRTH_YEAR: 'Birth year',
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
  SOURCE_TYPE: 'Source type',
  SOURCE: 'Source',
  NO_SOURCE: 'No source needed for a fixed amount.',
  RULE_SOURCE: 'Another rule',
  UNNAMED_RULE: '(unnamed rule)',
  LEDGER_SOURCE: 'Ledger code',
  DEBT_SOURCE: 'Debt account',
  PARAMETER_RATE: 'Rate (%)',
  PARAMETER_RATIO: 'Ratio (%)',
  PARAMETER_AMOUNT: 'Amount',
  END_CONDITION: 'End condition',
  END_AGE: 'Age',
  END_YEAR: 'Year',
  DEBT_END: 'Ends with the debt account (follows debt).',
  BASELINE_POLICY: 'Baseline policy',
  BASELINE_YEAR: 'Baseline year',
  CHOOSE_PLACEHOLDER: 'Not selected',
  DELETE: 'Delete rule',
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

export const PLAN_APPLY_LABELS = {
  TITLE: 'Replace current setup?',
  CONTEXT_PREFIX: 'Applying',
  CONTEXT_SUFFIX: 'replaces assumptions, rules and events in this workspace.',
  CONSEQUENCE: 'Unsaved changes in the workspace will be lost.',
  CONFIRM: 'APPLY',
  CANCEL: 'Cancel',
  PLAN_FIELD: 'Plan',
  CHOOSE_PLACEHOLDER: 'Choose a plan',
  LOADING: 'Loading plans...',
  EMPTY: 'No saved plans yet.',
  LOAD_ERROR: 'Could not load plans.',
  PLAN_NOT_FOUND: 'Could not load this plan.',
  RETRY: 'RETRY',
  APPLIED_PREFIX: 'Applied plan:',
} as const;

export const planContextCopy = (planName: string): string =>
  `${PLAN_APPLY_LABELS.CONTEXT_PREFIX} "${planName}" ${PLAN_APPLY_LABELS.CONTEXT_SUFFIX}`;
