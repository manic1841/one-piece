/**
 * One-time migration: retirement plan docs from legacy modes to v1 flat fields
 * (issue #127 Q10), plus linked-year resolution (issue #132).
 *
 * Legacy -> v1 transforms per document:
 * - Incomes (standalone + subcollection incomeStreams):
 *   - DERIVED income: flatten to a fixed stream (currentAnnual =
 *     base.currentAnnual * multiplier) and drop derivedFrom.
 *   - baseAmount -> currentAnnual; FIXED income keeps its level after
 *     retirement (retirementAnnual = baseAmount).
 *   - incomeCalculationMode is removed (v1 has no income modes).
 * - Linked year modes (startYearMode/endYearMode = LINKED_TO_RETIREMENT,
 *   issue #132): resolved into concrete startYear/endYear =
 *   birthYear + retirementAge; mode fields are left in place. A lifelong
 *   stream's end year stays unbounded. Reports how many streams resolved.
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
import admin, { type DocumentReference } from 'firebase-admin';

import { applyEmulatorEnv } from '../shared/emulator-env';
import {
  type LinkableIncomeDoc,
  type LinkedYearPatch,
  resolveLinkedIncomeYears,
} from './retirement-linked-years';

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
  startYearMode?: string;
  endYearMode?: string;
  lifelong?: boolean;
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
  incomeDocs: Array<{
    snap: { ref: { path: string; update: (data: Unknowns) => Promise<void> } };
    data: LegacyIncome;
  }>,
  notes: string[],
): Promise<void> => {
  for (const { snap, data: income } of incomeDocs) {
    if (income.baseAmount === undefined) continue;
    const {
      incomes: [flat],
      notes: incomeNotes,
    } = flattenIncomes([income]);
    await snap.ref.update(flat);
    notes.push(...incomeNotes.map((note) => `${snap.ref.path}: ${note}`));
  }
};

const migrateExpenseDocs = async (
  expenseDocs: Array<{
    snap: { ref: { path: string; update: (data: Unknowns) => Promise<void> } };
    data: LegacyExpense;
  }>,
  incomesForBaseline: LegacyIncome[],
  plan: LegacyPlan,
  notes: string[],
): Promise<void> => {
  for (const { snap, data: expense } of expenseDocs) {
    if (expense.calculationMode === undefined && (expense.percentOfSalary ?? 0) <= 0) continue;
    const {
      expenses: [flat],
      notes: expenseNotes,
    } = flattenExpenses([expense], incomesForBaseline, plan);
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
        console.warn(
          `[warn] income ${legacy.id}: DERIVED base ${legacy.derivedFrom.baseIncomeId} not found; keeping baseAmount`,
        );
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
      doc.currentAnnual = Math.round(
        baseline > 0
          ? baseline * salaryPercentage
          : (legacy.fallbackAmount ?? legacy.baseAmount ?? 0),
      );
      notes.push(
        `expense ${legacy.id}: SALARY_PERCENTAGE flattened to currentAnnual=${doc.currentAnnual}`,
      );
      strip(doc, [
        'salaryPercentage',
        'salaryPercentageRetirementMode',
        'linkedIncomeId',
        'fallbackAmount',
        'percentOfSalary',
      ]);
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

/**
 * Applies linked-year patches onto embedded plan incomes before the plan doc
 * write (the plan doc stores incomes inline for legacy plans).
 */
const applyEmbeddedPatches = (incomes: Unknowns[], patches: LinkedYearPatch[]): Unknowns[] =>
  incomes.map((income) => {
    const patch = patches.find((p) => p.id === (income as LinkableIncomeDoc).id);
    return patch ? { ...income, ...patch } : income;
  });

/**
 * Writes resolved startYear/endYear onto income stream docs after the legacy
 * flattening. Separate updates keep the linked-year fix independent: a stream
 * already flattened by a previous run still gets its linked years resolved.
 */
const applyLinkedYearPatches = async (
  planRef: DocumentReference,
  patches: LinkedYearPatch[],
): Promise<void> => {
  for (const patch of patches) {
    const update: Unknowns = {};
    if (patch.startYear !== undefined) update.startYear = patch.startYear;
    if (patch.endYear !== undefined) update.endYear = patch.endYear;
    if (Object.keys(update).length > 0) {
      await planRef.update(update);
    }
  }
};

interface MigratedPlanWrite {
  data: Unknowns;
  flatPlanIncomes: Unknowns[];
  flatPlanExpenses: Unknowns[];
  events: Unknowns[];
  linkedEmbeddedPatches: LinkedYearPatch[];
  linkedSubcollectionPatches: LinkedYearPatch[];
  incomeDocs: Array<{
    snap: { ref: { path: string; update: (data: Unknowns) => Promise<void> } };
    data: LegacyIncome;
  }>;
  expenseDocs: Array<{
    snap: { ref: { path: string; update: (data: Unknowns) => Promise<void> } };
    data: LegacyExpense;
  }>;
  incomesForBaseline: LegacyIncome[];
  plan: LegacyPlan;
  notes: string[];
}

