import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { type WatchListTargetCreate } from '@/domains/watch_list/schemas';
import { watchListRepository } from '@/infra/repositories/watchListRepository';

export interface AddWatchListTargetRequest {
  householdId: string;
  auth: AuthContext;
  userEmail: string;
  target: WatchListTargetCreate;
}

export class AddWatchListTargetUseCase {
  async execute(request: AddWatchListTargetRequest): Promise<void> {
    const { householdId, auth, userEmail, target } = request;

    await householdPermissionService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);

    await watchListRepository.addTarget(householdId, target, userEmail);
  }
}

export const addWatchListTargetUseCase = new AddWatchListTargetUseCase();
