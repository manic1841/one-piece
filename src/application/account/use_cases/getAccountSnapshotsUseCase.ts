import { orderBy, where, type QueryConstraint } from 'firebase/firestore';
import { accountSnapshotRepository } from '@/infra/repositories/accountSnapshotRepository';
import { type AccountSnapshot } from '@/domains/account/types/account';
import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';

export interface GetAccountSnapshotsRequest {
  householdId: string;
  accountId: string;
  year?: number;
  month?: number;
  auth: AuthContext;
}

export class GetAccountSnapshotsUseCase {
  async execute(request: GetAccountSnapshotsRequest): Promise<AccountSnapshot[]> {
    const { householdId, accountId, year, month, auth } = request;

    await householdPermissionService.assertReadPermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const q: QueryConstraint[] = [orderBy('createdAt', 'desc')];
    if (year) {
      q.push(where('year', '==', year));
    }
    if (month) {
      q.push(where('month', '==', month));
    }

    return await accountSnapshotRepository.list([householdId, accountId], q);
  }
}

export const getAccountSnapshotsUseCase = new GetAccountSnapshotsUseCase();
