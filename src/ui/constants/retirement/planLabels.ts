/** Plan list and read-only view chrome (#346). */

export const PLAN_LIST_LABELS = {
  CRUMB: 'RETIREMENT',
  BACK_LABEL: 'Back to projections',
  TITLE: 'Retirement plans',
  DESCRIPTION: 'Reusable assumption, rule and event templates.',
  CREATE_ACTION: 'NEW PLAN',
  EMPTY_TITLE: 'NO PLANS',
  EMPTY_DESCRIPTION:
    'No plans yet. Create one directly, or save a setup as a plan from a projection.',
  EMPTY_ACTION: 'NEW PLAN',
  LOADING_LABEL: 'Loading plans…',
  LOAD_ERROR: 'Could not load plans.',
  RETRY_ACTION: 'RETRY',
  COLUMN_NAME: 'Name',
  COLUMN_UPDATED_AT: 'Last updated',
  MOBILE_UPDATED_AT: 'Last updated',
} as const;

export const PLAN_DETAIL_LABELS = {
  CRUMB: 'RETIREMENT / PLANS',
  BACK_LABEL: 'Back to plans',
  LOADING: 'Loading plan…',
  LOAD_ERROR: 'Could not load this plan.',
  RETRY_ACTION: 'RETRY',
  NOT_FOUND_TITLE: 'PLAN NOT FOUND',
  NOT_FOUND_DESCRIPTION: 'This plan no longer exists, or it belongs to another household.',
  NOT_FOUND_ACTION: 'Back to plans',
  USE_ACTION: 'USE THIS PLAN',
  EDIT_ACTION: 'Edit',
  SCENARIO_SECTION: 'SCENARIO',
  ASSUMPTIONS_SECTION: 'ASSUMPTIONS',
  RULES_SECTION: 'PROJECTION RULES',
  EVENTS_SECTION: 'LIFE EVENTS',
  RULES_EMPTY: 'No projection rules in this plan.',
  EVENTS_EMPTY: 'No life events in this plan.',
  UPDATED_AT: 'Last updated',
  DANGER_ZONE: 'DELETE PLAN',
  DELETE_TITLE: 'Delete this plan?',
  DELETE_CONSEQUENCE: 'This cannot be undone.',
  DELETE_CONFIRM: 'DELETE',
  RENAME_FAILED: 'Could not rename this plan.',
  DELETE_FAILED: 'Could not delete this plan.',
  /** Flavour of the retirement year: distance from this year, then the span. */
  YEARS_TO_RETIREMENT: (years: number) => `${years} years from now`,
  RETIRED: 'Retired',
  SCENARIO_DESCRIPTION: (
    birthYear: number,
    retirementAge: number,
    retirementYear: number,
    lifeExpectancy: number,
  ) =>
    `Born ${birthYear} · retires at ${retirementAge} (${retirementYear}) · life expectancy ${lifeExpectancy}`,
  RULES_TRAILING: (count: number) => `${count}`,
  EVENTS_TRAILING: (count: number) => `${count}`,
  /** Turns an age / year end condition into a date boundary inside a sentence. */
  UNTIL: 'until',
  EVENT_DURING_RETIREMENT: 'During retirement',
  EVENT_BEFORE_RETIREMENT: 'Before retirement',
  EVENT_AFTER_RETIREMENT: 'After retirement',
  RULE_DISABLED: 'Disabled',
  EVENT_DISABLED: 'Disabled',
} as const;

/** The plan form body, shared by the create and the edit page. */
export const PLAN_FORM_LABELS = {
  DETAILS_NUMBER: '01',
  DETAILS_SECTION: 'PLAN',
  NAME: 'Plan name',
  NAME_PLACEHOLDER: 'e.g., Retire at 60',
  NAME_REQUIRED: 'Name is required.',
} as const;

/** Item edit page (`/retirement/plans/:id/edit`). */
export const PLAN_EDIT_LABELS = {
  CRUMB: PLAN_DETAIL_LABELS.CRUMB,
  TITLE: 'Edit plan',
  DESCRIPTION: 'Birth year is fixed once the plan exists.',
  LOADING: PLAN_DETAIL_LABELS.LOADING,
  LOAD_ERROR: PLAN_DETAIL_LABELS.LOAD_ERROR,
  RETRY_ACTION: PLAN_DETAIL_LABELS.RETRY_ACTION,
  NOT_FOUND_TITLE: PLAN_DETAIL_LABELS.NOT_FOUND_TITLE,
  NOT_FOUND_DESCRIPTION: PLAN_DETAIL_LABELS.NOT_FOUND_DESCRIPTION,
  NOT_FOUND_ACTION: PLAN_DETAIL_LABELS.NOT_FOUND_ACTION,
  BACK_LABEL: 'Back to plan',
  READ_ONLY: 'Only household managers can change a plan.',
  SAVE: 'SAVE CHANGES',
  SAVING: 'SAVING...',
  SAVED: 'Plan saved.',
  INVALID: 'Fix the validation errors before saving the plan.',
  NAME_TOO_LONG: 'Plan name is too long.',
  INVALID_PLAN: 'The plan failed validation. Nothing was written.',
  NOT_FOUND_CODE: 'This plan no longer exists.',
  SAVE_FAILED: 'Could not save the plan. Nothing was written.',
} as const;
