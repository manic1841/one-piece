/**
 * One-time migration: retirement plan docs from legacy modes to v1 flat fields
 * (issue #127 Q10).
 *
 * Legacy -> v1 transforms per document:
 * - Incomes (standalone + subcollection incomeStreams):
 *   - DERIVED income: flatten to a fixed stream (currentAnnual =
 *     base.currentAnnual * multiplier) and drop derivedFrom.
 *   - baseAmount -> currentAnnual; FIXED income keeps its level after
 *     retirement (retirementAnnual = baseAmount).
 *   - incomeCalculationMode is removed (v1 has no income modes).
 * - Expenses (standalone + subcollection expenseCategories):
 *   - SALARY_PERCENTAGE expense: flatten to a fixed currentAnnual =
 *     baselineSalary * percentage (or fallbackAmount), drop salaryPercentage,
 *     salaryPercentageRetirementMode, linkedIncomeId, fallbackAmount,
 *     percentOfSalary.
 *   - FIXED expense: baseAmount -> currentAnnual.
 *   - expenseCategory is backfilled from calculatedFrom.ledgerCode when present
 *     (merge alignment key for "Import from Ledger").
 * - Plan doc:
 *   - currentSavings and salaryGrowthRate are removed (net worth now derives
 *     from the latest closed balance sheet, Q1).
 *   - importSettings and projectMappings are removed (Q8).
 *   - retirementTransition is removed; GRADUAL is dropped in favour of
 *     IMMEDIATE (Q5) with a note when the transition actually changed.
 * - Event phases: mode + percentage -> fixed amount (amount = phase amount,
 *     or baselineSalary * percentage for SALARY_PERCENTAGE phases).
 *
 * Baseline salary for percentage flattening uses the same rule as the legacy
 * engine's resolveRetirementBaselineSalaryAmount: all salary streams projected
 * to min(retirementYear, stream end) with growth applied, or the linked income
 * stream when linkedIncomeId is set.
 *
 * Usage: npx tsx scripts/admin/migrate-retirement-v1.ts [--dry-run]
 *
 * Prerequisite: emulator env (applyEmulatorEnv reads firebase_emulator config).
 * Run BEFORE the new app code reads plans: the new schema requires
 * currentAnnual, so legacy plan docs fail schema parse at read time.
 */
import admin from 'firebase-admin';

import { applyEmulatorEnv } from './emulator-env';

const dryRun = process.argv.includes('--dry-run');

const emulator = applyEmulatorEnv();

if (!admin.apps.length) {
  admin.initializeApp({ projectId: emulator.projectId });
}

const db = admin.firestore();

interface LegacyIncome {
  id: string;
  name?: string;
  incomeCalculationMode?: 'FIXED' | 'IMPORTED' | 'DERIVED';
  derivedFrom?: { baseIncomeId: string; multiplier: number };
  calculatedFrom?: { ledgerCode?: string; sampleYear?: number };
  incomeCategory?: string;
  type: string;
  startYear: number;
  endYear?: number;
  baseAmount: number;
  growthRate?: number;
}

interface LegacyExpense {
  id: string;
  name?: string;
  type?: string;
  calculationMode?: 'FIXED' | 'SALARY_PERCENTAGE';
  baseAmount?: number;
  salaryPercentage?: number;
  percentOfSalary?: number;
  salaryPercentageRetirementMode?: string;
  linkedIncomeId?: string;
  fallbackAmount?: number;
  calculatedFrom?: { ledgerCode?: string; debtAccountId?: string };
  growthRate?: number;
  retirementMultiplier: number;
  startYear: number;
  endYear?: number | null;
  currentAnnual?: number;
  expenseCategory?: string;
}

interface LegacyEventPhase {
  name: string;
  startYear: number;
  endYear: number;
  mode?: 'FIXED' | 'SALARY_PERCENTAGE';
  amount?: number;
  percentage?: number;
  linkedIncomeId?: string;
}

