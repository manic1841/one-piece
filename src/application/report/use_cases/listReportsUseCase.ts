import { limit, orderBy } from 'firebase/firestore';

import { withReadPermission } from '@/application/common/readGuard';
import { type AuthContext } from '@/application/types';
import { type FinancialReport } from '@/domains/report/types';
import { reportRepository } from '@/infra/repositories/reportRepository';
import { REPORT_LIST_LIMIT } from '@/shared/readLimits';

interface ListReportsRequest {
  householdId: string;
  auth: AuthContext;
  /** 呼叫端已經為同一份 household 驗過讀取權限。 */
  skipPermissionCheck?: boolean;
}

class ListReportsUseCase {
  async execute(request: ListReportsRequest): Promise<FinancialReport[]> {
    const { householdId, auth, skipPermissionCheck = false } = request;

    // Newest first so the cap drops the oldest months, not the anchor the
    // projection and dashboard look for.
    return withReadPermission(
      householdId,
      auth,
      () =>
        reportRepository.list(
          [householdId],
          [orderBy('yearMonth', 'desc'), limit(REPORT_LIST_LIMIT)],
        ),
      { skipPermissionCheck },
    );
  }
}

export const listReportsUseCase = new ListReportsUseCase();
