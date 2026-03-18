import { intentMappingRepository } from '@/infra/repositories/intentMappingRepository';
import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';

export interface DeleteIntentMappingRequest {
  householdId: string;
  mappingId: string;
  auth: AuthContext;
}

export class DeleteIntentMappingUseCase {
  async execute(request: DeleteIntentMappingRequest): Promise<void> {
    const { householdId, mappingId, auth } = request;

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    await intentMappingRepository.delete([householdId, mappingId]);
  }
}

export const deleteIntentMappingUseCase = new DeleteIntentMappingUseCase();
