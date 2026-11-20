/**
 * Partitions the expense intents into a curated quick row plus a collapsed
 * "more" set, so the category field reads as one decision instead of a chip wall.
 *
 * This is UI chrome, not a domain concept: the wording comes from
 * `displayLabels` and these lists only decide *presentation order / grouping*.
 * The guard test asserts the two lists cover every expense intent exactly once.
 */
export const QUICK_EXPENSE_INTENTS = [
  'FOOD',
  'TRANSPORTATION',
  'SHOPPING',
  'ENTERTAINMENT',
  'LIVING',
  'SOCIAL',
] as const;

export const MORE_EXPENSE_INTENTS = [
  'VEHICLE',
  'FAMILY',
  'HEALTHCARE',
  'EDUCATION',
  'HOUSING',
  'RENT',
  'INTEREST',
  'INSURANCE',
  'TAX',
  'OTHER_EXPENSE',
] as const;
