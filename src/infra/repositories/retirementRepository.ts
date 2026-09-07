import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  runTransaction,
  type Transaction,
  writeBatch,
} from 'firebase/firestore';

import {
  RetirementPlanCommandError,
  RetirementPlanCommandErrorCode,
  RETIREMENT_PLAN_TRANSACTION_WRITE_LIMIT,
} from '@/application/retirement/retirementPlanErrors';
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

  // Lightweight list for plan index pages. Avoids N+1 reads on subcollections.
  async getPlanSummaries(householdId: string): Promise<RetirementPlan[]> {
    return this.list([householdId], [orderBy('updatedAt', 'desc')]);
  }

  async createPlanAtomically(input: {
    householdId: string;
    plan: RetirementPlanCreate;
    userEmail: string;
    existingPlans: RetirementPlan[];
  }): Promise<string> {
    const { householdId, plan, userEmail, existingPlans } = input;
    const { incomes, expenses, ...planWithoutCollections } = plan;

    return runTransaction(this.db, async (tx) => {
      const writeCount =
        1 + incomes.length + expenses.length + Math.max(existingPlans.length - 1, 0);
      if (writeCount > RETIREMENT_PLAN_TRANSACTION_WRITE_LIMIT) {
        throw new RetirementPlanCommandError(
          RetirementPlanCommandErrorCode.PLAN_TOO_LARGE,
          `plan write count ${writeCount} exceeds the transaction limit ${RETIREMENT_PLAN_TRANSACTION_WRITE_LIMIT}`,
        );
      }

      const planRef = doc(this.getCollectionRef(householdId));
      const planId = planRef.id;

      tx.set(
        planRef,
        this.convertToFirestore({
          ...(stripUndefinedDeep(planWithoutCollections) as RetirementPlanCreate),
          id: planId,
          createdBy: userEmail,
          updatedBy: userEmail,
        } as RetirementPlan),
      );
      this.writeChildrenInTransaction(householdId, planId, userEmail, incomes, expenses, tx);

      for (const activePlan of existingPlans) {
        if (activePlan.id === planId) continue;
        tx.update(this.getDocRef(householdId, activePlan.id), {
          isActive: false,
          updatedAt: new Date(),
          updatedBy: userEmail,
        });
      }

      return planId;
    });
  }

  async updatePlanAtomically(input: {
    householdId: string;
    planId: string;
    updates: Partial<RetirementPlanCreate>;
    userEmail: string;
    existingPlans: RetirementPlan[];
  }): Promise<void> {
    const { householdId, planId, updates, userEmail, existingPlans } = input;
    const { incomes, expenses, ...planUpdates } = updates;

    // Preflight outside the transaction: getDocs inside runTransaction poisons
    // the read set on this SDK version and silently drops later writes.
    const staleIncomeDocs = incomes
      ? await getDocs(this.getIncomeStreamsCollectionRef(householdId, planId))
      : null;
    const staleExpenseDocs = expenses
      ? await getDocs(this.getExpenseCategoriesCollectionRef(householdId, planId))
      : null;

    await runTransaction(this.db, async (tx) => {
      const existingPlan = await this.get([householdId, planId], tx);
      if (!existingPlan) {
        throw new RetirementPlanCommandError(
          RetirementPlanCommandErrorCode.PLAN_NOT_FOUND,
          'Retirement plan not found.',
        );
      }

      const fanOutTargets = updates.isActive === true ? existingPlans : [];
      const writeCount =
        1 + (incomes?.length ?? 0) + (expenses?.length ?? 0) + Math.max(fanOutTargets.length - 1, 0);
      if (writeCount > RETIREMENT_PLAN_TRANSACTION_WRITE_LIMIT) {
        throw new RetirementPlanCommandError(
          RetirementPlanCommandErrorCode.PLAN_TOO_LARGE,
          `plan write count ${writeCount} exceeds the transaction limit ${RETIREMENT_PLAN_TRANSACTION_WRITE_LIMIT}`,
        );
      }

      if (Object.keys(planUpdates).length > 0) {
        tx.update(
          this.getDocRef(householdId, planId),
          this.convertToFirestore({
            ...(stripUndefinedDeep(planUpdates) as Partial<RetirementPlanCreate>),
            id: planId,
            createdBy: existingPlan.createdBy,
            updatedBy: userEmail,
          } as RetirementPlan),
        );
      }

      if (staleIncomeDocs) {
        for (const staleDoc of staleIncomeDocs.docs) {
          tx.delete(staleDoc.ref);
        }
      }
      if (staleExpenseDocs) {
        for (const staleDoc of staleExpenseDocs.docs) {
          tx.delete(staleDoc.ref);
        }
      }
      this.writeChildrenInTransaction(householdId, planId, userEmail, incomes ?? [], expenses ?? [], tx);

      if (updates.isActive === true) {
        for (const activePlan of fanOutTargets) {
          if (activePlan.id === planId) continue;
          tx.update(this.getDocRef(householdId, activePlan.id), {
            isActive: false,
            updatedAt: new Date(),
            updatedBy: userEmail,
          });
        }
      }
    });
  }

  async deletePlanAtomically(input: {
    householdId: string;
    planId: string;
  }): Promise<void> {
    const { householdId, planId } = input;

    // Preflight outside the transaction (see updatePlanAtomically note).
    const incomeDocs = await getDocs(this.getIncomeStreamsCollectionRef(householdId, planId));
    const expenseDocs = await getDocs(
      this.getExpenseCategoriesCollectionRef(householdId, planId),
    );
    const writeCount = 1 + incomeDocs.docs.length + expenseDocs.docs.length;
    if (writeCount > RETIREMENT_PLAN_TRANSACTION_WRITE_LIMIT) {
      throw new RetirementPlanCommandError(
        RetirementPlanCommandErrorCode.PLAN_TOO_LARGE,
        `plan write count ${writeCount} exceeds the transaction limit ${RETIREMENT_PLAN_TRANSACTION_WRITE_LIMIT}`,
      );
    }

    await runTransaction(this.db, async (tx) => {
      const existingPlan = await this.get([householdId, planId], tx);
      if (!existingPlan) {
        throw new RetirementPlanCommandError(
          RetirementPlanCommandErrorCode.PLAN_NOT_FOUND,
          'Retirement plan not found.',
        );
      }

      for (const incomeDoc of incomeDocs.docs) {
        tx.delete(incomeDoc.ref);
      }
      for (const expenseDoc of expenseDocs.docs) {
        tx.delete(expenseDoc.ref);
      }
      tx.delete(this.getDocRef(householdId, planId));
    });
  }

  private writeChildrenInTransaction(
    householdId: string,
    planId: string,
    userEmail: string,
    incomes: RetirementIncomeSource[],
    expenses: RetirementExpenseCategory[],
    tx: Transaction,
  ): void {
    for (const income of incomes) {
      const docRef = doc(
        this.getIncomeStreamsCollectionRef(householdId, planId),
        income.id,
      );
      const converted = this.convertDateToTimestamp(income) as Record<string, unknown>;
      tx.set(
        docRef,
        stripUndefinedDeep({
          ...converted,
          id: income.id,
          updatedAt: new Date(),
          updatedBy: userEmail,
        }),
      );
    }

    for (const expense of expenses) {
      const docRef = doc(
        this.getExpenseCategoriesCollectionRef(householdId, planId),
        expense.id,
      );
      const converted = this.convertDateToTimestamp(expense) as Record<string, unknown>;
      tx.set(
        docRef,
        stripUndefinedDeep({
          ...converted,
          id: expense.id,
          updatedAt: new Date(),
          updatedBy: userEmail,
        }),
      );
    }
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
