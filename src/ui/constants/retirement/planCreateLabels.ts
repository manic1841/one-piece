/** Dedicated plan creation page (`/retirement/plans/new`). */

export const PLAN_CREATE_LABELS = {
  CRUMB: 'RETIREMENT / PLANS',
  TITLE: 'New plan',
  DESCRIPTION: 'Define the assumptions, rules and events once, then reuse them in any projection.',
  DETAILS_NUMBER: '01',
  DETAILS_SECTION: 'PLAN',
  NAME: 'Plan name',
  NAME_PLACEHOLDER: 'e.g., Retire at 60',
  NAME_REQUIRED: 'Name is required.',
  INVALID: 'Fix the validation errors before creating the plan.',
  NAME_REQUIRED_CODE: 'Enter a plan name.',
  NAME_TOO_LONG: 'Plan name is too long.',
  FAILED: 'Could not create the plan. Nothing was written.',
  CREATE: 'CREATE PLAN',
  CREATING: 'CREATING...',
  BACK_TO_LIST: 'Back to plans',
} as const;
