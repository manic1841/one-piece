import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { calculateProjectBalance } from '@/domains/project/calculators/projectBalanceCalculator';
import { allocationRepository } from '@/infra/repositories/allocationRepository';
import { projectRepository } from '@/infra/repositories/projectRepository';
import { projectSnapshotRepository } from '@/infra/repositories/projectSnapshotRepository';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

export interface GetProjectBalanceRequest {
  householdId: string;
  projectId: string;
  auth: AuthContext;
}

export interface ProjectBalanceResponse {
  balance: number;
  year: number;
  month: number;
}

export class GetProjectBalanceUseCase {
  async execute(request: GetProjectBalanceRequest): Promise<ProjectBalanceResponse | null> {
    const { householdId, projectId, auth } = request;

    await householdPermissionService.assertReadPermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const project = await projectRepository.get([householdId, projectId]);
    if (!project) return null;

    const latestSnapshot = await projectSnapshotRepository.getLatest(householdId, projectId);

    // If there's no snapshot, start from 0 balance
    const baseBalance = latestSnapshot?.closingBalance ?? 0;
    const snapshotDate = latestSnapshot
      ? new Date(latestSnapshot.year, latestSnapshot.month, 0, 23, 59, 59)
      : new Date(0);
    const currentDate = new Date();

    const transactionsSinceSnapshot = await transactionRepository.listByProject(
      householdId,
      projectId,
      snapshotDate,
    );

    const transferSinceSnapshot = await transactionRepository.listTransfersByProject(
      householdId,
      projectId,
      undefined,
      snapshotDate,
    );

    // The snapshot closing balance already includes the snapshot month's
    // allocations, so exclude that month (use next month as the lower bound).
    const sinceYearMonth = latestSnapshot
      ? (() => {
          const d = new Date(latestSnapshot.year, latestSnapshot.month, 1);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        })()
      : undefined;
    const allocations = await allocationRepository.listByProject(
      householdId,
      projectId,
      undefined,
      sinceYearMonth,
    );

    const balance = calculateProjectBalance({
      projectId,
      baseBalance,
      transactions: transactionsSinceSnapshot,
      transfers: transferSinceSnapshot,
      allocations,
    });

    return {
      balance,
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
    };
  }
}

export const getProjectBalanceUseCase = new GetProjectBalanceUseCase();