interface LegacyPlan {
  incomes?: LegacyIncome[];
  expenses?: LegacyExpense[];
  events?: { id: string; type: string; name: string; phases?: LegacyEventPhase[] }[];
  currentSavings?: number;
  salaryGrowthRate?: number;
  importSettings?: unknown;
  retirementTransition?: { mode?: string; transitionYears?: number };
  birthYear: number;
  retirementAge: number;
  currentYear: number;
}

type Unknowns = Record<string, unknown>;
const strip = (doc: Unknowns, keys: string[]): Unknowns => {
  for (const key of keys) delete doc[key];
  return doc;
};

const migrateIncomeDocs = async (
  incomeDocs: Array<{ snap: { ref: { path: string; update: (data: Unknowns) => Promise<void> } }; data: LegacyIncome }>,
  notes: string[],
): Promise<void> => {
  for (const { snap, data: income } of incomeDocs) {
    if (income.baseAmount === undefined) continue;
    const { incomes: [flat], notes: incomeNotes } = flattenIncomes([income]);
    await snap.ref.update(flat);
    notes.push(...incomeNotes.map((note) => `${snap.ref.path}: ${note}`));
  }
};

const migrateExpenseDocs = async (
  expenseDocs: Array<{ snap: { ref: { path: string; update: (data: Unknowns) => Promise<void> } }; data: LegacyExpense }>,
  incomesForBaseline: LegacyIncome[],
  plan: LegacyPlan,
  notes: string[],
): Promise<void> => {
  for (const { snap, data: expense } of expenseDocs) {
    if (expense.calculationMode === undefined && (expense.percentOfSalary ?? 0) <= 0) continue;
    const { expenses: [flat], notes: expenseNotes } = flattenExpenses([expense], incomesForBaseline, plan);
    await snap.ref.update(flat);
    notes.push(...expenseNotes.map((note) => `${snap.ref.path}: ${note}`));
  }
};

const flattenIncomes = (incomes: LegacyIncome[]): { incomes: Unknowns[]; notes: string[] } => {
  const notes: string[] = [];
  const byId = new Map(incomes.map((income) => [income.id, income]));
  const flattened: Unknowns[] = incomes.map((income) => ({ ...income }));

  for (const income of flattened as Unknowns[]) {
    const legacy = income as unknown as LegacyIncome;
    const mode = legacy.incomeCalculationMode ?? 'FIXED';

    if (mode === 'DERIVED' && legacy.derivedFrom) {
      const base = byId.get(legacy.derivedFrom.baseIncomeId);
      if (!base) {
        console.warn(`[warn] income ${legacy.id}: DERIVED base ${legacy.derivedFrom.baseIncomeId} not found; keeping baseAmount`);
        notes.push(`income ${legacy.id}: derived base missing, kept baseAmount as currentAnnual`);
      } else {
        legacy.baseAmount = Math.round(base.baseAmount * legacy.derivedFrom.multiplier);
        notes.push(`income ${legacy.id}: DERIVED flattened to currentAnnual=${legacy.baseAmount}`);
      }
      delete (income as Unknowns).derivedFrom;
    }

    // v1: currentAnnual is the pre-retirement level; a non-imported stream
    // keeps its level after retirement unless the user adjusts it.
    income.currentAnnual = legacy.baseAmount;
    if (legacy.type !== 'pension') {
      income.retirementAnnual = legacy.baseAmount;
    }
    strip(income, ['baseAmount', 'incomeCalculationMode']);
  }

  return { incomes: flattened, notes };
};

const projectIncomeAtYear = (income: LegacyIncome, year: number, currentYear: number): number => {
  if (year < income.startYear || (income.endYear !== undefined && year > income.endYear)) return 0;
  return income.baseAmount * Math.pow(1 + (income.growthRate ?? 0) / 100, year - currentYear);
};

