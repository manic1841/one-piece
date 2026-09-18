import { type Account } from '@/domains/account/types/account';
import { AccountCategory } from '@/domains/account/types/categories';

export interface PortfolioLinks {
  securitiesAccountId: string;
  bankAccountId: string;
}

export interface PortfolioConstraintContext {
  accounts: Account[];
  existingLinks: PortfolioLinks[];
}

// Spec 11 constraints: exactly one securities account + one bank account,
// both must exist, and each source account belongs to at most one portfolio.
// Bank link accepts bank or cash category: both are cash-holding observed-balance
// accounts (ADR-0008; report layer treats both as cash-equivalent).
export function validatePortfolioConstraints(
  portfolio: PortfolioLinks,
  context: PortfolioConstraintContext,
): void {
  const { accounts, existingLinks } = context;

  if (portfolio.securitiesAccountId === portfolio.bankAccountId) {
    throw new Error('證券帳戶與銀行帳戶不可為同一帳戶');
  }

  const securities = accounts.find((account) => account.id === portfolio.securitiesAccountId);
  if (!securities) {
    throw new Error('證券帳戶不存在');
  }
  if (securities.category !== AccountCategory.SECURITIES) {
    throw new Error('所選證券帳戶類別必須為證券帳戶');
  }

  const bank = accounts.find((account) => account.id === portfolio.bankAccountId);
  if (!bank) {
    throw new Error('銀行帳戶不存在');
  }
  if (bank.category !== AccountCategory.BANK && bank.category !== AccountCategory.CASH) {
    throw new Error('所選銀行帳戶類別必須為銀行或現金帳戶');
  }

  const holder = existingLinks.find(
    (existing) =>
      existing.securitiesAccountId === portfolio.securitiesAccountId ||
      existing.securitiesAccountId === portfolio.bankAccountId ||
      existing.bankAccountId === portfolio.securitiesAccountId ||
      existing.bankAccountId === portfolio.bankAccountId,
  );
  if (holder) {
    throw new Error('每個來源帳戶只能屬於一個投資組合');
  }
}
