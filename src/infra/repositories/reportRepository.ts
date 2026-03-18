import {
  collection,
  doc,
  where,
  orderBy,
  type CollectionReference,
  type DocumentData,
  type DocumentReference,
} from 'firebase/firestore';
import { db } from '@/firebase';
import { BaseRepository } from './baseRepository';
import { FinancialReportSchema, type FinancialReport, type ReportType } from '@/domains/report/schemas';
import { transactionRepository } from './transactionRepository';
import { type JournalEntryLine } from '@/domains/ledger/schemas';

export class ReportRepository extends BaseRepository<FinancialReport, [string, string?]> {
  protected getCollectionRef(householdId: string): CollectionReference<DocumentData> {
    return collection(db, 'households', householdId, 'reports');
  }

  protected getDocRef(householdId: string, reportId: string): DocumentReference<DocumentData> {
    return doc(this.getCollectionRef(householdId), reportId);
  }

  protected getDomainSchema() {
    return FinancialReportSchema;
  }

  async getReport(householdId: string, yearMonth: string, type: ReportType): Promise<FinancialReport | null> {
    const reports = await this.list([householdId], [
      where('yearMonth', '==', yearMonth),
      where('type', '==', type)
    ]);
    return reports[0] || null;
  }

  async saveReport(householdId: string, report: Omit<FinancialReport, 'id' | 'createdAt' | 'updatedAt'>, userEmail: string): Promise<void> {
    const existing = await this.getReport(householdId, report.yearMonth, report.type);
    if (existing) {
      await this.update([householdId, existing.id], report, userEmail);
    } else {
      await this.create([householdId], report, userEmail);
    }
  }

  /**
   * Fetch all entries for a given month by querying transactions
   */
  async getEntriesByMonth(householdId: string, yearMonth: string): Promise<JournalEntryLine[]> {
    const [year, month] = yearMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const transactions = await transactionRepository.list([householdId], [
      where('date', '>=', startDate),
      where('date', '<', endDate),
      orderBy('date', 'asc')
    ]);

    const entries: JournalEntryLine[] = [];
    for (const tx of transactions) {
      if (tx.entries && tx.entries.length > 0) {
        entries.push(...tx.entries);
      }
    }
    return entries;
  }

  /**
   * Fetch all entries from the beginning of time until the end of a given month
   */
  async getEntriesUntilMonth(householdId: string, yearMonth: string): Promise<JournalEntryLine[]> {
    const [year, month] = yearMonth.split('-').map(Number);
    const endDate = new Date(year, month, 1);

    const transactions = await transactionRepository.list([householdId], [
      where('date', '<', endDate),
      orderBy('date', 'asc')
    ]);

    const entries: JournalEntryLine[] = [];
    for (const tx of transactions) {
      if (tx.entries && tx.entries.length > 0) {
        entries.push(...tx.entries);
      }
    }
    return entries;
  }
}

export const reportRepository = new ReportRepository(db);
