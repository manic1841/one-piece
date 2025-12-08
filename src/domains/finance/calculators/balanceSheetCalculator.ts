import { Timestamp } from 'firebase/firestore';

import type { Account, AccountSnapshot, Project, ProjectSnapshot } from '../../../schemas';
import type {
  AssetSection,
  BalanceSheet,
  BalanceSheetCategory,
  BalanceSheetItem,
  LiabilitySection,
} from '../../../schemas/balanceSheet';

/**
 * Calculate balance sheet from accounts and projects
 */
export function calculateBalanceSheet(
  accounts: Account[],
  accountSnapshots: Map<string, AccountSnapshot | null>,
  projects: Project[],
  projectSnapshots: Map<string, ProjectSnapshot | null>,
  asOfDate: Date,
  createdBy: string,
  householdId: string,
): BalanceSheet {
  const year = asOfDate.getFullYear();
  const month = asOfDate.getMonth() + 1;

  // Calculate assets
  const assets = calculateAssets(accounts, accountSnapshots, projects, projectSnapshots);

  // Calculate liabilities
  const liabilities = calculateLiabilities(accounts, accountSnapshots, projects, projectSnapshots);

  // Calculate net worth
  const netWorth = assets.total - liabilities.total;

  return {
    id: `balance-sheet-${householdId}-${year}-${month}`,
    asOfDate,
    year,
    month,
    assets,
    liabilities,
    netWorth,
    createdAt: Timestamp.now(),
    createdBy,
  };
}

/**
 * Calculate assets section
 */
function calculateAssets(
  accounts: Account[],
  accountSnapshots: Map<string, AccountSnapshot | null>,
  projects: Project[],
  projectSnapshots: Map<string, ProjectSnapshot | null>,
): AssetSection {
  const currentAssets: BalanceSheetItem[] = [];
  const investmentAssets: BalanceSheetItem[] = [];
  const fixedAssets: BalanceSheetItem[] = [];

  // Add bank and cash accounts to current assets
  for (const account of accounts) {
    const snapshot = accountSnapshots.get(account.id);
    if (!snapshot) continue;

    if (account.type === 'bank' || account.type === 'cash') {
      currentAssets.push({
        id: account.id,
        name: account.name,
        amount: snapshot.amount,
        order: 1,
        sourceType: 'account',
        sourceId: account.id,
      });
    } else if (account.type === 'investment') {
      investmentAssets.push({
        id: account.id,
        name: account.name,
        amount: snapshot.amount,
        order: 1,
        sourceType: 'account',
        sourceId: account.id,
      });
    }
  }

  // Add positive project balances to current assets
  let projectAssetTotal = 0;
  for (const project of projects) {
    const snapshot = projectSnapshots.get(project.id);
    if (!snapshot || snapshot.closingBalance <= 0) continue;

    projectAssetTotal += snapshot.closingBalance;
  }

  if (projectAssetTotal > 0) {
    currentAssets.push({
      id: 'project-assets',
      name: '專案帳戶餘額',
      amount: projectAssetTotal,
      order: 2,
      sourceType: 'project',
    });
  }

  // Group into categories
  const currentCategory: BalanceSheetCategory = {
    category: '流動資產',
    items: currentAssets,
    subtotal: currentAssets.reduce((sum, item) => sum + item.amount, 0),
    order: 1,
  };

  const investmentCategory: BalanceSheetCategory = {
    category: '投資資產',
    items: investmentAssets,
    subtotal: investmentAssets.reduce((sum, item) => sum + item.amount, 0),
    order: 2,
  };

  const fixedCategory: BalanceSheetCategory = {
    category: '固定資產',
    items: fixedAssets,
    subtotal: fixedAssets.reduce((sum, item) => sum + item.amount, 0),
    order: 3,
  };

  const total = currentCategory.subtotal + investmentCategory.subtotal + fixedCategory.subtotal;

  return {
    current: currentCategory.items.length > 0 ? [currentCategory] : [],
    investment: investmentCategory.items.length > 0 ? [investmentCategory] : [],
    fixed: fixedCategory.items.length > 0 ? [fixedCategory] : [],
    total,
  };
}

/**
 * Calculate liabilities section
 */
function calculateLiabilities(
  accounts: Account[],
  accountSnapshots: Map<string, AccountSnapshot | null>,
  projects: Project[],
  projectSnapshots: Map<string, ProjectSnapshot | null>,
): LiabilitySection {
  const shortTermLiabilities: BalanceSheetItem[] = [];
  const longTermLiabilities: BalanceSheetItem[] = [];

  // Add credit card and loan accounts to liabilities
  for (const account of accounts) {
    const snapshot = accountSnapshots.get(account.id);
    if (!snapshot) continue;

    // Negative balances are liabilities
    if (snapshot.amount < 0) {
      const amount = Math.abs(snapshot.amount);

      if (account.name.includes('信用卡')) {
        shortTermLiabilities.push({
          id: account.id,
          name: account.name,
          amount,
          order: 1,
          sourceType: 'account',
          sourceId: account.id,
        });
      } else {
        longTermLiabilities.push({
          id: account.id,
          name: account.name,
          amount,
          order: 1,
          sourceType: 'account',
          sourceId: account.id,
        });
      }
    }
  }

  // Add negative project balances to liabilities
  let projectLiabilityTotal = 0;
  for (const project of projects) {
    const snapshot = projectSnapshots.get(project.id);
    if (!snapshot || snapshot.closingBalance >= 0) continue;

    projectLiabilityTotal += Math.abs(snapshot.closingBalance);
  }

  if (projectLiabilityTotal > 0) {
    shortTermLiabilities.push({
      id: 'project-liabilities',
      name: '專案欠款',
      amount: projectLiabilityTotal,
      order: 2,
      sourceType: 'project',
    });
  }

  // Group into categories
  const shortTermCategory: BalanceSheetCategory = {
    category: '短期負債',
    items: shortTermLiabilities,
    subtotal: shortTermLiabilities.reduce((sum, item) => sum + item.amount, 0),
    order: 1,
  };

  const longTermCategory: BalanceSheetCategory = {
    category: '長期負債',
    items: longTermLiabilities,
    subtotal: longTermLiabilities.reduce((sum, item) => sum + item.amount, 0),
    order: 2,
  };

  const total = shortTermCategory.subtotal + longTermCategory.subtotal;

  return {
    shortTerm: shortTermCategory.items.length > 0 ? [shortTermCategory] : [],
    longTerm: longTermCategory.items.length > 0 ? [longTermCategory] : [],
    total,
  };
}
