import { collection, doc } from 'firebase/firestore';

import { db } from '@/firebase';
import { BaseRepository } from '@/repositories/baseRepository';
import { type FinancialReport, FinancialReportSchema } from '@/schemas';

class ReportRepository extends BaseRepository<FinancialReport, [string, string?]> {
  private readonly collectionName = 'reports';

  protected getCollectionRef(householdId: string) {
    return collection(this.db, 'households', householdId, this.collectionName);
  }

  protected getDocRef(householdId: string, reportId: string) {
    return doc(this.db, 'households', householdId, this.collectionName, reportId);
  }
  protected getDomainSchema() {
    return FinancialReportSchema;
  }

  buildId(type: string, year: number, month: number): string {
    return `${type.toLowerCase()}-${year}-${String(month).padStart(2, '0')}`;
  }
}

export const reportRepository = new ReportRepository(db);
