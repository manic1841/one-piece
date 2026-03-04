import type { AccountWithSnapshot } from '@/domains/account/types';
import { AccountCategory } from '@/domains/account/types';
import { BalanceSheetSourceType } from '@/domains/finance/financeType';
import {
  AssetSubCategory,
  BalanceSheetCategory,
  type BalanceSheetData,
  type BalanceSheetItem,
  EquitySubCategory,
  LiabilitySubCategory,
} from '@/domains/finance/types';
import type { ProjectWithSnapshot } from '@/domains/project/types';
import { logger } from '@/utils/logger';

export function calculateBalanceSheet(
  accountWithSnapshots: AccountWithSnapshot[],
  projectsWithSnapshots: ProjectWithSnapshot[],
  stockGainLoss?: number,
  netIncome?: number,
): BalanceSheetData {
  // 1. Assets
  const assetItems: BalanceSheetItem[] = [];

  // Cash & Equivalents (Accounts)
  const cashAccounts = accountWithSnapshots.filter(
    (acc) => acc.category === AccountCategory.BANK || acc.category === AccountCategory.CASH,
  );
  const cashTotal = cashAccounts.reduce((sum, acc) => sum + (acc.snapshot?.amount || 0), 0);
  if (cashTotal !== 0) {
    logger.debug(`cashTotal: ${cashTotal}`, 'calculateBalanceSheet');
    assetItems.push({
      category: AssetSubCategory.CASH,
      amount: cashTotal,
      subItems: cashAccounts.map((acc) => ({ name: acc.name, amount: acc.snapshot?.amount || 0 })),
    });
  }

  const investmentsAccounts = accountWithSnapshots.filter(
    (acc) => acc.category === AccountCategory.INVESTMENT,
  );
  const investmentsTotal = investmentsAccounts.reduce(
    (sum, acc) => sum + (acc.snapshot?.amount || 0),
    0,
  );
  if (investmentsTotal !== 0) {
    logger.debug(`investmentsTotal: ${investmentsTotal}`, 'calculateBalanceSheet');
    assetItems.push({
      category: AssetSubCategory.INVESTMENTS,
      amount: investmentsTotal,
      subItems: investmentsAccounts.map((acc) => ({
        name: acc.name,
        amount: acc.snapshot?.amount || 0,
      })),
    });
  }

  const otherAccounts = accountWithSnapshots.filter(
    (acc) => acc.category === AccountCategory.OTHER,
  );
  const otherTotal = otherAccounts.reduce((sum, acc) => sum + (acc.snapshot?.amount || 0), 0);
  if (otherTotal !== 0) {
    logger.debug(`otherTotal: ${otherTotal}`, 'calculateBalanceSheet');
    assetItems.push({
      category: AssetSubCategory.OTHER_ASSETS,
      amount: otherTotal,
      subItems: otherAccounts.map((acc) => ({
        name: acc.name,
        amount: acc.snapshot?.amount || 0,
      })),
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
    logger.debug(`assetMap category: ${category}, amount: ${data.amount}`, 'calculateBalanceSheet');
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
    logger.debug(
      `liabilityMap category: ${category}, amount: ${data.amount}`,
      'calculateBalanceSheet',
    );
    liabilityItems.push({
      category,
      amount: Math.abs(data.amount),
      subItems: data.subItems.map((si) => ({ ...si, amount: Math.abs(si.amount) })),
    });
  });

  const totalLiabilities = liabilityItems.reduce((sum, item) => sum + item.amount, 0);

  // 3. Equity
  const equityItems: BalanceSheetItem[] = [];
  const equityMap = new Map<
    string,
    {
      amount: number;
      subItems: {
        name: string;
        amount: number;
        sourceType?: BalanceSheetSourceType;
      }[];
    }
  >();

  projectsWithSnapshots.forEach((pws) => {
    if (!pws || !pws.snapshot) return;

    if (pws?.accounting?.balanceSheet?.category === BalanceSheetCategory.EQUITY) {
      const subcategory = pws.accounting.balanceSheet.subcategory || EquitySubCategory.OTHER_EQUITY;
      const amount = pws.snapshot.closingBalance;

      if (amount !== 0) {
        const current = equityMap.get(subcategory) || { amount: 0, subItems: [] };
        current.amount += amount;
        current.subItems.push({
          name: pws.name,
          amount,
          sourceType: BalanceSheetSourceType.PROJECT,
        });
        equityMap.set(subcategory, current);
      }
    }
  });

  // Add Net Income to Retained Earnings
  if (netIncome && netIncome !== 0) {
    const subcategory = EquitySubCategory.RETAINED_EARNINGS;
    const current = equityMap.get(subcategory) || { amount: 0, subItems: [] };
    current.amount += netIncome;
    current.subItems.push({
      name: '本期淨利',
      amount: netIncome,
      sourceType: BalanceSheetSourceType.SYSTEM,
    });
    equityMap.set(subcategory, current);
  }

  equityMap.forEach((data, category) => {
    logger.debug(
      `equityMap category: ${category}, amount: ${data.amount}`,
      'calculateBalanceSheet',
    );
    equityItems.push({
      category,
      amount: data.amount,
      subItems: data.subItems,
    });
  });

  // Add Stock Gain/Loss if provided
  if (stockGainLoss && stockGainLoss !== 0) {
    equityItems.push({
      category: EquitySubCategory.STOCK_PROFIT,
      amount: stockGainLoss,
      subItems: [
        {
          name: '股市累計盈虧',
          amount: stockGainLoss,
          sourceType: BalanceSheetSourceType.SYSTEM,
        },
      ],
    });
  }

  const explicitEquityTotal = equityItems.reduce((sum, item) => sum + item.amount, 0);
  const totalEquity = totalAssets - totalLiabilities;
  const imbalance = totalEquity - explicitEquityTotal;

  if (Math.abs(imbalance) > 0.01) {
    equityItems.push({
      category: EquitySubCategory.RECONCILIATION,
      amount: imbalance,
      subItems: [
        { name: '自動平帳調整', amount: imbalance, sourceType: BalanceSheetSourceType.SYSTEM },
      ],
    });
  }

  return {
    assets: { total: totalAssets, items: assetItems },
    liabilities: { total: totalLiabilities, items: liabilityItems },
    equity: { total: totalEquity, items: equityItems },
  };
}