const writeMigratedPlan = async (
  planSnap: { ref: DocumentReference },
  write: MigratedPlanWrite,
): Promise<void> => {
  const planDoc: Unknowns = { ...write.data };
  planDoc.incomes = applyEmbeddedPatches(write.flatPlanIncomes, write.linkedEmbeddedPatches);
  planDoc.expenses = write.flatPlanExpenses;
  planDoc.events = write.events;
  strip(planDoc, ['currentSavings', 'salaryGrowthRate', 'importSettings', 'retirementTransition']);
  await planSnap.ref.update(planDoc);

  await migrateIncomeDocs(write.incomeDocs, write.notes);
  await migrateExpenseDocs(write.expenseDocs, write.incomesForBaseline, write.plan, write.notes);
  await applyLinkedYearPatches(planSnap.ref, write.linkedSubcollectionPatches);
};

const migrate = async (): Promise<void> => {
  const householdSnaps = await db.collection('households').get();
  let migrated = 0;
  let skipped = 0;
  let streamsResolved = 0;

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
        // Firestore doc IDs live on the snapshot, not the doc data; inject
        // them so patch application and DERIVED lookups see the id.
        data: { ...snap.data(), id: snap.id } as unknown as LegacyIncome,
      }));
      const expenseDocs = expenseSnaps.docs.map((snap) => ({
        snap,
        data: { ...snap.data(), id: snap.id } as unknown as LegacyExpense,
      }));

      const planHasLegacy =
        (plan.incomes ?? []).some((income) => income.baseAmount !== undefined) ||
        (plan.expenses ?? []).some((expense) => expense.calculationMode !== undefined);
      const incomesHaveLegacy = incomeDocs.some(
        ({ data: income }) => income.baseAmount !== undefined,
      );
      const expensesHaveLegacy = expenseDocs.some(
        ({ data: expense }) => expense.calculationMode !== undefined,
      );

      if (!planHasLegacy && !incomesHaveLegacy && !expensesHaveLegacy) {
        skipped += 1;
        continue;
      }

      // Baseline salary for percentage flattening uses the subcollection
      // incomes when present (the app's read source), else the embedded ones.
      const incomesForBaseline =
        incomeDocs.length > 0 ? incomeDocs.map(({ data }) => data) : (plan.incomes ?? []);

      const { incomes: flatPlanIncomes, notes: planIncomeNotes } = flattenIncomes(
        plan.incomes ?? [],
      );
      const { expenses: flatPlanExpenses, notes: planExpenseNotes } = flattenExpenses(
        plan.expenses ?? [],
        incomesForBaseline,
        plan,
      );
      const notes = [...planIncomeNotes, ...planExpenseNotes];

      const yearlyIncomeAt = (incomeId: string | undefined, year: number): number => {
        const income = incomesForBaseline.find((item) => item.id === incomeId);
        if (!income) return 0;
        return (
          income.baseAmount * Math.pow(1 + (income.growthRate ?? 0) / 100, year - plan.currentYear)
        );
      };
      const totalSalaryAt = (year: number): number =>
        incomesForBaseline
          .filter((income) => income.type === 'salary')
          .reduce((sum, income) => sum + yearlyIncomeAt(income.id, year), 0);

      const events = (plan.events ?? []).map((event) => {
        const doc: Unknowns = { ...event };
        if (event.phases && event.phases.length > 0) {
          doc.phases = flattenEventPhases(
            event.phases,
            incomesForBaseline,
            plan,
            yearlyIncomeAt,
            totalSalaryAt,
          );
        }
        strip(doc, ['calculationMode']);
        return doc;
      });

      // Linked year modes resolve to the plan's retirement year before the
      // legacy flattening so patches ride the same update calls. Subcollection
      // patches go through separate updates so a stream already flattened by
      // a previous run still gets its linked years resolved.
      const retirementYear = plan.birthYear + plan.retirementAge;
      const linkedEmbedded = resolveLinkedIncomeYears(
        (plan.incomes ?? []) as LinkableIncomeDoc[],
        retirementYear,
      );
      const linkedSubcollection = resolveLinkedIncomeYears(
        incomeDocs.map(({ data }) => data as LinkableIncomeDoc),
        retirementYear,
      );
      const resolvedCount = linkedEmbedded.resolvedCount + linkedSubcollection.resolvedCount;
      streamsResolved += resolvedCount;

      if (dryRun) {
        logDryRunPlan(planSnap.ref.path, resolvedCount, retirementYear);
      } else {
        await writeMigratedPlan(planSnap, {
          data,
          flatPlanIncomes,
          flatPlanExpenses,
          events,
          linkedEmbeddedPatches: linkedEmbedded.patches,
          linkedSubcollectionPatches: linkedSubcollection.patches,
          incomeDocs,
          expenseDocs,
          incomesForBaseline,
          plan,
          notes,
        });
        console.log(`[migrated] ${planSnap.ref.path}`);
      }

      if (plan.retirementTransition?.mode === 'GRADUAL') {
        notes.push('retirementTransition GRADUAL dropped in favour of IMMEDIATE (Q5)');
      }
      for (const note of notes) console.log(`  - ${note}`);
      migrated += 1;
    }
  }

  console.log(
    `Done: ${migrated} migrated, ${skipped} skipped, ${streamsResolved} income stream(s) with linked years resolved${dryRun ? ' (dry-run)' : ''}.`,
  );
};

/**
 * Logs the per-plan dry-run summary including linked-year resolution.
 */
const logDryRunPlan = (planPath: string, resolvedCount: number, retirementYear: number): void => {
  console.log(`[dry-run] ${planPath}`);
  if (resolvedCount > 0) {
    console.log(`  - linked years resolved for ${resolvedCount} stream(s) -> ${retirementYear}`);
  }
};

migrate().catch((error) => {
  console.error(error);
  process.exit(1);
});
