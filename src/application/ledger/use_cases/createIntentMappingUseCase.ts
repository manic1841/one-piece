import { intentMappingRepository } from '@/infra/repositories/intentMappingRepository';
import { type IntentMappingCreate } from '@/infra/schemas/ledger';
import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';

export interface CreateIntentMappingRequest {
  householdId: string;
  data: IntentMappingCreate;
  userEmail: string;
  auth: AuthContext;
}

export class CreateIntentMappingUseCase {
  async execute(request: CreateIntentMappingRequest): Promise<string> {
    const { householdId, data, userEmail, auth } = request;

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    return await intentMappingRepository.create([householdId], data, userEmail);
  }
}

export const createIntentMappingUseCase = new CreateIntentMappingUseCase();
