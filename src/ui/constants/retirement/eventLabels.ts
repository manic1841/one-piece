/** Life-event and phase editor chrome for the setup stage (#343). */

export const EVENT_LABELS = {
  ADD: 'ADD EVENT',
  /** New events and phases are named, so a fresh row never starts out red. */
  EVENT_NAME_PREFIX: 'Event',
  PHASE_NAME_PREFIX: 'Phase',
  EMPTY: 'No life events yet. Add one to model a one-off or phased cash flow.',
  EVENT_SECTION: 'EVENT',
  PHASE_SECTION: 'PHASE',
  NAME: 'Event name',
  TYPE: 'Type',
  ENABLED: 'Enabled',
  DISABLED: 'Disabled',
  DELETE: 'Delete event',
  DELETE_EVENT_TITLE: 'Delete this event?',
  DELETE_EVENT_CONSEQUENCE: 'Its phases go with it.',
  DELETE_CONFIRM: 'DELETE',
  PHASES: 'Phases',
  PHASES_EMPTY: 'Add a phase to give this event a year range.',
  ADD_PHASE: 'ADD PHASE',
  DELETE_PHASE: 'Delete phase',
  PHASE_NAME: 'Phase name',
  PERIOD: 'Period',
  PERIOD_SEPARATOR: '–',
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

/** Type colouring shared by the inspector summary and the mobile row. */
export const EVENT_TYPE_TONE = {
  income: { dot: 'bg-positive', text: 'text-positive' },
  expense: { dot: 'bg-negative', text: 'text-negative' },
} as const;
