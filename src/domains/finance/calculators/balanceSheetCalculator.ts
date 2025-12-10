import type { AccountSnapshot } from '@/domains/account/types';
import {
  AssetSubCategory,
  BalanceSheetCategory,
  type BalanceSheetData,
  type BalanceSheetItem,
  EquitySubCategory,
  LiabilitySubCategory,
} from '@/domains/finance/types';
import type { ProjectWithSnapshot } from '@/domains/project/types';

export function calculateBalanceSheet(
  accountSnapshots: AccountSnapshot[],
  projectsWithSnapshots: ProjectWithSnapshot[],
): BalanceSheetData {
  // 1. Assets
  const assetItems: BalanceSheetItem[] = [];

  // Cash & Equivalents (Accounts)
  const cashAccounts = accountSnapshots.filter((acc) => !acc.holdings);
  const cashTotal = cashAccounts.reduce((sum, acc) => sum + acc.amount, 0);
  if (cashTotal > 0) {
    assetItems.push({
      category: AssetSubCategory.CASH,
      amount: cashTotal,
      subItems: cashAccounts.map((acc) => ({ name: acc.id, amount: acc.amount })), // Note: Account name might need to be fetched if not in snapshot, but snapshot has ID. Ideally snapshot should have name or we map it. AccountSnapshot doesn't have name, so we use ID for now or need to pass Accounts.
      // Optimization: Pass Accounts to map ID to Name. For now using ID.
    });
  }

  const investmentsAccounts = accountSnapshots.filter((acc) => acc.holdings);
  const investmentsTotal = investmentsAccounts.reduce((sum, acc) => sum + acc.amount, 0);
  if (investmentsTotal > 0) {
    assetItems.push({
      category: AssetSubCategory.INVESTMENTS,
      amount: investmentsTotal,
      subItems: investmentsAccounts.map((acc) => ({ name: acc.id, amount: acc.amount })), // Note: Account name might need to be fetched if not in snapshot, but snapshot has ID. Ideally snapshot should have name or we map it. AccountSnapshot doesn't have name, so we use ID for now or need to pass Accounts.
      // Optimization: Pass Accounts to map ID to Name. For now using ID.
    });
  }

  // Project Assets
  const assetMap = new Map<
    string,
    { amount: number; subItems: { name: string; amount: number }[] }
  >();

  projectsWithSnapshots.forEach((pws) => {
    if (!pws || !pws.snapshot) return;

    if (pws?.accounting?.balanceSheet?.category === BalanceSheetCategory.ASSET) {
      const subcategory = pws.accounting.balanceSheet.subcategory || AssetSubCategory.OTHER_ASSETS;
      const amount = pws.snapshot.closingBalance;

      if (amount !== 0) {
        const current = assetMap.get(subcategory) || { amount: 0, subItems: [] };
        current.amount += amount;
        current.subItems.push({ name: pws.name, amount });
        assetMap.set(subcategory, current);
      }
    }
  });

  assetMap.forEach((data, category) => {
    assetItems.push({
      category,
      amount: data.amount,
      subItems: data.subItems,
    });
  });

  const totalAssets = assetItems.reduce((sum, item) => sum + item.amount, 0);

  // 2. Liabilities
  const liabilityItems: BalanceSheetItem[] = [];
  const liabilityMap = new Map<
    string,
    { amount: number; subItems: { name: string; amount: number }[] }
  >();

  projectsWithSnapshots.forEach((pws) => {
    if (!pws || !pws.snapshot) return;

    if (pws?.accounting?.balanceSheet?.category === BalanceSheetCategory.LIABILITY) {
      const subcategory =
        pws.accounting.balanceSheet.subcategory || LiabilitySubCategory.OTHER_LIABILITIES;
      const amount = pws.snapshot.closingBalance;

      if (amount !== 0) {
        const current = liabilityMap.get(subcategory) || { amount: 0, subItems: [] };
        current.amount += amount;
        current.subItems.push({ name: pws.name, amount });
        liabilityMap.set(subcategory, current);
      }
    }
  });

  liabilityMap.forEach((data, category) => {
    liabilityItems.push({
      category,
      amount: data.amount,
      subItems: data.subItems,
    });
  });

  const totalLiabilities = liabilityItems.reduce((sum, item) => sum + item.amount, 0);

  // 3. Equity
  const equityItems: BalanceSheetItem[] = [];
  const equityMap = new Map<
    string,
    { amount: number; subItems: { name: string; amount: number }[] }
  >();

  projectsWithSnapshots.forEach((pws) => {
    if (!pws || !pws.snapshot) return;

    if (pws?.accounting?.balanceSheet?.category === BalanceSheetCategory.EQUITY) {
      const subcategory = pws.accounting.balanceSheet.subcategory || EquitySubCategory.OTHER_EQUITY;
      const amount = pws.snapshot.closingBalance;

      if (amount !== 0) {
        const current = equityMap.get(subcategory) || { amount: 0, subItems: [] };
        current.amount += amount;
        current.subItems.push({ name: pws.name, amount });
        equityMap.set(subcategory, current);
      }
    }
  });

  equityMap.forEach((data, category) => {
    equityItems.push({
      category,
      amount: data.amount,
      subItems: data.subItems,
    });
  });

  const totalEquity = equityItems.reduce((sum, item) => sum + item.amount, 0);

  return {
    assets: { total: totalAssets, items: assetItems },
    liabilities: { total: totalLiabilities, items: liabilityItems },
    equity: { total: totalEquity, items: equityItems },
  };
}
