/**
 * Retirement plan docs: the plan (without the batch-replaceable child
 * collections, ADR-0026/0040) plus incomeStreams/expenseCategories
 * subcollection docs, including the salary import derived from the seeded
 * 2025 salary entries and the mortgage import from the seeded payments.
 */
import { z } from 'zod';

import { LEDGER_CODES } from '@/domains/ledger/constants';
import {
  RetirementExpenseCategorySchema,
  RetirementIncomeSourceSchema,
  RetirementPlanSchema,
} from '@/domains/retirement/schemas';

import {
  type Builder,
  MORTGAGE_ID,
  MORTGAGE_PAYMENT,
  QA_SEED_FIXED_NOW,
  SALARY_AMOUNT,
  SALARY_TOTAL_2025,
  SAMPLE_YEAR,
  audit,
  auditShape,
  emit,
  hh,
} from './shared';

const PLAN_ID = 'plan_qa_retirement';

export const buildRetirementDocs = (b: Builder, mortgage: { interestTotal: number }) => {
  const { identity } = b;
  const importedAt = QA_SEED_FIXED_NOW.toISOString();

  const incomes = [
    RetirementIncomeSourceSchema.parse({
      id: 'inc_salary',
      name: '薪資收入',
      incomeCategory: LEDGER_CODES.INCOME_SALARY,
      type: 'salary',
      lifelong: false,
      startYear: 2026,
      endYear: 2030,
      currentAnnual: SALARY_TOTAL_2025,
      growthRate: 2,
      calculatedFrom: {
        ledgerCode: LEDGER_CODES.INCOME_SALARY,
        sampleYear: SAMPLE_YEAR,
        totalAmount: SALARY_TOTAL_2025,
        monthlyAverage: SALARY_AMOUNT,
        sampleCount: 12,
        importedAt,
      },
    }),
    RetirementIncomeSourceSchema.parse({
      id: 'inc_bonus',
      name: '年終獎金',
      incomeCategory: undefined,
      type: 'bonus',
      lifelong: false,
      startYear: 2026,
      endYear: 2030,
      currentAnnual: Math.round(SALARY_TOTAL_2025 * 1.67),
      growthRate: 2,
    }),
    RetirementIncomeSourceSchema.parse({
      id: 'inc_pension',
      name: '勞保年金',
      incomeCategory: undefined,
      type: 'pension',
      lifelong: true,
      startYear: 2030,
      currentAnnual: 0,
      retirementAnnual: 240_000,
      growthRate: 0,
    }),
  ];

  const expenses = [
    RetirementExpenseCategorySchema.parse({
      id: 'exp_living',
      name: '日常支出',
      type: 'general',
      currentAnnual: 480_000,
      growthRate: 2,
      retirementMultiplier: 0.7,
      startYear: 2026,
      endYear: null,
    }),
    RetirementExpenseCategorySchema.parse({
      id: 'exp_mortgage',
      name: '房貸還款',
      type: 'debt_payment',
      sourceDebtAccountId: MORTGAGE_ID,
      includesPrincipal: true,
      interestOnly: false,
      currentAnnual: MORTGAGE_PAYMENT * 12,
      growthRate: 0,
      retirementMultiplier: 0,
      startYear: 2026,
      endYear: 2036,
      calculatedFrom: {
        debtAccountId: MORTGAGE_ID,
        sampleStartYearMonth: '2026-02',
        sampleEndYearMonth: '2026-09',
        totalPaid: MORTGAGE_PAYMENT * 8,
        interestPaid: mortgage.interestTotal,
        sampleCount: 8,
        importedAt,
      },
    }),
  ];

  const plan = RetirementPlanSchema.parse({
    id: PLAN_ID,
    name: 'QA 退休計畫',
    isActive: true,
    autoUpdate: false,
    currentYear: 2026,
    birthYear: 1985,
    retirementAge: 45,
    lifeExpectancy: 85,
    inflationRate: 2,
    investmentReturnRate: 5,
    incomes,
    expenses,
    events: [
      {
        id: 'evt_renovation',
        type: 'expense',
        name: '房屋修繕',
        phases: [{ name: '一次修繕', startYear: 2028, endYear: 2028, amount: 800_000 }],
      },
    ],
    ...audit(identity),
  });

  // The plan was already validated by RetirementPlanSchema.parse() above.
  // The stored plan doc omits the batch-replaceable child collections
  // (ADR-0026/0040); re-validate the stored shape against the same schema
  // so future field drift is caught at seed time, not at app read time.
  const planDoc: Record<string, unknown> = { ...plan };
  delete planDoc.incomes;
  delete planDoc.expenses;
  RetirementPlanSchema.parse({ ...planDoc, incomes: [], expenses: [] });
  emit(b, z.record(z.string(), z.unknown()), hh(identity, 'retirement_plans'), PLAN_ID, planDoc);

  // Income/expense subcollection docs: validate with audit fields included,
  // since the stored shape includes BaseSchema fields the standalone schemas
  // don't enforce. RetirementIncomeSourceSchema uses superRefine, so we
  // validate the audit fields separately (the income shape was already
  // validated by RetirementIncomeSourceSchema.parse() above).
  const withAudit = z.object(auditShape);

  for (const income of incomes) {
    const doc = { ...income, ...audit(identity) };
    withAudit.parse(doc);
    emit(
      b,
      z.record(z.string(), z.unknown()),
      hh(identity, 'retirement_plans', PLAN_ID, 'incomeStreams'),
      income.id,
      doc,
    );
  }
  for (const expense of expenses) {
    const doc = { ...expense, ...audit(identity) };
    withAudit.parse(doc);
    emit(
      b,
      z.record(z.string(), z.unknown()),
      hh(identity, 'retirement_plans', PLAN_ID, 'expenseCategories'),
      expense.id,
      doc,
    );
  }
};
