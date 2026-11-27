import { type QueryConstraint, limit, orderBy, where } from 'firebase/firestore';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { type AccountSnapshot } from '@/domains/account/types/account';
import { accountSnapshotRepository } from '@/infra/repositories/accountSnapshotRepository';

export interface GetAccountSnapshotsRequest {
  householdId: string;
  accountId: string;
  year?: number;
  month?: number;
  auth: AuthContext;
  /** 呼叫端已經為同一份 household 驗過讀取權限（例如批次取多個帳戶）。 */
  skipPermissionCheck?: boolean;
  /** 目前查詢條件下，只取 createdAt 最新一筆；不代表最新期別。 */
  latestByCreatedAt?: boolean;
}

export class GetAccountSnapshotsUseCase {
  async execute(request: GetAccountSnapshotsRequest): Promise<AccountSnapshot[]> {
    const {
      householdId,
      accountId,
      year,
      month,
      auth,
      skipPermissionCheck = false,
      latestByCreatedAt = false,
    } = request;

    if (!skipPermissionCheck) {
      await householdPermissionService.assertReadPermission(
        householdId,
        auth.uid,
        auth.isGlobalAdmin,
      );
    }

    const q: QueryConstraint[] = [orderBy('createdAt', 'desc')];
    if (year) {
      q.push(where('year', '==', year));
    }
    if (month) {
      q.push(where('month', '==', month));
    }
    if (latestByCreatedAt) {
      q.push(limit(1));
    }

    return await accountSnapshotRepository.list([householdId, accountId], q);
  }
}

export const getAccountSnapshotsUseCase = new GetAccountSnapshotsUseCase();
