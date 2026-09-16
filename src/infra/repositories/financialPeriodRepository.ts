import {
  type FinancialPeriod,
  type FinancialPeriodCreate,
  FinancialPeriodSchema,
  buildFinancialPeriodDocId,
} from '@/domains/financial_period/schemas';
import { db } from '@/firebase';
import { BaseRepository } from '@/infra/repositories/baseRepository';
import { collection, doc } from 'firebase/firestore';

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

  async savePeriod(
    householdId: string,
    period: FinancialPeriodCreate,
    userEmail: string,
  ): Promise<void> {
    await this.set([householdId, buildFinancialPeriodDocId(period.yearMonth)], period, userEmail);
  }
}

export const financialPeriodRepository = new FinancialPeriodRepository(db);
