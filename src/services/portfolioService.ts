import { QueryConstraint, orderBy, where } from 'firebase/firestore';

import { calculatePortfolioSnapshot } from '@/domains/finance/calculators/portfolioCalculator';
import { type LeverageStats } from '@/domains/finance/types';
import { portfolioRepository } from '@/repositories/portfolioRepository';
import { portfolioSnapshotRepository } from '@/repositories/portfolioSnapshotRepository';
import {
  type AccountSnapshot,
  type Portfolio,
  type PortfolioCreate,
  type PortfolioSnapshot,
} from '@/schemas';

import { accountService } from './accountService';
import { type AuthContext, householdService } from './householdService';

export const portfolioService = {
  // Create a new portfolio
  async createPortfolio(
    householdId: string,
    portfolio: PortfolioCreate,
    userEmail: string,
    auth: AuthContext,
  ): Promise<string> {
    await householdService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);
    return portfolioRepository.create([householdId], portfolio, userEmail);
  },

  // Get all portfolios for a household
  async getPortfolios(householdId: string): Promise<Portfolio[]> {
    return portfolioRepository.list([householdId], [orderBy('order', 'asc')]);
  },

  // Get a single portfolio
  async getPortfolio(householdId: string, id: string): Promise<Portfolio | null> {
    return portfolioRepository.get([householdId, id]);
  },

  // Update a portfolio
  async updatePortfolio(
    householdId: string,
    id: string,
    updates: Partial<Portfolio>,
    userEmail: string,
    auth: AuthContext,
  ): Promise<void> {
    await householdService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);
    return portfolioRepository.update([householdId, id], updates, userEmail);
  },

  // Delete a portfolio
  async deletePortfolio(householdId: string, id: string, auth: AuthContext): Promise<void> {
    await householdService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);
    return portfolioRepository.delete([householdId, id]);
  },

  // Create a portfolio snapshot
  async createSnapshot(
    householdId: string,
    portfolioId: string,
    year: number,
    month: number,
    cashFlow: { deposits: number; withdrawals: number } = { deposits: 0, withdrawals: 0 },
    userEmail: string,
    auth: AuthContext,
  ): Promise<string> {
    await householdService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);
    const portfolio = await portfolioRepository.get([householdId, portfolioId]);
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
    });

    const customId = portfolioSnapshotRepository.buildId(year, month);
    return portfolioSnapshotRepository.create(
      [householdId, portfolioId],
      snapshotData,
      userEmail,
      undefined,
      customId,
    );
  },

  // Get snapshots for a portfolio
  async getSnapshots(
    householdId: string,
    portfolioId: string,
    year?: number,
    month?: number,
  ): Promise<PortfolioSnapshot[]> {
    const queryConstraints: QueryConstraint[] = [];
    if (year) {
      queryConstraints.push(where('year', '==', year));
    }
    if (month) {
      queryConstraints.push(where('month', '==', month));
    }
    queryConstraints.push(orderBy('year', 'desc'), orderBy('month', 'desc'));
    return portfolioSnapshotRepository.list([householdId, portfolioId], queryConstraints);
  },

  // Delete a portfolio snapshot
  async deleteSnapshot(
    householdId: string,
    portfolioId: string,
    snapshotId: string,
    auth: AuthContext,
  ): Promise<void> {
    await householdService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);
    return portfolioSnapshotRepository.delete([householdId, portfolioId, snapshotId]);
  },

  // Get stock gain loss for a specific period (for balance sheet)
  async getStockGainLoss(
    householdId: string,
    year: number,
    month: number,
  ): Promise<{ totalMarketValue: number; totalCost: number; totalGainLoss: number }> {
    const portfolios = await this.getPortfolios(householdId);
    let totalMarketValue = 0;
    let totalGainLoss = 0;

    for (const portfolio of portfolios) {
      const snapshots = await this.getSnapshots(householdId, portfolio.id, year, month);
      if (snapshots.length > 0) {
        const snapshot = snapshots[0];
        totalMarketValue += snapshot.totalValue;
        totalGainLoss += snapshot.performance.cumulativeGain;
      }
    }

    return {
      totalMarketValue,
      totalCost: totalMarketValue - totalGainLoss,
      totalGainLoss,
    };
  },

  // Get current leverage stats across all accounts
  async getLeverageStats(householdId: string): Promise<LeverageStats> {
    const accounts = await accountService.getAccounts(householdId);
    let totalExposure = 0;
    let totalNetValue = 0;

    for (const account of accounts) {
      const latest = await accountService.getLatestSnapshot(householdId, account.id);
      if (!latest) continue;

      totalNetValue += latest.amount;
      const holdings = latest.holdings || [];
      for (const holding of holdings) {
        const leverage = holding.leverage || 1;
        totalExposure += holding.marketValue * leverage;
      }
    }

    const ratio = totalNetValue > 0 ? totalExposure / totalNetValue : 0;
    return {
      totalExposure,
      totalNetValue,
      ratio,
    };
  },

  // Reorder portfolios
  async reorderPortfolios(
    householdId: string,
    portfolioOrders: Array<{ id: string; order: number }>,
    userEmail: string,
    auth: AuthContext,
  ): Promise<void> {
    await householdService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);
    const updatePromises = portfolioOrders.map(({ id, order }) =>
      portfolioRepository.update([householdId, id], { order }, userEmail),
    );
    await Promise.all(updatePromises);
  },
};
