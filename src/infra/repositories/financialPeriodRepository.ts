import { collection, doc, writeBatch } from 'firebase/firestore';

import {
  type FinancialPeriod,
  type FinancialPeriodCreate,
  FinancialPeriodSchema,
  buildFinancialPeriodDocId,
} from '@/domains/financial_period/schemas';
import { db } from '@/firebase';
import { BaseRepository } from '@/infra/repositories/baseRepository';

/**
 * FinancialPeriodRepository
 * Path: households/{householdId}/financialPeriods/{docId}
 * The doc ID is the financial period key itself (YYYY-MM, ADR-0050). Records
 * are created when closing starts; absence of a record means OPEN.
 */
class FinancialPeriodRepository extends BaseRepository<FinancialPeriod, [string, string?]> {
  private readonly collectionName = 'financialPeriods';

  protected getCollectionRef(householdId: string) {
    return collection(this.db, 'households', householdId, this.collectionName);
  }

  protected getDocRef(householdId: string, docId: string) {
    return doc(this.db, 'households', householdId, this.collectionName, docId);
  }

  protected getDomainSchema() {
    return FinancialPeriodSchema;
  }

  async getPeriod(householdId: string, yearMonth: string): Promise<FinancialPeriod | null> {
    return this.get([householdId, buildFinancialPeriodDocId(yearMonth)]);
  }

  async listAll(householdId: string): Promise<FinancialPeriod[]> {
    return this.list([householdId]);
  }

  async savePeriod(
    householdId: string,
    period: FinancialPeriodCreate,
    userEmail: string,
  ): Promise<void> {
    await this.set([householdId, buildFinancialPeriodDocId(period.yearMonth)], period, userEmail);
  }

  /** Single-batch upsert (ADR-0066): the reopen commit is all-or-nothing. */
  async savePeriods(
    householdId: string,
    periods: FinancialPeriodCreate[],
    userEmail: string,
  ): Promise<void> {
    if (periods.length === 0) return;
    const batch = writeBatch(this.db);
    for (const period of periods) {
      const docRef = this.getDocRef(householdId, buildFinancialPeriodDocId(period.yearMonth));
      const sanitized = this.sanitize(period as FinancialPeriod) as FinancialPeriod;
      batch.set(
        docRef,
        this.convertToFirestore({
          ...sanitized,
          id: docRef.id,
          createdBy: userEmail,
          updatedBy: userEmail,
        } as FinancialPeriod),
        { merge: true },
      );
    }
    await batch.commit();
  }
}

export const financialPeriodRepository = new FinancialPeriodRepository(db);
