/** Dedicated plan creation page (`/retirement/plans/new`): only the copy this page owns. */
import { PLAN_DETAIL_LABELS } from '@/ui/constants/retirement/planLabels';

export const PLAN_CREATE_PAGE_LABELS = {
  CRUMB: PLAN_DETAIL_LABELS.CRUMB,
  TITLE: 'New plan',
  DESCRIPTION: 'Define the assumptions, rules and events once, then reuse them in any projection.',
  READ_ONLY: 'Only household managers can create a plan.',
  INVALID: 'Fix the validation errors before creating the plan.',
  FAILED: 'Could not create the plan. Nothing was written.',
  CREATE: 'CREATE PLAN',
  CREATING: 'CREATING...',
  CREATED: 'Plan created.',
  BACK_TO_LIST: 'Back to plans',
  // A plan with no id behind it can never be missing; the three states it does
  // share with the detail page keep referencing it rather than repeating copy.
  LOADING: PLAN_DETAIL_LABELS.LOADING,
  LOAD_ERROR: PLAN_DETAIL_LABELS.LOAD_ERROR,
  RETRY_ACTION: PLAN_DETAIL_LABELS.RETRY_ACTION,
  BACK_LABEL: PLAN_DETAIL_LABELS.BACK_LABEL,
  NOT_FOUND_TITLE: PLAN_DETAIL_LABELS.NOT_FOUND_TITLE,
  NOT_FOUND_DESCRIPTION: PLAN_DETAIL_LABELS.NOT_FOUND_DESCRIPTION,
  NOT_FOUND_ACTION: PLAN_DETAIL_LABELS.NOT_FOUND_ACTION,
} as const;
