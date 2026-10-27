/** Rail, action bar, split rule sections and timeline chrome. */

export const WORKSPACE_RAIL_LABELS = {
  READY: 'Ready to calculate.',
  METRICS: 'Core metrics',
  METRICS_OUTDATED: 'OUTDATED',
  METRIC_RETIREMENT: 'Net worth at retirement',
  METRIC_MIN: 'Lowest net worth after retirement',
  METRIC_FINAL: 'Final net worth',
  JUMP_TO_YEAR: 'Jump to {year}',
  OPENING_SOURCE: 'Opening source',
  OPENING_MANUAL: 'Manual value',
  SOURCES: 'Sources',
  SOURCES_USED: 'used by rules',
  SOURCES_UNASSIGNED: 'Unassigned',
  SOURCES_MORE: '+{count} more',
  SOURCES_SHOW_LESS: 'Show less',
  SOURCES_ALL_ASSIGNED: 'Every source is assigned.',
  RETIREMENT_YEAR: 'Retirement year',
  SECTION_APPEARS: 'appears in the setup',
} as const;

export const READINESS_BLOCKER_LABELS = {
  schema: 'Fix the validation errors in the setup.',
  noIncome: 'Add at least one income rule.',
  opening: 'Resolve the opening net worth.',
} as const;

export const PROJECTION_SOURCE_TYPE_LABELS = {
  income: 'Income',
  expense: 'Expense',
  debt: 'Debt',
} as const;

export const WORKSPACE_SECTION_LABELS = {
  NUMBER_BASELINE: '01',
  NUMBER_ASSUMPTIONS: '02',
  NUMBER_RULES: '03',
  NUMBER_EVENTS: '04',
  BASELINE: 'BASELINE',
  RULES: 'RULES',
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
  ADD_INCOME: 'ADD INCOME RULE',
  ADD_EXPENSE: 'ADD EXPENSE RULE',
  EMPTY_INCOME: 'No income rules yet. Add one so the projection has inflows.',
  EMPTY_EXPENSE: 'No expense rules yet.',
  RULE_INSPECTOR: 'Rule details',
  NO_RULE_SELECTION: 'Select a rule to edit it.',
} as const;

export const WORKSPACE_ACTION_LABELS = {
  CANCEL: 'CANCEL',
  UNDO: 'UNDO',
  BLOCKED_HINT: 'CALCULATE is disabled until readiness passes.',
  PREVIEW_SUMMARY: 'Setup summary (read-only)',
  SHOW_SUMMARY: 'Show summary',
  HIDE_SUMMARY: 'Hide summary',
  VIEW_LIST: 'List',
  VIEW_TIMELINE: 'Timeline',
  NO_EVENTS: 'No life events yet.',
  EVENT_ADD_HINT: 'Click an empty year to add a phase.',
  TIMELINE_LABEL: 'Life event timeline',
  EVENTS_LIST_LABEL: 'Life events list',
  INSPECTOR: 'Event details',
  CLOSE_INSPECTOR: 'Close details',
  NO_SELECTION: 'Select a phase on the timeline to edit it.',
} as const;
