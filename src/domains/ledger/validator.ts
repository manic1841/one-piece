import { type AllocationCreate } from '@/domains/allocation/schemas';
import { type TransactionCreate } from '@/domains/ledger/schemas';

export class LedgerValidator {
  static validateTransaction(transaction: TransactionCreate): string[] {
    const errors: string[] = [];

    if (transaction.entries.length < 2) {
      errors.push('Transaction must have at least two entries.');
    }

    const totalDebit = transaction.entries.reduce((sum, entry) => sum + entry.debit, 0);
    const totalCredit = transaction.entries.reduce((sum, entry) => sum + entry.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.0001) {
      errors.push(
        `Transaction is not balanced. Total Debit: ${totalDebit}, Total Credit: ${totalCredit}`,
      );
    }

    return errors;
  }

  static validateAllocation(allocation: AllocationCreate): string[] {
    const errors: string[] = [];

    const totalPercentage = allocation.items.reduce(
      (sum: number, item: { percentage: number }) => sum + item.percentage,
      0,
    );
    if (Math.abs(totalPercentage - 100) > 0.01) {
      errors.push(`Allocation percentages must sum to 100%. Current sum: ${totalPercentage}%`);
    }

    return errors;
  }
}
