export const RetirementWorkspaceSectionLabels = {
  overview: 'OVERVIEW / RESULTS',
  netWorth: 'PROJECTED NET WORTH',
  cashFlow: 'CASH FLOW PROJECTION',
  assumptions: 'SCENARIO ASSUMPTIONS',
  income: 'INCOME',
  expenses: 'LIVING EXPENSES',
  events: 'LIFE EVENTS',
} as const;

export const RetirementWorkspaceTermLabels = {
  incomeStream: 'Income Stream',
  incomeStreams: 'Income Streams',
  expenseCategory: 'Expense Category',
  expenseCategories: 'Expense Categories',
  retirementEvent: 'Life Event',
  retirementEvents: 'Life Events',
} as const;

export type RetirementWorkspaceSectionKey = keyof typeof RetirementWorkspaceSectionLabels;
