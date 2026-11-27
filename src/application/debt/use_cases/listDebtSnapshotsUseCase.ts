import { withReadPermission } from '@/application/common/readGuard';
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

    return withReadPermission(householdId, auth, () =>
      debtSnapshotRepository.listByYearMonthRange(
        householdId,
        debtAccountId,
        startYearMonth,
        endYearMonth,
      ),
    );
  }
}

export const listDebtSnapshotsUseCase = new ListDebtSnapshotsUseCase();
