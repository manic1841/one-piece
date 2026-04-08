import {
  type CollectionReference,
  type DocumentData,
  type DocumentReference,
  collection,
  doc,
  orderBy,
  where,
} from 'firebase/firestore';

import { type JournalEntryLine } from '@/domains/ledger/schemas';
import {
  type FinancialReport,
  FinancialReportSchema,
  type ReportType,
} from '@/domains/report/schemas';
import { db } from '@/firebase';

import { BaseRepository } from './baseRepository';
import { transactionRepository } from './transactionRepository';

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

  buildId(type: ReportType, yearMonth: string): string {
    return `${yearMonth}-${type}`;
  }

  async getReport(
    householdId: string,
    yearMonth: string,
    type: ReportType,
  ): Promise<FinancialReport | null> {
    const reports = await this.list(
      [householdId],
      [where('yearMonth', '==', yearMonth), where('type', '==', type)],
    );
    return reports[0] || null;
  }

  async saveReport(
    householdId: string,
    report: Omit<FinancialReport, 'id' | 'createdAt' | 'updatedAt'>,
    userEmail: string,
  ): Promise<void> {
    const existing = await this.getReport(householdId, report.yearMonth, report.type);
    if (existing) {
      await this.update([householdId, existing.id], report, userEmail);
    } else {
      const id = this.buildId(report.type, report.yearMonth);
      await this.create([householdId], report, userEmail, undefined, id);
    }
  }

  /**
   * Fetch all entries for a given month by querying transactions
   */
  async getEntriesByMonth(householdId: string, yearMonth: string): Promise<JournalEntryLine[]> {
    const [year, month] = yearMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const transactions = await transactionRepository.list(
      [householdId],
      [where('date', '>=', startDate), where('date', '<', endDate), orderBy('date', 'asc')],
    );

    const entries: JournalEntryLine[] = [];
    for (const tx of transactions) {
      if (tx.entries && tx.entries.length > 0) {
        entries.push(...tx.entries);
      }
    }
    return entries;
  }

  /**
   * Fetch all entries for a given year by querying transactions
   */
  async getEntriesByYear(householdId: string, year: string): Promise<JournalEntryLine[]> {
    const yearNum = parseInt(year, 10);
    const startDate = new Date(yearNum, 0, 1);
    const endDate = new Date(yearNum + 1, 0, 1);

    const transactions = await transactionRepository.list(
      [householdId],
      [where('date', '>=', startDate), where('date', '<', endDate), orderBy('date', 'asc')],
    );

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

    const transactions = await transactionRepository.list(
      [householdId],
      [where('date', '<', endDate), orderBy('date', 'asc')],
    );

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
