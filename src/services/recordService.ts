import { toRecord } from '@/domains/record/mappers/toRecord';
import { toSchema } from '@/domains/record/mappers/toSchema';
import {
  type PlannedIncome,
  type ProjectTransaction,
  type Record,
  RecordFormType,
  RecordType,
  type Transaction,
} from '@/domains/record/types';
import { plannedIncomeService } from '@/services/plannedIncomeService';
import { projectTransactionService } from '@/services/projectTransactionService';
import { transactionService } from '@/services/transactionService';

import { type AuthContext, householdService } from './householdService';

class RecordService {
  async getRecords(householdId: string) {
    const records: Record[] = [];

    // transaction
    const transactions = await transactionService.getTransactions(householdId);
    transactions.forEach((transaction) => {
      const record: Record = toRecord(transaction);
      records.push(record);
    });

    // planned income
    const plannedIncomes = await plannedIncomeService.getPlannedIncomes(householdId);
    plannedIncomes.forEach((plannedIncome) => {
      const record: Record = toRecord(plannedIncome);
      records.push(record);
    });

    // project transaction
    const projectTransactions = await projectTransactionService.getProjectTransactions(householdId);
    projectTransactions.forEach((projectTransaction) => {
      const record: Record = toRecord(projectTransaction);
      records.push(record);
    });

    // Sort all records by date descending, if date is same, sort by createdAt descending
    records.sort((a, b) => {
      if (a.date.getTime() === b.date.getTime() && a.createdAt && b.createdAt) {
        return b.createdAt.getTime() - a.createdAt.getTime();
      }
      return b.date.getTime() - a.date.getTime();
    });

    return records;
  }

  async createRecord(householdId: string, record: Record, userEmail: string, auth: AuthContext) {
    await householdService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);
    if (record.formType === RecordFormType.EXPENSE) {
      const tnx = toSchema(record, RecordType.TRANSACTION) as Transaction;
      await transactionService.createTransaction(householdId, tnx, userEmail, auth);
      return;
    } else if (record.formType === RecordFormType.INCOME) {
      if (record.allocations && record.allocations.length > 0) {
        const income = toSchema(record, RecordType.PLANNED_INCOME) as PlannedIncome;
        // planned income with allocations
        await plannedIncomeService.createPlannedIncome(householdId, income, userEmail, auth);
        return;
      } else {
        // regular income as transaction
        const tnx = toSchema(record, RecordType.TRANSACTION) as Transaction;
        await transactionService.createTransaction(householdId, tnx, userEmail, auth);
        return;
      }
    } else if (record.formType === RecordFormType.TRANSFER) {
      const pt = toSchema(record, RecordType.PROJECT_TRANSACTION) as ProjectTransaction;
      await projectTransactionService.createProjectTransaction(householdId, pt, userEmail, auth);
    }
  }

  async updateRecord(
    householdId: string,
    id: string,
    record: Record,
    userEmail: string,
    auth: AuthContext,
  ) {
    await householdService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);
    if (record.recordType === RecordType.TRANSACTION) {
      const tnx = toSchema(record, RecordType.TRANSACTION) as Transaction;
      await transactionService.updateTransaction(householdId, id, tnx, userEmail, auth);
    } else if (record.recordType === RecordType.PLANNED_INCOME) {
      const income = toSchema(record, RecordType.PLANNED_INCOME) as PlannedIncome;
      await plannedIncomeService.updatePlannedIncome(householdId, id, income, userEmail, auth);
    } else if (record.recordType === RecordType.PROJECT_TRANSACTION) {
      const pt = toSchema(record, RecordType.PROJECT_TRANSACTION) as ProjectTransaction;
      await projectTransactionService.updateProjectTransaction(
        householdId,
        id,
        pt,
        userEmail,
        auth,
      );
    }
  }

  async deleteRecord(householdId: string, record: Record, auth: AuthContext) {
    await householdService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);
    if (record.recordType === RecordType.TRANSACTION) {
      const tnx = toSchema(record, RecordType.TRANSACTION) as Transaction;
      await transactionService.deleteTransaction(householdId, tnx.id, auth);
    } else if (record.recordType === RecordType.PLANNED_INCOME) {
      const income = toSchema(record, RecordType.PLANNED_INCOME) as PlannedIncome;
      await plannedIncomeService.deletePlannedIncome(householdId, income.id, auth);
    } else if (record.recordType === RecordType.PROJECT_TRANSACTION) {
      const pt = toSchema(record, RecordType.PROJECT_TRANSACTION) as ProjectTransaction;
      await projectTransactionService.deleteProjectTransactions(householdId, [pt.id], auth);
    }
  }
}

export const recordService = new RecordService();
