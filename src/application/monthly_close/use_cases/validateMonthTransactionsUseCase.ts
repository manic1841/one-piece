import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { type Transaction } from '@/domains/ledger/schemas';
import {
  type TransactionValidationIssue,
  type TransactionValidationResult,
} from '@/domains/transaction_validation/validator';
import { validateMonthTransactions } from '@/domains/transaction_validation/validator';
import { allocationRepository } from '@/infra/repositories/allocationRepository';
import { projectRepository } from '@/infra/repositories/projectRepository';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

export interface ValidateMonthTransactionsRequest {
  householdId: string;
  year: number;
  month: number;
  auth: AuthContext;
}

export interface ValidateMonthTransactionsUseCaseResult extends TransactionValidationResult {
  yearMonth: string;
}

/**
 * Close-time batch validation for one month's transactions (spec 05 stage 02):
 * intent mapping exists, amount is valid, allocation totals 100% when present,
 * project link is valid when present, ledger codes are valid. Produces
 * evidence only; it never creates or modifies data.
 */
export class ValidateMonthTransactionsUseCase {
  async execute(
    request: ValidateMonthTransactionsRequest,
  ): Promise<ValidateMonthTransactionsUseCaseResult> {
    const { householdId, year, month, auth } = request;
    await householdPermissionService.assertReadPermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 1);

    const [transactions, allocations, projects] = await Promise.all([
      transactionRepository.listByDateRange(householdId, monthStart, monthEnd),
      allocationRepository.list([householdId]),
      projectRepository.getProjects(householdId),
    ]);

    const allocationById = new Map(allocations.map((allocation) => [allocation.id, allocation]));
    const projectIds = new Set(projects.map((project) => project.id));

    const result = validateMonthTransactions(transactions);
    const issues = [
      ...result.issues,
      ...this.allocationIssues(transactions, allocationById),
      ...this.projectLinkIssues(transactions, projectIds),
    ];

    return { yearMonth, checkedCount: result.checkedCount, issues };
  }

  /** Allocation totals 100% when present (transaction.allocationId on the month's allocations). */
  private allocationIssues(
    transactions: Transaction[],
    allocationById: Map<string, { items: { percentage: number }[] }>,
  ): TransactionValidationIssue[] {
    const issues: TransactionValidationIssue[] = [];

    for (const transaction of transactions) {
      const allocationId = transaction.allocationId;
      if (!allocationId) continue;

      const allocation = allocationById.get(allocationId);
      if (!allocation) {
        issues.push({
          transactionId: transaction.id,
          description: this.describe(transaction),
          reason: '分配不存在',
        });
        continue;
      }

      const totalPercentage = allocation.items.reduce(
        (sum: number, item: { percentage: number }) => sum + item.percentage,
        0,
      );
      if (Math.abs(totalPercentage - 100) > 0.01) {
        issues.push({
          transactionId: transaction.id,
          description: this.describe(transaction),
          reason: '分配總和不等於 100%',
        });
      }
    }

    return issues;
  }

  /** Project link is valid when present. */
  private projectLinkIssues(
    transactions: Transaction[],
    projectIds: Set<string>,
  ): TransactionValidationIssue[] {
    const issues: TransactionValidationIssue[] = [];

    for (const transaction of transactions) {
      const projectId = transaction.projectId;
      if (!projectId) continue;

      if (!projectIds.has(projectId)) {
        issues.push({
          transactionId: transaction.id,
          description: this.describe(transaction),
          reason: '專案連結無效',
        });
      }
    }

    return issues;
  }

  private describe(transaction: Transaction): string {
    return transaction.description ?? transaction.intent ?? transaction.intentType ?? '';
  }
}

export const validateMonthTransactionsUseCase = new ValidateMonthTransactionsUseCase();
