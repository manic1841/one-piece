/**
 * Derived workspace readiness and setup progress.
 *
 * Readiness has exactly three blockers and never looks at the rules' contents
 * beyond whether an income rule exists. Progress counts how many of the five
 * numbered sections carry content; the two are deliberately separate.
 */

export type ReadinessBlocker = 'schema' | 'noIncome' | 'opening';

export interface ReadinessInput {
  valid: boolean;
  incomeRuleCount: number;
  openingResolved: boolean;
}

export interface Readiness {
  ready: boolean;
  blockers: ReadinessBlocker[];
}

export const buildReadiness = (input: ReadinessInput): Readiness => {
  const blockers: ReadinessBlocker[] = [];
  if (!input.valid) blockers.push('schema');
  if (input.incomeRuleCount === 0) blockers.push('noIncome');
  if (!input.openingResolved) blockers.push('opening');
  return { ready: blockers.length === 0, blockers };
};

export interface ProgressInput {
  hasBaseline: boolean;
  assumptionsFilled: boolean;
  incomeRuleCount: number;
  expenseRuleCount: number;
  eventCount: number;
}

export interface Progress {
  filled: number;
  total: number;
}

export const PROGRESS_TOTAL = 5;

export const buildProgress = (input: ProgressInput): Progress => {
  const filled = [
    input.hasBaseline,
    input.assumptionsFilled,
    input.incomeRuleCount > 0,
    input.expenseRuleCount > 0,
    input.eventCount > 0,
  ].filter(Boolean).length;
  return { filled, total: PROGRESS_TOTAL };
};
