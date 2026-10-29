/** Dedicated plan creation page (`/retirement/plans/new`): only the copy this page owns. */

import { PLAN_DETAIL_LABELS } from '@/ui/constants/retirement/planLabels';

export const PLAN_CREATE_PAGE_LABELS = {
  CRUMB: PLAN_DETAIL_LABELS.CRUMB,
  TITLE: 'New plan',
  DESCRIPTION: 'Define the assumptions, rules and events once, then reuse them in any projection.',
  INVALID: 'Fix the validation errors before creating the plan.',
  FAILED: 'Could not create the plan. Nothing was written.',
  CREATE: 'CREATE PLAN',
  CREATING: 'CREATING...',
  BACK_TO_LIST: 'Back to plans',
} as const;
