import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { projectionRepository } from '@/infra/repositories/projectionRepository';

interface DeleteProjectionRequest {
  householdId: string;
  projectionId: string;
  auth: AuthContext;
}

export class DeleteProjectionUseCase {
  async execute(request: DeleteProjectionRequest): Promise<void> {
    const { householdId, projectionId, auth } = request;

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    await projectionRepository.deleteProjection(householdId, projectionId);
  }
}

export const deleteProjectionUseCase = new DeleteProjectionUseCase();
