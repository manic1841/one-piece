/** Life-event and phase editor chrome for the setup stage (#343). */

export const EVENT_LABELS = {
  ADD: 'ADD EVENT',
  EMPTY: 'No life events yet. Add one to model a one-off or phased cash flow.',
  NAME: 'Event name',
  TYPE: 'Type',
  ENABLED: 'Enabled',
  DISABLED: 'Disabled',
  DELETE: 'Delete event',
  PHASES: 'Phases',
  PHASES_EMPTY: 'Add a phase to give this event a year range.',
  ADD_PHASE: 'ADD PHASE',
  DELETE_PHASE: 'Delete phase',
  PHASE_NAME: 'Phase name',
  START_YEAR: 'Start year',
  END_YEAR: 'End year',
  AMOUNT: 'Amount',
  GROWTH_RATE: 'Growth rate (%)',
  GROWTH_RATE_HINT: 'Leave blank to follow plan inflation.',
} as const;

export const EVENT_TYPE_LABELS = {
  income: 'Income',
  expense: 'Expense',
} as const;
