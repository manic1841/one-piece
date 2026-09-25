import { collection, doc, getDocs, orderBy, runTransaction } from 'firebase/firestore';

import {
  RetirementPlanCommandError,
  RetirementPlanCommandErrorCode,
} from '@/domains/retirement/retirementPlanErrors';
import { RetirementPlanSchema } from '@/domains/retirement/schemas';
import { type RetirementPlan, type RetirementPlanCreate } from '@/domains/retirement/types';
import { db } from '@/firebase';
import { BaseRepository } from '@/infra/repositories/baseRepository';
import {
  listExpenseCategories,
  listIncomeStreams,
  stripUndefinedDeep,
  writeChildrenInTransaction,
} from '@/infra/repositories/retirementSubcollectionHelpers';

class RetirementRepository extends BaseRepository<RetirementPlan, [string, string?]> {
  private readonly collectionName = 'retirement_plans';

  protected getCollectionRef(householdId: string) {
    return collection(this.db, 'households', householdId, this.collectionName);
  }

  protected getDocRef(householdId: string, planId: string) {
    return doc(this.db, 'households', householdId, this.collectionName, planId);
  }

  protected getDomainSchema() {
    return RetirementPlanSchema;
  }

  async getPlans(householdId: string): Promise<RetirementPlan[]> {
    const plans = await this.list([householdId], [orderBy('updatedAt', 'desc')]);
    const enriched = await Promise.all(
      plans.map(async (plan) => ({
        ...plan,
        incomes: await listIncomeStreams(
          this.db,
          this.convertTimestampToDate.bind(this),
          householdId,
          plan.id,
        ),
        expenses: await listExpenseCategories(
          this.db,
          this.convertTimestampToDate.bind(this),
          householdId,
          plan.id,
        ),
      })),
    );
    return enriched;
  }

  // Lightweight list for plan index pages. Avoids N+1 reads on subcollections.
  async getPlanSummaries(householdId: string): Promise<RetirementPlan[]> {
    return this.list([householdId], [orderBy('updatedAt', 'desc')]);
  }

  async countChildren(
    householdId: string,
    planId: string,
    collectionName: 'incomes' | 'expenses',
  ): Promise<number> {
    const ref =
      collectionName === 'incomes'
        ? collection(
            this.db,
            'households',
            householdId,
            this.collectionName,
            planId,
            'incomeStreams',
          )
        : collection(
            this.db,
            'households',
            householdId,
            this.collectionName,
            planId,
            'expenseCategories',
          );
    const snapshot = await getDocs(ref);
    return snapshot.docs.length;
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
      writeChildrenInTransaction(
        this.db,
        this.convertDateToTimestamp.bind(this),
        householdId,
        planId,
        userEmail,
        incomes,
        expenses,
        tx,
      );

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
    const incomeRef = collection(
      this.db,
      'households',
      householdId,
      this.collectionName,
      planId,
      'incomeStreams',
    );
    const expenseRef = collection(
      this.db,
      'households',
      householdId,
      this.collectionName,
      planId,
      'expenseCategories',
    );
    const staleIncomeDocs = incomes ? await getDocs(incomeRef) : null;
    const staleExpenseDocs = expenses ? await getDocs(expenseRef) : null;

    await runTransaction(this.db, async (tx) => {
      const existingPlan = await this.get([householdId, planId], tx);
      if (!existingPlan) {
        throw new RetirementPlanCommandError(
          RetirementPlanCommandErrorCode.PLAN_NOT_FOUND,
          'Retirement plan not found.',
        );
      }

      if (Object.keys(planUpdates).length > 0) {
        tx.update(
          this.getDocRef(householdId, planId),
          this.convertToFirestore({
            ...(stripUndefinedDeep(planUpdates) as Partial<RetirementPlanCreate>),
            id: planId,
            createdAt: existingPlan.createdAt,
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
      writeChildrenInTransaction(
        this.db,
        this.convertDateToTimestamp.bind(this),
        householdId,
        planId,
        userEmail,
        incomes ?? [],
        expenses ?? [],
        tx,
      );

      if (updates.isActive === true) {
        for (const activePlan of existingPlans) {
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

  async deletePlanAtomically(input: { householdId: string; planId: string }): Promise<void> {
    const { householdId, planId } = input;

    // Preflight outside the transaction (see updatePlanAtomically note).
    const incomeRef = collection(
      this.db,
      'households',
      householdId,
      this.collectionName,
      planId,
      'incomeStreams',
    );
    const expenseRef = collection(
      this.db,
      'households',
      householdId,
      this.collectionName,
      planId,
      'expenseCategories',
    );
    const incomeDocs = await getDocs(incomeRef);
    const expenseDocs = await getDocs(expenseRef);

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

  async getPlan(householdId: string, id: string): Promise<RetirementPlan | null> {
    const plan = await this.get([householdId, id]);
    if (!plan) return null;

    const incomes = await listIncomeStreams(
      this.db,
      this.convertTimestampToDate.bind(this),
      householdId,
      id,
    );
    const expenses = await listExpenseCategories(
      this.db,
      this.convertTimestampToDate.bind(this),
      householdId,
      id,
    );
    return {
      ...plan,
      incomes,
      expenses,
    };
  }
}

export const retirementRepository = new RetirementRepository(db);
