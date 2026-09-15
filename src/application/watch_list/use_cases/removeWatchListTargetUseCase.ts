import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { type WatchListTargetType } from '@/domains/watch_list/schemas';
import { watchListRepository } from '@/infra/repositories/watchListRepository';

export interface RemoveWatchListTargetRequest {
  householdId: string;
  auth: AuthContext;
  targetType: WatchListTargetType;
  targetId: string;
}

export class RemoveWatchListTargetUseCase {
  async execute(request: RemoveWatchListTargetRequest): Promise<void> {
    const { householdId, auth, targetType, targetId } = request;

    await householdPermissionService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);

    await watchListRepository.removeTarget(householdId, targetType, targetId);
  }
}

export const removeWatchListTargetUseCase = new RemoveWatchListTargetUseCase();
