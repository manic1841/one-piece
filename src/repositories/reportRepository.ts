import { db } from '@/firebase';
import { BaseRepository } from '@/repositories/baseRepository';
import { type FinancialReport, FinancialReportSchema } from '@/schemas';
import { collection, doc } from 'firebase/firestore';

class ReportRepository extends BaseRepository<FinancialReport, [string, string?]> {
  private readonly collectionName = 'reports';

  protected getCollectionRef(householdId: string) {
    return collection(this.db, 'households', householdId, this.collectionName);
  }

  protected getDocRef(householdId: string, transactionId: string) {
    return doc(this.db, 'households', householdId, this.collectionName, transactionId);
  }
  protected getDomainSchema() {
    return FinancialReportSchema;
  }
}

export const reportRepository = new ReportRepository(db);
