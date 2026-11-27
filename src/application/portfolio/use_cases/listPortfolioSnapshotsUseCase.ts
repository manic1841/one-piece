import { QueryConstraint, limit, orderBy, where } from 'firebase/firestore';

import { withReadPermission } from '@/application/common/readGuard';
import { type AuthContext } from '@/application/types';
import { type PortfolioSnapshot } from '@/domains/portfolio/types/portfolio';
import { portfolioSnapshotRepository } from '@/infra/repositories/portfolioSnapshotRepository';
import { SNAPSHOT_HISTORY_LIMIT } from '@/shared/readLimits';

export interface ListPortfolioSnapshotsRequest {
  householdId: string;
  portfolioId: string;
  year?: number;
  month?: number;
  auth: AuthContext;
  /** 呼叫端已經為同一份 household 驗過讀取權限。 */
  skipPermissionCheck?: boolean;
  /** 只要最新一筆（清單頁的摘要），不拉整段歷史。 */
  latestOnly?: boolean;
}

export class ListPortfolioSnapshotsUseCase {
  async execute(request: ListPortfolioSnapshotsRequest): Promise<PortfolioSnapshot[]> {
    const {
      householdId,
      portfolioId,
      year,
      month,
      auth,
      skipPermissionCheck = false,
      latestOnly = false,
    } = request;
    const queryConstraints: QueryConstraint[] = [];
    if (year) {
      queryConstraints.push(where('year', '==', year));
    }
    if (month) {
      queryConstraints.push(where('month', '==', month));
    }
    queryConstraints.push(
      orderBy('year', 'desc'),
      orderBy('month', 'desc'),
      limit(latestOnly ? 1 : SNAPSHOT_HISTORY_LIMIT),
    );
    return withReadPermission(
      householdId,
      auth,
      () => portfolioSnapshotRepository.list([householdId, portfolioId], queryConstraints),
      { skipPermissionCheck },
    );
  }
}

export const listPortfolioSnapshotsUseCase = new ListPortfolioSnapshotsUseCase();
