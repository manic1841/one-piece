import { transactionService } from '@/services/transactionService';
import { plannedIncomeService } from '@/services/plannedIncomeService';
import { projectTransactionService } from '@/services/projectTransactionService';
import { toRecord } from '@/domains/record/mappers/toRecord';
import { toSchema } from '@/domains/record/mappers/toSchema';
import {
  RecordType,
  RecordFormType,
  type Record,
  type Transaction,
  type PlannedIncome,
  type ProjectTransaction,
} from '@/domains/record/types';

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

    return records;
  }

  async createRecord(householdId: string, record: Record, userEmail: string) {
    if (record.formType === RecordFormType.EXPENSE) {
      const tnx = toSchema(record, RecordType.TRANSACTION) as Transaction;
      await transactionService.createTransaction(householdId, tnx, userEmail);
      return;
    } else if (record.formType === RecordFormType.INCOME) {
      if (record.allocations && record.allocations.length > 0) {
        const income = toSchema(record, RecordType.PLANNED_INCOME) as PlannedIncome;
        // planned income with allocations
        await plannedIncomeService.createPlannedIncome(householdId, income, userEmail);
        return;
      } else {
        // regular income as transaction
        const tnx = toSchema(record, RecordType.TRANSACTION) as Transaction;
        await transactionService.createTransaction(householdId, tnx, userEmail);
        return;
      }
    } else if (record.formType === RecordFormType.TRANSFER) {
      const pt = toSchema(record, RecordType.PROJECT_TRANSACTION) as ProjectTransaction;
      await projectTransactionService.createProjectTransaction(householdId, pt, userEmail);
    }
  }

  async updateRecord(householdId: string, id: string, record: Record, userEmail: string) {
    if (record.recordType === RecordType.TRANSACTION) {
      const tnx = toSchema(record, RecordType.TRANSACTION) as Transaction;
      await transactionService.updateTransaction(householdId, id, tnx, userEmail);
    } else if (record.recordType === RecordType.PLANNED_INCOME) {
      const income = toSchema(record, RecordType.PLANNED_INCOME) as PlannedIncome;
      await plannedIncomeService.updatePlannedIncome(householdId, id, income, userEmail);
    } else if (record.recordType === RecordType.PROJECT_TRANSACTION) {
      const pt = toSchema(record, RecordType.PROJECT_TRANSACTION) as ProjectTransaction;
      await projectTransactionService.updateProjectTransaction(householdId, id, pt, userEmail);
    }
  }

  async deleteRecord(householdId: string, record: Record) {
    if (record.recordType === RecordType.TRANSACTION) {
      const tnx = toSchema(record, RecordType.TRANSACTION) as Transaction;
      await transactionService.deleteTransaction(householdId, tnx.id);
    } else if (record.recordType === RecordType.PLANNED_INCOME) {
      const income = toSchema(record, RecordType.PLANNED_INCOME) as PlannedIncome;
      await plannedIncomeService.deletePlannedIncome(householdId, income.id);
    } else if (record.recordType === RecordType.PROJECT_TRANSACTION) {
      const pt = toSchema(record, RecordType.PROJECT_TRANSACTION) as ProjectTransaction;
      await projectTransactionService.deleteProjectTransactions(householdId, [pt.id]);
    }
  }
}

export const recordService = new RecordService();
