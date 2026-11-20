/**
 * Retirement plan + one frozen projection.
 *
 * The plan carries all three input groups the new model defines (assumptions,
 * rules, life events). Rules cover every method and all three source kinds:
 * ledger baselines come from the seeded journal, debt rules reference the seeded
 * mortgage and car loan, and percentage/growth rules chain off other rules. One
 * expense rule grows below inflation with `keepsPaceWithInflation`, so the
 * frozen projection exercises the held branch. The
 * projection's config, source and annual documents are produced through the
 * production resolver and engine rather than hand-written, so schema drift and
 * baseline drift both fail the seed loudly.
 *
 * Start year is the year after the seed clock: the resolver needs baseline
 * years inside the seeded window (2025 salary, 2026 expense codes) (ADR-0089).
 */
import { z } from 'zod';

import { ENGINE_VERSION, calculateProjection } from '@/domains/retirement/calculators';
import { resolveProjectionInput } from '@/domains/retirement/resolveProjectionInput';
import {
  ProjectionAnnualSchema,
  ProjectionDocumentSchema,
  ProjectionSourceSchema,
  createProjectionConfigSchema,
  createRetirementPlanCreateSchema,
} from '@/domains/retirement/schemas';

import {
  type Builder,
  type InternalTxn,
  QA_SEED_FIXED_NOW,
  audit,
  auditShape,
  emit,
  hh,
} from './shared';

const PLAN_ID = 'plan_qa_retirement';
const PROJECTION_ID = 'projection_qa_retirement';
const CURRENT_YEAR = QA_SEED_FIXED_NOW.getFullYear();
const START_YEAR = CURRENT_YEAR + 1;
const BASELINE_YEAR = CURRENT_YEAR - 1;
const OPENING_NET_WORTH = 3_000_000;

export type DebtSource = { monthlyPayment: number; endDate: Date };

/** `credit - debit` per code and year, the same net the production loader reads. */
const buildLedgerSources = (txns: InternalTxn[]) => {
  const sources = new Map<string, { netByYear: Map<number, number> }>();

  for (const txn of txns) {
    const year = Number(txn.yearMonth.slice(0, 4));
    for (const entry of txn.entries) {
      let record = sources.get(entry.ledgerCode);
      if (record === undefined) {
        record = { netByYear: new Map() };
        sources.set(entry.ledgerCode, record);
      }
      record.netByYear.set(year, (record.netByYear.get(year) ?? 0) + entry.credit - entry.debit);
    }
  }

  return sources;
};

