import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  PortfolioSchema,
  PortfolioSnapshotSchema,
  parseWithSchema,
  type Portfolio,
  type PortfolioSnapshot,
  type PortfolioAccountSnapshot,
} from '../schemas';
import { BaseService } from './baseService';
import { accountService } from './accountService';

class PortfolioService extends BaseService<Portfolio> {
  constructor() {
    super('portfolios', PortfolioSchema);
  }

  // Create a new portfolio
  async createPortfolio(
    householdId: string,
    portfolio: Omit<Portfolio, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<string> {
    return this.create(householdId, portfolio);
  }

  // Get all portfolios for a household
  async getPortfolios(householdId: string): Promise<Portfolio[]> {
    return this.getAll(householdId, [orderBy('createdAt', 'desc')]);
  }

  // Get a single portfolio
  async getPortfolio(householdId: string, id: string): Promise<Portfolio | null> {
    return this.getById(householdId, id);
  }

  // Update a portfolio
  async updatePortfolio(
    householdId: string,
    id: string,
    updates: Partial<Portfolio>,
  ): Promise<void> {
    return this.update(householdId, id, updates);
  }

  // Delete a portfolio
  async deletePortfolio(householdId: string, id: string): Promise<void> {
    return this.delete(householdId, id);
  }

  // Create a portfolio snapshot
  async createSnapshot(
    householdId: string,
    portfolioId: string,
    year: number,
    month: number,
    createdBy: string,
    cashFlow: { deposits: number; withdrawals: number } = { deposits: 0, withdrawals: 0 },
  ): Promise<string> {
    const portfolio = await this.getPortfolio(householdId, portfolioId);
    if (!portfolio) {
      throw new Error('Portfolio not found');
    }

    // 1. Fetch latest snapshots for linked accounts for the specified year/month
    const accountSnapshots: PortfolioAccountSnapshot[] = [];
    let totalValue = 0;

    for (const accountId of portfolio.accountIds) {
      const account = await accountService.getAccount(householdId, accountId);
      if (!account) continue;

      const snapshots = await accountService.getSnapshots(householdId, accountId, year, month);
      // Use the snapshot for this specific month if available, otherwise...
      // Actually, for a portfolio snapshot of Jan 2025, we should strictly look for Jan 2025 account snapshots.
      // If missing, maybe we shouldn't include it or throw error?
      // For now, let's assume if it's missing, value is 0 or we skip.
      // User requirement: "先記錄各 Account 的 Snapshot, 再建立 Portfolio 的 Snapshot"
      // So we expect them to exist.

      if (snapshots.length > 0) {
        const snapshot = snapshots[0]; // getSnapshots returns sorted desc, so first is latest for that month
        const accountSnapshot: PortfolioAccountSnapshot = {
          accountId: account.id,
          accountName: account.name,
          type: account.type,
          value: snapshot.amount,
        };
        
        // Only include holdings if they exist
        if (snapshot.holdings && snapshot.holdings.length > 0) {
          accountSnapshot.holdings = snapshot.holdings;
        }
        
        accountSnapshots.push(accountSnapshot);
        totalValue += snapshot.amount;
      } else {
        // If no snapshot for this month, maybe try to get latest?
        // But that might be misleading for "Performance of Jan 2025".
        // Let's just include the account with 0 value or skip?
        // Better to include with 0 to show it's part of portfolio but missing data.
        accountSnapshots.push({
          accountId: account.id,
          accountName: account.name,
          type: account.type,
          value: 0,
        });
      }
    }

    // 2. Calculate Performance
    // Need previous month's portfolio snapshot
    let prevYear = year;
    let prevMonth = month - 1;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = year - 1;
    }

    const prevSnapshots = await this.getSnapshots(householdId, portfolioId, prevYear, prevMonth);
    const prevSnapshot = prevSnapshots.length > 0 ? prevSnapshots[0] : null;

    const openingValue = prevSnapshot ? prevSnapshot.performance.closingValue : 0;
    const closingValue = totalValue;
    const netCashFlow = cashFlow.deposits - cashFlow.withdrawals;
    
    // Gain = Closing - Opening - NetFlow
    const gain = closingValue - openingValue - netCashFlow;

    // Return Rate
    // User formula: gain / (openingValue + deposits) * 100
    let returnRate = 0;
    const denominator = openingValue + cashFlow.deposits;
    if (denominator > 0) {
      returnRate = (gain / denominator) * 100;
    }

    // Cumulative Gain
    const prevCumulativeGain = prevSnapshot ? prevSnapshot.performance.cumulativeGain : 0;
    const cumulativeGain = prevCumulativeGain + gain;
    
    // Cumulative Return Rate
    // User formula: (cumulativeGain / totalInvested) * 100
    // We need totalInvested.
    // totalInvested = currentTotalValue - cumulativeGain
    // Because: cumulativeGain = totalValue - totalInvested
    const totalInvested = closingValue - cumulativeGain;
    
    let cumulativeReturnRate = 0;
    if (totalInvested > 0) {
      cumulativeReturnRate = (cumulativeGain / totalInvested) * 100;
    }

    const performance = {
      openingValue,
      closingValue,
      netCashFlow,
      gain,
      returnRate,
      cumulativeGain,
      cumulativeReturnRate,
    };

    const snapshotRef = doc(
      collection(db, 'households', householdId, 'portfolios', portfolioId, 'snapshots'),
    );
    const snapshotId = snapshotRef.id;

    const newSnapshot = {
      id: snapshotId,
      year,
      month,
      accounts: accountSnapshots,
      totalValue,
      cashFlow,
      performance,
      createdBy,
      createdAt: serverTimestamp(),
    };
    console.log('newSnapshot', newSnapshot);

    await setDoc(snapshotRef, newSnapshot);
    console.log('snapshotId', snapshotId);
    return snapshotId;
  }

  // Get snapshots for a portfolio
  async getSnapshots(
    householdId: string,
    portfolioId: string,
    year?: number,
    month?: number,
  ): Promise<PortfolioSnapshot[]> {
    const snapshotsRef = collection(
      db,
      'households',
      householdId,
      'portfolios',
      portfolioId,
      'snapshots',
    );
    let q = query(snapshotsRef, orderBy('year', 'desc'), orderBy('month', 'desc'));

    if (year !== undefined) {
      q = query(q, where('year', '==', year));
    }
    if (month !== undefined) {
      q = query(q, where('month', '==', month));
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return parseWithSchema(PortfolioSnapshotSchema, data);
    });
  }
}

export const portfolioService = new PortfolioService();
