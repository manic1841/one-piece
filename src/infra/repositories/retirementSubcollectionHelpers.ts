import { type Firestore, type Transaction, collection, doc, getDocs } from 'firebase/firestore';

import {
  RetirementExpenseCategorySchema,
  RetirementIncomeSourceSchema,
} from '@/domains/retirement/schemas';
import {
  type RetirementExpenseCategory,
  type RetirementIncomeSource,
} from '@/domains/retirement/types';

// --- Deep-cleaning utilities ---

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as T;
  }

  if (isPlainObject(value)) {
    const cleanedEntries = Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, stripUndefinedDeep(v)]);
    return Object.fromEntries(cleanedEntries) as T;
  }

  return value;
}

// --- Converter type (mirrors BaseRepository protected methods) ---

type DateConverter = (value: unknown) => unknown;

// --- Collection ref builders ---

function getIncomeStreamsCollectionRef(db: Firestore, householdId: string, planId: string) {
  return collection(db, 'households', householdId, 'retirement_plans', planId, 'incomeStreams');
}

function getExpenseCategoriesCollectionRef(db: Firestore, householdId: string, planId: string) {
  return collection(db, 'households', householdId, 'retirement_plans', planId, 'expenseCategories');
}

// --- Subcollection read helpers ---

export async function listIncomeStreams(
  db: Firestore,
  convertTimestampToDate: DateConverter,
  householdId: string,
  planId: string,
): Promise<RetirementIncomeSource[]> {
  const snapshot = await getDocs(getIncomeStreamsCollectionRef(db, householdId, planId));
  return snapshot.docs.map((incomeDoc) => {
    const converted = convertTimestampToDate(incomeDoc.data());
    const parsed = RetirementIncomeSourceSchema.parse(converted);
    return parsed;
  });
}

export async function listExpenseCategories(
  db: Firestore,
  convertTimestampToDate: DateConverter,
  householdId: string,
  planId: string,
): Promise<RetirementExpenseCategory[]> {
  const snapshot = await getDocs(getExpenseCategoriesCollectionRef(db, householdId, planId));
  const expenses = snapshot.docs.map((expenseDoc) => {
    const converted = convertTimestampToDate(expenseDoc.data());
    return RetirementExpenseCategorySchema.parse(converted);
  });

  return expenses;
}

// --- Transaction-scoped children writer ---

export function writeChildrenInTransaction(
  db: Firestore,
  convertDateToTimestamp: DateConverter,
  householdId: string,
  planId: string,
  userEmail: string,
  incomes: RetirementIncomeSource[],
  expenses: RetirementExpenseCategory[],
  tx: Transaction,
): void {
  const now = new Date();
  for (const income of incomes) {
    const docRef = doc(getIncomeStreamsCollectionRef(db, householdId, planId), income.id);
    const converted = convertDateToTimestamp(income) as Record<string, unknown>;
    tx.set(
      docRef,
      stripUndefinedDeep({
        ...converted,
        id: income.id,
        createdAt: converted.createdAt ?? now,
        createdBy: userEmail,
        updatedAt: now,
        updatedBy: userEmail,
      }),
    );
  }

  for (const expense of expenses) {
    const docRef = doc(getExpenseCategoriesCollectionRef(db, householdId, planId), expense.id);
    const converted = convertDateToTimestamp(expense) as Record<string, unknown>;
    tx.set(
      docRef,
      stripUndefinedDeep({
        ...converted,
        id: expense.id,
        createdAt: converted.createdAt ?? now,
        createdBy: userEmail,
        updatedAt: now,
        updatedBy: userEmail,
      }),
    );
  }
}
