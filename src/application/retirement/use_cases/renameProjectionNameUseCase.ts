import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { projectionRepository } from '@/infra/repositories/projectionRepository';

interface RenameProjectionNameRequest {
  householdId: string;
  projectionId: string;
  name: string;
  auth: AuthContext;
}

export class RenameProjectionNameUseCase {
  async execute(request: RenameProjectionNameRequest): Promise<void> {
    const { householdId, projectionId, name, auth } = request;

    const next = name.trim();
    if (next === '') throw new Error('Projection name is required.');
    if (next.length > 100) throw new Error('Projection name must be at most 100 characters.');

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    await projectionRepository.renameProjectionName(householdId, projectionId, next);
  }
}

export const renameProjectionNameUseCase = new RenameProjectionNameUseCase();