export const buildRetirementDocs = (
  b: Builder,
  txns: InternalTxn[],
  debtAccounts: Map<string, DebtSource>,
) => {
  const plan = createRetirementPlanCreateSchema(CURRENT_YEAR).parse({
    name: 'QA 退休計畫',
    assumptions: {
      birthYear: 1990,
      retirementAge: 65,
      lifeExpectancy: 90,
      inflationRate: 0.02,
      annualReturnRate: 0.05,
    },
    projectionRules: [
      {
        id: 'rule_salary',
        name: '薪資',
        ruleType: 'income',
        method: 'inflation',
        source: { type: 'ledgerCode', id: 'income:salary' },
        baselinePolicy: 'specificYear',
        baselineYear: BASELINE_YEAR,
        parameters: {},
        endCondition: { type: 'retirementYearExclusive' },
      },
      {
        id: 'rule_bonus',
        name: '年終獎金',
        ruleType: 'income',
        method: 'percentage',
        source: { type: 'rule', id: 'rule_salary' },
        parameters: { ratio: 0.1 },
        endCondition: { type: 'retirementYearExclusive' },
      },
      {
        id: 'rule_dividend',
        name: '投資股利',
        ruleType: 'income',
        method: 'fixedAmount',
        parameters: { amount: 12_000 },
        endCondition: { type: 'specificYear', year: 2060 },
      },
      {
        id: 'rule_living',
        name: '生活費',
        ruleType: 'expense',
        method: 'percentage',
        source: { type: 'rule', id: 'rule_salary' },
        parameters: { ratio: 0.4 },
        endCondition: { type: 'retirementYearExclusive' },
      },
      {
        id: 'rule_housing',
        name: '居住費',
        ruleType: 'expense',
        method: 'percentage',
        source: { type: 'rule', id: 'rule_salary' },
        parameters: { ratio: 0.25 },
        endCondition: { type: 'retirementYearExclusive' },
      },
      {
        id: 'rule_food',
        name: '餐飲',
        ruleType: 'expense',
        method: 'inflation',
        source: { type: 'ledgerCode', id: 'expense:food' },
        baselinePolicy: 'specificYear',
        baselineYear: CURRENT_YEAR,
        parameters: {},
        endCondition: { type: 'lifelong' },
      },
      {
        id: 'rule_mortgage',
        name: '房貸',
        ruleType: 'expense',
        method: 'debtAmortization',
        source: { type: 'debtAccount', id: 'debt_mortgage' },
        parameters: {},
      },
      {
        id: 'rule_car',
        name: '車貸',
        ruleType: 'expense',
        method: 'debtAmortization',
        source: { type: 'debtAccount', id: 'debt_car_loan' },
        parameters: {},
      },
      {
        id: 'rule_medical',
        name: '醫療',
        ruleType: 'expense',
        method: 'growthRate',
        source: { type: 'rule', id: 'rule_food' },
        parameters: { rate: 0.06 },
        endCondition: { type: 'specificAge', age: 85 },
      },
      {
        // Growth below inflation with the clamp on, so QA walks the held branch.
        id: 'rule_insurance',
        name: '保險',
        ruleType: 'expense',
        method: 'growthRate',
        source: { type: 'ledgerCode', id: 'expense:food' },
        parameters: { rate: 0.01 },
        baselinePolicy: 'specificYear',
        baselineYear: CURRENT_YEAR,
        endCondition: { type: 'lifelong' },
        keepsPaceWithInflation: true,
      },
    ],
    lifeEvents: [
      {
        id: 'evt_renovation',
        type: 'expense',
        name: '房屋修繕',
        phases: [{ name: '一次修繕', startYear: 2028, endYear: 2028, amount: 800_000 }],
      },
      {
        id: 'evt_retirement_living',
        type: 'expense',
        name: '退休生活費',
        phases: [
          { name: '退休後', startYear: 2055, endYear: 2080, amount: 480_000, growthRate: 0.02 },
        ],
      },
    ],
    ...audit(b.identity),
  });

  emit(b, z.record(z.string(), z.unknown()), hh(b.identity, 'retirementPlans'), PLAN_ID, {
    id: PLAN_ID,
    ...plan,
  });

  const resolved = resolveProjectionInput({
    assumptions: plan.assumptions,
    rules: plan.projectionRules,
    lifeEvents: plan.lifeEvents,
    startYear: START_YEAR,
    opening: { amount: OPENING_NET_WORTH, source: 'manual' },
    ledgerSources: buildLedgerSources(txns),
    debtAccounts,
  });

  if (!resolved.ok) {
    throw new Error(
      `QA retirement projection failed to resolve: ${JSON.stringify(resolved.errors)}`,
    );
  }

  const result = calculateProjection(resolved.input);

  emit(
    b,
    ProjectionDocumentSchema.extend(auditShape),
    hh(b.identity, 'projections'),
    PROJECTION_ID,
    {
      ...result.summary,
      name: 'QA 退休試算',
      engineVersion: ENGINE_VERSION,
      ...audit(b.identity),
    },
  );
  emit(
    b,
    createProjectionConfigSchema(CURRENT_YEAR),
    hh(b.identity, 'projections', PROJECTION_ID, 'snapshots'),
    'config',
    {
      startYear: START_YEAR,
      openingNetWorth: { amount: OPENING_NET_WORTH, source: 'manual' },
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
    { ruleSources: resolved.ruleSources },
  );
  emit(
    b,
    ProjectionAnnualSchema,
    hh(b.identity, 'projections', PROJECTION_ID, 'results'),
    'annual',
    { years: result.years },
  );
};
