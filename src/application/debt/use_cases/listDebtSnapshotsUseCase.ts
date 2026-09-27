import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { type DebtSnapshot } from '@/domains/debt/schemas';
import { debtSnapshotRepository } from '@/infra/repositories/debtSnapshotRepository';

export interface ListDebtSnapshotsRequest {
  householdId: string;
  debtAccountId: string;
  startYearMonth: string;
  endYearMonth: string;
  auth: AuthContext;
}

export class ListDebtSnapshotsUseCase {
  async execute(request: ListDebtSnapshotsRequest): Promise<DebtSnapshot[]> {
    const { householdId, debtAccountId, startYearMonth, endYearMonth, auth } = request;

    await householdPermissionService.assertReadPermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    return await debtSnapshotRepository.listByYearMonthRange(
      householdId,
      debtAccountId,
      startYearMonth,
      endYearMonth,
    );
  }
}

export const listDebtSnapshotsUseCase = new ListDebtSnapshotsUseCase();
