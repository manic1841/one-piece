/**
 * Retirement plan docs: a single new-model plan document (assumptions, rules,
 * life events). Rules start empty — the seed's salary and mortgage imports are
 * derived by the projection resolver, not stored (ADR-0089).
 */
import { z } from 'zod';

import { createRetirementPlanCreateSchema } from '@/domains/retirement/planSchemas';

import { type Builder, QA_SEED_FIXED_NOW, audit, emit, hh } from './shared';

const PLAN_ID = 'plan_qa_retirement';
const CURRENT_YEAR = QA_SEED_FIXED_NOW.getFullYear();

export const buildRetirementDocs = (b: Builder) => {
  const plan = createRetirementPlanCreateSchema(CURRENT_YEAR).parse({
    name: 'QA 退休計畫',
    assumptions: {
      birthYear: 1990,
      retirementAge: 65,
      lifeExpectancy: 90,
      inflationRate: 0.02,
      annualReturnRate: 0.05,
    },
    projectionRules: [],
    lifeEvents: [
      {
        id: 'evt_renovation',
        type: 'expense',
        name: '房屋修繕',
        phases: [{ name: '一次修繕', startYear: 2028, endYear: 2028, amount: 800_000 }],
      },
    ],
    ...audit(b.identity),
  });

  emit(b, z.record(z.string(), z.unknown()), hh(b.identity, 'retirementPlans'), PLAN_ID, plan);
};
