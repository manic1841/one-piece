import { limit, orderBy } from 'firebase/firestore';

import { withReadPermission } from '@/application/common/readGuard';
import { type AuthContext } from '@/application/types';
import { type Portfolio } from '@/domains/portfolio/types/portfolio';
import { portfolioRepository } from '@/infra/repositories/portfolioRepository';
import { MASTER_LIST_LIMIT } from '@/shared/readLimits';

export interface ListPortfoliosRequest {
  householdId: string;
  auth: AuthContext;
  /** 呼叫端已經為同一份 household 驗過讀取權限。 */
  skipPermissionCheck?: boolean;
}

export class ListPortfoliosUseCase {
  async execute(request: ListPortfoliosRequest): Promise<Portfolio[]> {
    const { householdId, auth, skipPermissionCheck = false } = request;
    return withReadPermission(
      householdId,
      auth,
      () =>
        portfolioRepository.list(
          [householdId],
          [orderBy('order', 'asc'), limit(MASTER_LIST_LIMIT)],
        ),
      { skipPermissionCheck },
    );
  }
}

export const listPortfoliosUseCase = new ListPortfoliosUseCase();
