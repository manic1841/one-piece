import { type Transaction, runTransaction } from 'firebase/firestore';

import {
  calculateClosingBalance,
  calculateDividends,
} from '@/domains/finance/logic/financialLogic';
import { EquitySubCategory, ReportType } from '@/domains/finance/types';
import { db } from '@/firebase';
import { type Project } from '@/schemas';
import { type AuthContext, householdService } from '@/services/householdService';
import { type ProjectWithSnapshot, projectService } from '@/services/projectService';
import { logger } from '@/utils/logger';

import { financialReportService } from './financialReportService';

class FinancialClosingService {
  /**
   * Close a specific month financially.
   * This fetches reports (reads) and then executes writes to balance sheets/snapshots.
   */
  async closeMonth(
    householdId: string,
    year: number,
    month: number,
    userId: string,
    userEmail: string,
    auth: AuthContext,
    providedNetIncome?: number,
    tx?: Transaction,
  ): Promise<void> {
    let netIncome = providedNetIncome;

    // If netIncome is not provided, generate or fetch the report to get it.
    if (netIncome === undefined) {
      const reports = await financialReportService.generateFinancialReports(
        householdId,
        year,
        month,
        userId,
      );
      if (
        reports.incomeStatement.type !== ReportType.INCOME_STATEMENT ||
        !('netIncome' in reports.incomeStatement.data)
      ) {
        throw new Error('Invalid income statement data');
      }
      netIncome = reports.incomeStatement.data.netIncome;
    }

    const data = await this.getClosingData(householdId, year, month);

    const execute = async (t: Transaction) => {
      await householdService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin, t);
      await this.executeClosing(
        householdId,
        year,
        month,
        userEmail,
        auth,
        netIncome!,
        data.dividends,
        data.retainedEarningsProject,
        t,
      );
    };

    if (tx) {
      await execute(tx);
    } else {
      await runTransaction(db, (t) => execute(t));
    }
  }

  /**
   * Internal helper to fetch data for closing (contains queries, call outside tx)
   * Public so it can be used by financialReportService.saveFinancialReports
   */
  async getClosingData(householdId: string, year: number, month: number) {
    const allProjects = await projectService.getProjects(householdId);
    const projectsWithSnapshots = await Promise.all(
      allProjects.map((p: Project) =>
        projectService.getProjectWithSnapshot(householdId, p.id, year, month),
      ),
    );

    const dividends = calculateDividends(projectsWithSnapshots);
    const retainedEarningsProject = projectsWithSnapshots.find(
      (p) => p.accounting?.balanceSheet?.subcategory === EquitySubCategory.RETAINED_EARNINGS,
    );

    if (!retainedEarningsProject) {
      throw new Error('Retained Earnings project not found');
    }

    return { dividends, retainedEarningsProject };
  }

  /**
   * Internal helper to execute closing writes (READs then WRITEs)
   * Public so it can be used by financialReportService.saveFinancialReports
   */
  async executeClosing(
    householdId: string,
    year: number,
    month: number,
    userEmail: string,
    auth: AuthContext,
    netIncome: number,
    dividends: number,
    retainedEarningsProject: ProjectWithSnapshot,
    tx: Transaction,
  ) {
    logger.info(`executeClosing: ${year}-${month}`, 'FinancialClosingService');

    const prevYear = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;

    // READ phase
    const prevSnapshot = await projectService.getSnapshotForPeriod(
      householdId,
      retainedEarningsProject.id,
      prevYear,
      prevMonth,
      tx,
    );
    const openingBalance = prevSnapshot?.closingBalance || 0;

    // WRITE phase
    const closingBalance = calculateClosingBalance(openingBalance, netIncome, dividends);
    const snapshotData = {
      year,
      month,
      openingBalance,
      income: netIncome,
      expense: dividends,
      closingBalance,
    };

    if (retainedEarningsProject.snapshot) {
      await projectService.updateSnapshot(
        householdId,
        retainedEarningsProject.id,
        retainedEarningsProject.snapshot.id,
        snapshotData,
        userEmail,
        auth,
        tx,
      );
    } else {
      await projectService.recordSnapshot(
        householdId,
        retainedEarningsProject.id,
        snapshotData,
        userEmail,
        auth,
        tx,
      );
    }
  }
}

export const financialClosingService = new FinancialClosingService();
