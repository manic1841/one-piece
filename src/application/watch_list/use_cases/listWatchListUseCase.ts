import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { type WatchListTarget } from '@/domains/watch_list/schemas';
import { watchListRepository } from '@/infra/repositories/watchListRepository';

export interface ListWatchListRequest {
  householdId: string;
  auth: AuthContext;
}

export class ListWatchListUseCase {
  async execute(request: ListWatchListRequest): Promise<WatchListTarget[]> {
    const { householdId, auth } = request;

    await householdPermissionService.assertReadPermission(householdId, auth.uid, auth.isGlobalAdmin);

    return watchListRepository.listTargets(householdId);
  }
}

export const listWatchListUseCase = new ListWatchListUseCase();
