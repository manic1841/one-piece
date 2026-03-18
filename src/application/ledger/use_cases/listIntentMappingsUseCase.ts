import { intentMappingRepository } from '@/infra/repositories/intentMappingRepository';
import { type IntentMapping } from '@/infra/schemas/ledger';
import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';

export interface ListIntentMappingsRequest {
  householdId: string;
  auth: AuthContext;
}

export class ListIntentMappingsUseCase {
  async execute(request: ListIntentMappingsRequest): Promise<IntentMapping[]> {
    const { householdId, auth } = request;

    await householdPermissionService.assertReadPermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    return await intentMappingRepository.list([householdId]);
  }
}

export const listIntentMappingsUseCase = new ListIntentMappingsUseCase();
