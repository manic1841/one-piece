import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  PortfolioSchema,
  PortfolioSnapshotSchema,
  parseWithSchema,
  type Portfolio,
  type PortfolioSnapshot,
  type AccountSnapshot,
} from '../schemas';
import { BaseService } from './baseService';
import { accountService } from './accountService';
import { calculatePortfolioSnapshot } from '../domains/finance/calculators/portfolioCalculator';

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
    const accountSnapshots = new Map<string, AccountSnapshot | null>();
    const accounts = [];

    for (const accountId of portfolio.accountIds) {
      const account = await accountService.getAccount(householdId, accountId);
      if (!account) continue;
      
      accounts.push(account);

      const snapshots = await accountService.getSnapshots(householdId, accountId, year, month);
      
      if (snapshots.length > 0) {
        accountSnapshots.set(accountId, snapshots[0]);
      } else {
        accountSnapshots.set(accountId, null);
      }
    }

    // 2. Fetch previous month's portfolio snapshot
    let prevYear = year;
    let prevMonth = month - 1;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = year - 1;
    }

    const prevSnapshots = await this.getSnapshots(householdId, portfolioId, prevYear, prevMonth);
    const prevSnapshot = prevSnapshots.length > 0 ? prevSnapshots[0] : null;

    // 3. Calculate Snapshot
    const snapshotData = calculatePortfolioSnapshot({
      year,
      month,
      portfolioId,
      accounts,
      accountSnapshots,
      prevSnapshot,
      cashFlow,
      createdBy,
    });

    const snapshotRef = doc(
      collection(db, 'households', householdId, 'portfolios', portfolioId, 'snapshots'),
    );
    const snapshotId = snapshotRef.id;

    const newSnapshot = {
      ...snapshotData,
      id: snapshotId,
    };

    await setDoc(snapshotRef, newSnapshot);
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
