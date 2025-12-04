import { transactionService } from '../services/transactionService';
import { plannedIncomeService } from '../services/plannedIncomeService';
import { projectTransactionService } from '../services/projectTransactionService';
import {
  type UnifiedRecord,
  RecordType,
  normalizeRecord,
  transactionConverter,
  plannedIncomeConverter,
  projectTransactionConverter,
} from '@/components/transactions/form/types/unifiedRecord';
import { FormType } from '@/components/transactions/form/types/formType';

class UnifiedRecordService {
  async getUnifiedRecords(householdId: string) {
    const unifiedRecords: UnifiedRecord[] = [];

    // transaction
    const transactions = await transactionService.getTransactions(householdId);
    transactions.forEach((transaction) => {
      const record: UnifiedRecord = normalizeRecord(transaction);
      unifiedRecords.push(record);
    });

    // planned income
    const plannedIncomes = await plannedIncomeService.getPlannedIncomes(householdId);
    plannedIncomes.forEach((plannedIncome) => {
      const record: UnifiedRecord = normalizeRecord(plannedIncome);
      unifiedRecords.push(record);
    });

    // project transaction
    const projectTransactions = await projectTransactionService.getProjectTransactions(householdId);
    projectTransactions.forEach((projectTransaction) => {
      const record: UnifiedRecord = normalizeRecord(projectTransaction);
      unifiedRecords.push(record);
    });

    return unifiedRecords;
  }

  async createUnifiedRecord(householdId: string, record: UnifiedRecord, userEmail: string) {
    if (record.formType === FormType.expense) {
      const tnx = transactionConverter(record);
      await transactionService.createTransaction(householdId, tnx, userEmail);
    } else if (record.formType === FormType.income) {
      const income = plannedIncomeConverter(record);
      await plannedIncomeService.createPlannedIncome(householdId, income, userEmail);
    } else if (record.formType === FormType.transfer) {
      const pt = projectTransactionConverter(record);
      await projectTransactionService.createProjectTransaction(householdId, pt, userEmail);
    }
  }

  async updateUnifiedRecord(
    householdId: string,
    id: string,
    record: UnifiedRecord,
    userEmail: string,
  ) {
    if (record.recordType === RecordType.transaction) {
      const tnx = transactionConverter(record);
      await transactionService.updateTransaction(householdId, id, tnx, userEmail);
    } else if (record.recordType === RecordType.plannedIncome) {
      const income = plannedIncomeConverter(record);
      await plannedIncomeService.updatePlannedIncome(householdId, id, income, userEmail);
    } else if (record.recordType === RecordType.projectTransaction) {
      const pt = projectTransactionConverter(record);
      await projectTransactionService.updateProjectTransaction(householdId, id, pt, userEmail);
    }
  }

  async deleteUnifiedRecord(householdId: string, record: UnifiedRecord) {
    if (record.recordType === RecordType.transaction) {
      const tnx = transactionConverter(record);
      await transactionService.deleteTransaction(householdId, tnx.id);
    } else if (record.recordType === RecordType.plannedIncome) {
      const income = plannedIncomeConverter(record);
      await plannedIncomeService.deletePlannedIncome(householdId, income.id);
    } else if (record.recordType === RecordType.projectTransaction) {
      const pt = projectTransactionConverter(record);
      await projectTransactionService.deleteProjectTransactions(householdId, [pt.id]);
    }
  }
}

export const unifiedRecordService = new UnifiedRecordService();
