import { householdPermissionService } from '@/application/household/householdPermissionService';
import {
  type ProjectBalanceResponse,
  loadProjectBalance,
} from '@/application/project/projectBalanceLoader';
import { type AuthContext } from '@/application/types';

/** Row count per fan-out batch; bounds the in-flight reads on a long list. */
const BALANCE_BATCH_SIZE = 10;

export interface ListProjectBalancesRequest {
  householdId: string;
  /** Projects the caller already holds; unknown ids are skipped. */
  projectIds: readonly string[];
  auth: AuthContext;
}

export class ListProjectBalancesUseCase {
  /**
   * Balances for a whole list page. One permission check covers every project,
   * so the page does not repeat it per row.
   */
  async execute({
    householdId,
    projectIds,
    auth,
  }: ListProjectBalancesRequest): Promise<Map<string, ProjectBalanceResponse>> {
    if (projectIds.length === 0) return new Map();

    await householdPermissionService.assertReadPermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const entries: (readonly [string, ProjectBalanceResponse] | null)[] = [];
    for (let start = 0; start < projectIds.length; start += BALANCE_BATCH_SIZE) {
      const batch = projectIds.slice(start, start + BALANCE_BATCH_SIZE);
      entries.push(
        ...(await Promise.all(
          batch.map(async (projectId) => {
            try {
              return [projectId, await loadProjectBalance(householdId, projectId)] as const;
            } catch {
              // A failed row keeps no entry and renders a dash; the rest stand.
              return null;
            }
          }),
        )),
      );
    }

    return new Map(
      entries.filter((entry): entry is readonly [string, ProjectBalanceResponse] => entry !== null),
    );
  }
}

export const listProjectBalancesUseCase = new ListProjectBalancesUseCase();