const baselineSalaryFor = (
  expense: LegacyExpense,
  incomes: LegacyIncome[],
  plan: LegacyPlan,
): number => {
  const retirementYear = plan.birthYear + plan.retirementAge;

  if (expense.linkedIncomeId) {
    const linked = incomes.find((income) => income.id === expense.linkedIncomeId);
    if (!linked) return 0;
    const referenceYear = Math.min(retirementYear, linked.endYear ?? retirementYear);
    return projectIncomeAtYear(linked, referenceYear, plan.currentYear);
  }

  return incomes
    .filter((income) => income.type === 'salary')
    .reduce((sum, income) => {
      const referenceYear = Math.min(retirementYear, income.endYear ?? retirementYear);
      return sum + projectIncomeAtYear(income, referenceYear, plan.currentYear);
    }, 0);
};

const flattenExpenses = (
  expenses: LegacyExpense[],
  incomes: LegacyIncome[],
  plan: LegacyPlan,
): { expenses: Unknowns[]; notes: string[] } => {
  const notes: string[] = [];

  const flattened = expenses.map((expense) => {
    const doc: Unknowns = { ...expense };
    const legacy = expense;
    const mode = legacy.calculationMode ?? 'FIXED';
    const salaryPercentage = legacy.salaryPercentage ?? (legacy.percentOfSalary ?? 0) / 100;

    if (mode === 'SALARY_PERCENTAGE' || (legacy.percentOfSalary ?? 0) > 0) {
      const baseline = baselineSalaryFor(legacy, incomes, plan);
      doc.currentAnnual = Math.round(baseline > 0 ? baseline * salaryPercentage : (legacy.fallbackAmount ?? legacy.baseAmount ?? 0));
      notes.push(`expense ${legacy.id}: SALARY_PERCENTAGE flattened to currentAnnual=${doc.currentAnnual}`);
      strip(doc, ['salaryPercentage', 'salaryPercentageRetirementMode', 'linkedIncomeId', 'fallbackAmount', 'percentOfSalary']);
    } else {
      doc.currentAnnual = legacy.currentAnnual ?? legacy.baseAmount ?? 0;
    }

    // Merge alignment key for "Import from Ledger"; debt payments do not map
    // to a ledger expense code.
    if (legacy.type !== 'debt_payment' && !doc.expenseCategory) {
      const ledgerCode = legacy.calculatedFrom?.ledgerCode;
      if (ledgerCode) {
        doc.expenseCategory = ledgerCode;
        notes.push(`expense ${legacy.id}: expenseCategory backfilled from ${ledgerCode}`);
      }
    }

    strip(doc, ['calculationMode', 'baseAmount']);
    return doc;
  });

  return { expenses: flattened, notes };
};

const flattenEventPhases = (
  phases: LegacyEventPhase[],
  incomes: LegacyIncome[],
  plan: LegacyPlan,
  yearlyIncomeAt: (incomeId: string | undefined, year: number) => number,
  totalSalaryAt: (year: number) => number,
): Unknowns[] =>
  phases.map((phase) => {
    const doc: Unknowns = { ...phase };
    if (phase.mode === 'SALARY_PERCENTAGE') {
      const baseSalary = phase.linkedIncomeId
        ? yearlyIncomeAt(phase.linkedIncomeId, phase.startYear)
        : totalSalaryAt(phase.startYear);
      doc.amount = Math.round(baseSalary * (phase.percentage ?? 0));
      strip(doc, ['mode', 'percentage', 'linkedIncomeId']);
    } else {
      doc.amount = phase.amount ?? 0;
      strip(doc, ['mode']);
    }
    return doc;
  });

