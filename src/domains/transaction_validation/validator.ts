import { LEDGER_CODES } from '@/domains/ledger/constants/ledgerCodes';
import { getIntentMapping } from '@/domains/ledger/intentMapping';
import { type Transaction } from '@/domains/ledger/schemas';

export interface TransactionValidationIssue {
  transactionId: string;
  description: string;
  reason: string;
}

export interface TransactionValidationResult {
  checkedCount: number;
  issues: TransactionValidationIssue[];
}

const KNOWN_LEDGER_CODES: ReadonlySet<string> = new Set(Object.values(LEDGER_CODES));

const validateTransaction = (transaction: Transaction): string | null => {
  if (transaction.entries.length < 2) {
    return '分錄少於兩行';
  }

  const totalDebit = transaction.entries.reduce((sum, entry) => sum + entry.debit, 0);
  const totalCredit = transaction.entries.reduce((sum, entry) => sum + entry.credit, 0);
  if (Math.abs(totalDebit - totalCredit) > 0.0001) {
    return '借貸不平衡';
  }

  if (transaction.intent && !getIntentMapping(transaction.intent)) {
    return '意圖映射不存在';
  }

  if (
    transaction.amount === undefined ||
    !Number.isFinite(transaction.amount) ||
    transaction.amount < 0
  ) {
    return '金額無效';
  }

  for (const entry of transaction.entries) {
    if (!KNOWN_LEDGER_CODES.has(entry.ledgerCode)) {
      return `科目無效：${entry.ledgerCode}`;
    }
  }

  return null;
};

/**
 * Close-time batch validation for one month's transactions (spec 05 stage 02).
 * Produces evidence only; it never creates or modifies data. Write-time
 * validation at the ledger boundary remains complementary.
 */
export const validateMonthTransactions = (
  transactions: Transaction[],
): TransactionValidationResult => {
  const issues: TransactionValidationIssue[] = [];

  for (const transaction of transactions) {
    const reason = validateTransaction(transaction);
    if (reason) {
      issues.push({
        transactionId: transaction.id,
        description: transaction.description ?? transaction.intent ?? transaction.intentType ?? '',
        reason,
      });
    }
  }

  return { checkedCount: transactions.length, issues };
};
