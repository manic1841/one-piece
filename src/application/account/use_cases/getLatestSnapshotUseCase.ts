import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { type AccountSnapshot } from '@/domains/account/types/account';
import { accountSnapshotRepository } from '@/infra/repositories/accountSnapshotRepository';

export interface GetLatestSnapshotRequest {
  householdId: string;
  accountId: string;
  auth: AuthContext;
  /** 呼叫端已經為同一份 household 驗過讀取權限（例如批次取多個帳戶）。 */
  skipPermissionCheck?: boolean;
}

/**
 * 只取最新一筆快照時，查詢就該收在 `limit(1)`，不必把整段歷史抓回來再於前端
 * reduce（repository 的 `getLatestSnapshot` 就是為此存在的）。
 */
export class GetLatestSnapshotUseCase {
  async execute(request: GetLatestSnapshotRequest): Promise<AccountSnapshot | null> {
    const { householdId, accountId, auth, skipPermissionCheck = false } = request;

    if (!skipPermissionCheck) {
      await householdPermissionService.assertReadPermission(
        householdId,
        auth.uid,
        auth.isGlobalAdmin,
      );
    }

    return await accountSnapshotRepository.getLatestSnapshot(householdId, accountId);
  }
}

export const getLatestSnapshotUseCase = new GetLatestSnapshotUseCase();
