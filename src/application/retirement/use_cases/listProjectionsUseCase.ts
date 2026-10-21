import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import {
  type ProjectionDocument,
  projectionRepository,
} from '@/infra/repositories/projectionRepository';

export type { ProjectionDocument } from '@/infra/repositories/projectionRepository';

interface ListProjectionsRequest {
  householdId: string;
  auth: AuthContext;
}

export class ListProjectionsUseCase {
  async execute(request: ListProjectionsRequest): Promise<ProjectionDocument[]> {
    const { householdId, auth } = request;

    await householdPermissionService.assertReadPermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    return projectionRepository.listProjections(householdId);
  }
}

export const listProjectionsUseCase = new ListProjectionsUseCase();
