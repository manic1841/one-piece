import { transactionService } from './transactionService';
import { plannedIncomeService } from './plannedIncomeService';
import { projectTransactionService } from './projectTransactionService';
import {
  type Record,
  RecordType,
  unifyRecord,
  transactionConverter,
  plannedIncomeConverter,
  projectTransactionConverter,
} from '@/domains/record/record';
import { FormType } from '@/domains/record/formType';

class RecordService {
  async getRecords(householdId: string) {
    const unifiedRecords: Record[] = [];

    // transaction
    const transactions = await transactionService.getTransactions(householdId);
    transactions.forEach((transaction) => {
      const record: Record = unifyRecord(transaction);
      unifiedRecords.push(record);
    });

    // planned income
    const plannedIncomes = await plannedIncomeService.getPlannedIncomes(householdId);
    plannedIncomes.forEach((plannedIncome) => {
      const record: Record = unifyRecord(plannedIncome);
      unifiedRecords.push(record);
    });

    // project transaction
    const projectTransactions = await projectTransactionService.getProjectTransactions(householdId);
    projectTransactions.forEach((projectTransaction) => {
      const record: Record = unifyRecord(projectTransaction);
      unifiedRecords.push(record);
    });

    return unifiedRecords;
  }

  async createRecord(householdId: string, record: Record, userEmail: string) {
    if (record.formType === FormType.EXPENSE) {
      const tnx = transactionConverter(record);
      await transactionService.createTransaction(householdId, tnx, userEmail);
    } else if (record.formType === FormType.INCOME) {
      const income = plannedIncomeConverter(record);
      await plannedIncomeService.createPlannedIncome(householdId, income, userEmail);
    } else if (record.formType === FormType.TRANSFER) {
      const pt = projectTransactionConverter(record);
      await projectTransactionService.createProjectTransaction(householdId, pt, userEmail);
    }
  }

  async updateRecord(householdId: string, id: string, record: Record, userEmail: string) {
    if (record.recordType === RecordType.TRNASACTION) {
      const tnx = transactionConverter(record);
      await transactionService.updateTransaction(householdId, id, tnx, userEmail);
    } else if (record.recordType === RecordType.PLANNED_INCOME) {
      const income = plannedIncomeConverter(record);
      await plannedIncomeService.updatePlannedIncome(householdId, id, income, userEmail);
    } else if (record.recordType === RecordType.PROJECT_TRANSACTION) {
      const pt = projectTransactionConverter(record);
      await projectTransactionService.updateProjectTransaction(householdId, id, pt, userEmail);
    }
  }

  async deleteRecord(householdId: string, record: Record) {
    if (record.recordType === RecordType.TRNASACTION) {
      const tnx = transactionConverter(record);
      await transactionService.deleteTransaction(householdId, tnx.id);
    } else if (record.recordType === RecordType.PLANNED_INCOME) {
      const income = plannedIncomeConverter(record);
      await plannedIncomeService.deletePlannedIncome(householdId, income.id);
    } else if (record.recordType === RecordType.PROJECT_TRANSACTION) {
      const pt = projectTransactionConverter(record);
      await projectTransactionService.deleteProjectTransactions(householdId, [pt.id]);
    }
  }
}

export const recordService = new RecordService();
