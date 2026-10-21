/**
 * Retirement plan docs: a single new-model plan document (assumptions, rules,
 * life events). Rules start empty — the seed's salary and mortgage imports are
 * derived by the projection resolver, not stored (ADR-0089).
 */
import { z } from 'zod';

import {
  ProjectionAnnualSchema,
  ProjectionDocumentSchema,
  ProjectionSourceSchema,
  createProjectionConfigSchema,
} from '@/domains/retirement/schemas/projectionSchemas';
import { createRetirementPlanCreateSchema } from '@/domains/retirement/schemas/retirementSchemas';

import { type Builder, QA_SEED_FIXED_NOW, audit, auditShape, emit, hh } from './shared';

const PLAN_ID = 'plan_qa_retirement';
const PROJECTION_ID = 'projection_qa_retirement';
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

  // One saved projection keeps the backup round-trip e2e honest about nested
  // results travelling with the payload; it mirrors the plan, like a plan
  // applied in the workspace would.
  emit(
    b,
    ProjectionDocumentSchema.extend(auditShape),
    hh(b.identity, 'projections'),
    PROJECTION_ID,
    {
      name: 'QA 退休試算',
      engineVersion: 1,
      retirementNetWorth: null,
      finalNetWorth: 0,
      minNetWorth: 0,
      minNetWorthYear: null,
      bankruptcyYear: null,
      isBankrupt: false,
      ...audit(b.identity),
    },
  );
  emit(
    b,
    createProjectionConfigSchema(CURRENT_YEAR),
    hh(b.identity, 'projections', PROJECTION_ID, 'snapshots'),
    'config',
    {
      startYear: CURRENT_YEAR,
      openingNetWorth: { amount: 0, source: 'manual' },
      assumptions: plan.assumptions,
      projectionRules: plan.projectionRules,
      lifeEvents: plan.lifeEvents,
    },
  );
  emit(
    b,
    ProjectionSourceSchema,
    hh(b.identity, 'projections', PROJECTION_ID, 'snapshots'),
    'source',
    { ruleSources: [] },
  );
  emit(
    b,
    ProjectionAnnualSchema,
    hh(b.identity, 'projections', PROJECTION_ID, 'results'),
    'annual',
    { years: [] },
  );
};