const migrate = async (): Promise<void> => {
  const householdSnaps = await db.collection('households').get();
  let migrated = 0;
  let skipped = 0;

  for (const household of householdSnaps.docs) {
    const planSnaps = await household.ref.collection('retirement_plans').get();

    for (const planSnap of planSnaps.docs) {
      const data = planSnap.data() as Unknowns;
      const plan = data as unknown as LegacyPlan;

      const [incomeSnaps, expenseSnaps] = await Promise.all([
        planSnap.ref.collection('incomeStreams').get(),
        planSnap.ref.collection('expenseCategories').get(),
      ]);
      const incomeDocs = incomeSnaps.docs.map((snap) => ({
        snap,
        data: snap.data() as unknown as LegacyIncome,
      }));
      const expenseDocs = expenseSnaps.docs.map((snap) => ({
        snap,
        data: snap.data() as unknown as LegacyExpense,
      }));

      const planHasLegacy =
        (plan.incomes ?? []).some((income) => income.baseAmount !== undefined) ||
        (plan.expenses ?? []).some((expense) => expense.calculationMode !== undefined);
      const incomesHaveLegacy = incomeDocs.some(({ data: income }) => income.baseAmount !== undefined);
      const expensesHaveLegacy = expenseDocs.some(({ data: expense }) => expense.calculationMode !== undefined);

      if (!planHasLegacy && !incomesHaveLegacy && !expensesHaveLegacy) {
        skipped += 1;
        continue;
      }

      // Baseline salary for percentage flattening uses the subcollection
      // incomes when present (the app's read source), else the embedded ones.
      const incomesForBaseline = incomeDocs.length > 0
        ? incomeDocs.map(({ data }) => data)
        : (plan.incomes ?? []);

      const { incomes: flatPlanIncomes, notes: planIncomeNotes } = flattenIncomes(plan.incomes ?? []);
      const { expenses: flatPlanExpenses, notes: planExpenseNotes } = flattenExpenses(
        plan.expenses ?? [],
        incomesForBaseline,
        plan,
      );
      const notes = [...planIncomeNotes, ...planExpenseNotes];

      const yearlyIncomeAt = (incomeId: string | undefined, year: number): number => {
        const income = incomesForBaseline.find((item) => item.id === incomeId);
        if (!income) return 0;
        return income.baseAmount * Math.pow(1 + (income.growthRate ?? 0) / 100, year - plan.currentYear);
      };
      const totalSalaryAt = (year: number): number =>
        incomesForBaseline
          .filter((income) => income.type === 'salary')
          .reduce((sum, income) => sum + yearlyIncomeAt(income.id, year), 0);

      const events = (plan.events ?? []).map((event) => {
        const doc: Unknowns = { ...event };
        if (event.phases && event.phases.length > 0) {
          doc.phases = flattenEventPhases(event.phases, incomesForBaseline, plan, yearlyIncomeAt, totalSalaryAt);
        }
        strip(doc, ['calculationMode']);
        return doc;
      });

      if (dryRun) {
        console.log(`[dry-run] ${planSnap.ref.path}`);
      } else {
        const planDoc: Unknowns = { ...(data) };
        planDoc.incomes = flatPlanIncomes;
        planDoc.expenses = flatPlanExpenses;
        planDoc.events = events;
        strip(planDoc, ['currentSavings', 'salaryGrowthRate', 'importSettings', 'retirementTransition']);
        await planSnap.ref.update(planDoc);

        await migrateIncomeDocs(incomeDocs, notes);
        await migrateExpenseDocs(expenseDocs, incomesForBaseline, plan, notes);

        console.log(`[migrated] ${planSnap.ref.path}`);
      }

      if (plan.retirementTransition?.mode === 'GRADUAL') {
        notes.push('retirementTransition GRADUAL dropped in favour of IMMEDIATE (Q5)');
      }
      for (const note of notes) console.log(`  - ${note}`);
      migrated += 1;
    }
  }

  console.log(`Done: ${migrated} migrated, ${skipped} skipped${dryRun ? ' (dry-run)' : ''}.`);
};

migrate().catch((error) => {
  console.error(error);
  process.exit(1);
});
