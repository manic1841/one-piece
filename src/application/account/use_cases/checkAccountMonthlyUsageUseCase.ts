import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { AccountCategory } from '@/domains/account/types/categories';
import { LEDGER_CODES } from '@/domains/ledger/constants/ledgerCodes';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

export interface CheckAccountMonthlyUsageRequest {
  householdId: string;
  accountId: string;
  accountCategory: string;
  year: number;
  month: number;
  auth: AuthContext;
}

export interface CheckAccountMonthlyUsageResult {
  hasReferences: boolean;
  referenceCount: number;
  matchedLedgerCodes: string[];
}

const getCategoryLedgerCodes = (accountCategory: string): string[] => {
  switch (accountCategory) {
    case AccountCategory.BANK:
    case AccountCategory.CASH:
      return [LEDGER_CODES.ASSET_CASH];
    case AccountCategory.SECURITIES:
      return [LEDGER_CODES.ASSET_INVESTMENT];
    default:
      return [];
  }
};

export class CheckAccountMonthlyUsageUseCase {
  async execute(request: CheckAccountMonthlyUsageRequest): Promise<CheckAccountMonthlyUsageResult> {
    const { householdId, accountId, accountCategory, year, month, auth } = request;

    await householdPermissionService.assertReadPermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);
    const categoryLedgerCodes = getCategoryLedgerCodes(accountCategory);

    const transactions = await transactionRepository.listByDateRange(
      householdId,
      startDate,
      endDate,
    );

    const matched = transactions.filter((transaction) =>
      transaction.entries.some(
        (entry) =>
          entry.accountId === accountId ||
          (categoryLedgerCodes.length > 0 && categoryLedgerCodes.includes(entry.ledgerCode)),
      ),
    );

    return {
      hasReferences: matched.length > 0,
      referenceCount: matched.length,
      matchedLedgerCodes: categoryLedgerCodes,
    };
  }
}

export const checkAccountMonthlyUsageUseCase = new CheckAccountMonthlyUsageUseCase();
