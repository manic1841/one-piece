import { orderBy, where, type QueryConstraint } from 'firebase/firestore';
import { type Portfolio, type PortfolioSnapshot, type AccountSnapshot } from '../schemas';
import { accountService } from './accountService';
import { calculatePortfolioSnapshot } from '../domains/finance/calculators/portfolioCalculator';
import { portfolioRepository } from '../repositories/portfolioRepository';

export const portfolioService = {
  // Create a new portfolio
  async createPortfolio(
    householdId: string,
    portfolio: Omit<Portfolio, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<string> {
    return portfolioRepository.create(householdId, portfolio);
  },

  // Get all portfolios for a household
  async getPortfolios(householdId: string): Promise<Portfolio[]> {
    return portfolioRepository.getAll(householdId, [orderBy('createdAt', 'desc')]);
  },

  // Get a single portfolio
  async getPortfolio(householdId: string, id: string): Promise<Portfolio | null> {
    return portfolioRepository.getById(householdId, id);
  },

  // Update a portfolio
  async updatePortfolio(
    householdId: string,
    id: string,
    updates: Partial<Portfolio>,
  ): Promise<void> {
    return portfolioRepository.update(householdId, id, updates);
  },

  // Delete a portfolio
  async deletePortfolio(householdId: string, id: string): Promise<void> {
    return portfolioRepository.delete(householdId, id);
  },

  // Create a portfolio snapshot
  async createSnapshot(
    householdId: string,
    portfolioId: string,
    year: number,
    month: number,
    createdBy: string,
    cashFlow: { deposits: number; withdrawals: number } = { deposits: 0, withdrawals: 0 },
  ): Promise<string> {
    const portfolio = await portfolioRepository.getById(householdId, portfolioId);
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

    return portfolioRepository.createSnapshot(householdId, portfolioId, snapshotData);
  },

  // Get snapshots for a portfolio
  async getSnapshots(
    householdId: string,
    portfolioId: string,
    year?: number,
    month?: number,
  ): Promise<PortfolioSnapshot[]> {
    const constraints: QueryConstraint[] = [orderBy('year', 'desc'), orderBy('month', 'desc')];

    if (year !== undefined) {
      constraints.push(where('year', '==', year));
    }
    if (month !== undefined) {
      constraints.push(where('month', '==', month));
    }

    return portfolioRepository.getSnapshots(householdId, portfolioId, constraints);
  },
};
