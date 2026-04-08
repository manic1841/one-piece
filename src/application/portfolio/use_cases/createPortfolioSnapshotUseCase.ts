import { getAccountSnapshotsUseCase } from '@/application/account/use_cases/getAccountSnapshotsUseCase';
import { getAccountUseCase } from '@/application/account/use_cases/getAccountUseCase';
import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { type AccountSnapshot } from '@/domains/account/types/account';
import { calculatePortfolioSnapshot } from '@/domains/portfolio/calculators/portfolioCalculator';
import { portfolioRepository } from '@/infra/repositories/portfolioRepository';
import { portfolioSnapshotRepository } from '@/infra/repositories/portfolioSnapshotRepository';

export interface CreatePortfolioSnapshotRequest {
  householdId: string;
  portfolioId: string;
  year: number;
  month: number;
  cashFlow?: { deposits: number; withdrawals: number };
  userEmail: string;
  auth: AuthContext;
}

export class CreatePortfolioSnapshotUseCase {
  async execute(request: CreatePortfolioSnapshotRequest): Promise<string> {
    const {
      householdId,
      portfolioId,
      year,
      month,
      cashFlow = { deposits: 0, withdrawals: 0 },
      userEmail,
      auth,
    } = request;
    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const portfolio = await portfolioRepository.get([householdId, portfolioId]);
    if (!portfolio) {
      throw new Error('Portfolio not found');
    }

    // 1. Fetch latest snapshots for linked accounts for the specified year/month
    const accountSnapshots = new Map<string, AccountSnapshot | null>();
    const accounts = [];

    for (const accountId of portfolio.accountIds) {
      const account = await getAccountUseCase.execute({ householdId, accountId, auth });
      if (!account) continue;

      accounts.push(account);

      const snapshots = await getAccountSnapshotsUseCase.execute({
        householdId,
        accountId,
        auth,
        year,
        month,
      });

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

    const prevSnapshotId = portfolioSnapshotRepository.buildId(prevYear, prevMonth);
    const prevSnapshot = await portfolioSnapshotRepository.get([
      householdId,
      portfolioId,
      prevSnapshotId,
    ]);

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
  }
}

export const createPortfolioSnapshotUseCase = new CreatePortfolioSnapshotUseCase();
