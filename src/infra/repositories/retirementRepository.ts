import { collection, deleteDoc, doc, getDocs, orderBy, writeBatch } from 'firebase/firestore';

import {
  RetirementExpenseCategorySchema,
  RetirementIncomeSourceSchema,
  RetirementPlanSchema,
} from '@/domains/retirement/schemas';
import {
  type RetirementExpenseCategory,
  type RetirementIncomeSource,
  type RetirementPlan,
  type RetirementPlanCreate,
} from '@/domains/retirement/types';
import { db } from '@/firebase';
import { BaseRepository } from '@/infra/repositories/baseRepository';
import { logger } from '@/utils/logger';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function stripUndefinedDeep<T>(value: T): T {
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

class RetirementRepository extends BaseRepository<RetirementPlan, [string, string?]> {
  private readonly collectionName = 'retirement_plans';

  protected getCollectionRef(householdId: string) {
    return collection(this.db, 'households', householdId, this.collectionName);
  }

  protected getDocRef(householdId: string, planId: string) {
    return doc(this.db, 'households', householdId, this.collectionName, planId);
  }

  private getIncomeStreamsCollectionRef(householdId: string, planId: string) {
    return collection(
      this.db,
      'households',
      householdId,
      this.collectionName,
      planId,
      'incomeStreams',
    );
  }

  private getExpenseCategoriesCollectionRef(householdId: string, planId: string) {
    return collection(
      this.db,
      'households',
      householdId,
      this.collectionName,
      planId,
      'expenseCategories',
    );
  }

  protected getDomainSchema() {
    return RetirementPlanSchema;
  }

  private async listIncomeStreams(
    householdId: string,
    planId: string,
  ): Promise<RetirementIncomeSource[]> {
    const snapshot = await getDocs(this.getIncomeStreamsCollectionRef(householdId, planId));
    return snapshot.docs.map((incomeDoc) => {
      const converted = this.convertTimestampToDate(incomeDoc.data());
      const parsed = RetirementIncomeSourceSchema.parse(converted);
      return parsed;
    });
  }

  private async replaceIncomeStreams(
    householdId: string,
    planId: string,
    userEmail: string,
    incomes: RetirementIncomeSource[],
  ): Promise<void> {
    const collectionRef = this.getIncomeStreamsCollectionRef(householdId, planId);
    const existingDocs = await getDocs(collectionRef);
    const batch = writeBatch(this.db);

    for (const incomeDoc of existingDocs.docs) {
      batch.delete(incomeDoc.ref);
    }

    const now = new Date();
    for (const income of incomes) {
      const docRef = doc(collectionRef, income.id);
      const converted = this.convertDateToTimestamp(income) as Record<string, unknown>;
      const payload = stripUndefinedDeep({
        ...converted,
        id: income.id,
        createdAt: converted.createdAt ?? now,
        updatedAt: now,
        createdBy: userEmail,
        updatedBy: userEmail,
      });
      batch.set(docRef, payload);
    }

    await batch.commit();
  }

  private async listExpenseCategories(
    householdId: string,
    planId: string,
  ): Promise<RetirementExpenseCategory[]> {
    const snapshot = await getDocs(this.getExpenseCategoriesCollectionRef(householdId, planId));
    const expenses = snapshot.docs.map((expenseDoc) => {
      const converted = this.convertTimestampToDate(expenseDoc.data());
      return RetirementExpenseCategorySchema.parse(converted);
    });

    logger.debug('listExpenseCategories loaded', 'retirement/retirementRepository', {
      householdId,
      planId,
      count: expenses.length,
      salaryModeItems: expenses
        .filter((expense) => expense.calculationMode === 'SALARY_PERCENTAGE')
        .map((expense) => ({
          id: expense.id,
          name: expense.name,
          linkedIncomeId: expense.linkedIncomeId,
          salaryPercentageRetirementMode: expense.salaryPercentageRetirementMode,
        })),
    });

    return expenses;
  }

  private async replaceExpenseCategories(
    householdId: string,
    planId: string,
    userEmail: string,
    expenses: RetirementExpenseCategory[],
  ): Promise<void> {
    const collectionRef = this.getExpenseCategoriesCollectionRef(householdId, planId);
    const existingDocs = await getDocs(collectionRef);
    const batch = writeBatch(this.db);

    for (const expenseDoc of existingDocs.docs) {
      batch.delete(expenseDoc.ref);
    }

    const now = new Date();
    for (const expense of expenses) {
      const docRef = doc(collectionRef, expense.id);
      const converted = this.convertDateToTimestamp(expense) as Record<string, unknown>;
      const payload = stripUndefinedDeep({
        ...converted,
        id: expense.id,
        createdAt: converted.createdAt ?? now,
        updatedAt: now,
        createdBy: userEmail,
        updatedBy: userEmail,
      });
      batch.set(docRef, payload);
    }

    await batch.commit();
  }

  async getPlans(householdId: string): Promise<RetirementPlan[]> {
    const plans = await this.list([householdId], [orderBy('updatedAt', 'desc')]);
    const enriched = await Promise.all(
      plans.map(async (plan) => ({
        ...plan,
        incomes: await this.listIncomeStreams(householdId, plan.id),
        expenses: await this.listExpenseCategories(householdId, plan.id),
      })),
    );
    return enriched;
  }

  async getPlan(householdId: string, id: string): Promise<RetirementPlan | null> {
    const plan = await this.get([householdId, id]);
    if (!plan) return null;

    const incomes = await this.listIncomeStreams(householdId, id);
    const expenses = await this.listExpenseCategories(householdId, id);
    return {
      ...plan,
      incomes,
      expenses,
    };
  }

  async createPlan(
    householdId: string,
    userEmail: string,
    data: RetirementPlanCreate,
  ): Promise<string> {
    const { incomes = [], expenses = [], ...planWithoutCollections } = data;
    const planId = await this.create(
      [householdId],
      { ...planWithoutCollections, incomes: [], expenses: [] },
      userEmail,
    );
    if (incomes.length > 0) {
      await this.replaceIncomeStreams(householdId, planId, userEmail, incomes);
    }
    if (expenses.length > 0) {
      await this.replaceExpenseCategories(householdId, planId, userEmail, expenses);
    }
    return planId;
  }

  async setOnlyActivePlan(
    householdId: string,
    activePlanId: string,
    userEmail: string,
  ): Promise<void> {
    const snapshot = await getDocs(this.getCollectionRef(householdId));
    const batch = writeBatch(this.db);
    const now = new Date();

    for (const planDoc of snapshot.docs) {
      batch.update(planDoc.ref, {
        isActive: planDoc.id === activePlanId,
        updatedAt: now,
        updatedBy: userEmail,
      });
    }

    await batch.commit();
  }

  async updatePlan(
    householdId: string,
    id: string,
    userEmail: string,
    data: Partial<RetirementPlanCreate>,
  ): Promise<void> {
    const { incomes, expenses, ...planUpdates } = data;

    logger.debug('retirementRepository.updatePlan started', 'retirement/retirementRepository', {
      householdId,
      planId: id,
      userEmail,
      planUpdateKeys: Object.keys(planUpdates),
      hasIncomes: Array.isArray(incomes),
      incomesCount: Array.isArray(incomes) ? incomes.length : undefined,
      hasExpenses: Array.isArray(expenses),
      expensesCount: Array.isArray(expenses) ? expenses.length : undefined,
    });

    await this.update(
      [householdId, id],
      { ...planUpdates, incomes: undefined, expenses: undefined },
      userEmail,
    );

    logger.debug(
      'retirementRepository.update main document updated',
      'retirement/retirementRepository',
      {
        householdId,
        planId: id,
      },
    );

    if (incomes) {
      await this.replaceIncomeStreams(
        householdId,
        id,
        userEmail,
        incomes as RetirementIncomeSource[],
      );
      logger.debug(
        'retirementRepository.replaceIncomeStreams completed',
        'retirement/retirementRepository',
        {
          householdId,
          planId: id,
          incomesCount: incomes.length,
        },
      );
    }
    if (expenses) {
      await this.replaceExpenseCategories(
        householdId,
        id,
        userEmail,
        expenses as RetirementExpenseCategory[],
      );
      logger.debug(
        'retirementRepository.replaceExpenseCategories completed',
        'retirement/retirementRepository',
        {
          householdId,
          planId: id,
          expensesCount: expenses.length,
        },
      );
    }

    logger.info('retirementRepository.updatePlan completed', 'retirement/retirementRepository', {
      householdId,
      planId: id,
    });
  }

  async deletePlan(householdId: string, id: string): Promise<void> {
    const incomeStreamDocs = await getDocs(this.getIncomeStreamsCollectionRef(householdId, id));
    const expenseCategoryDocs = await getDocs(
      this.getExpenseCategoriesCollectionRef(householdId, id),
    );
    await Promise.all(incomeStreamDocs.docs.map((incomeDoc) => deleteDoc(incomeDoc.ref)));
    await Promise.all(expenseCategoryDocs.docs.map((expenseDoc) => deleteDoc(expenseDoc.ref)));
    await this.delete([householdId, id]);
  }
}

export const retirementRepository = new RetirementRepository(db);
