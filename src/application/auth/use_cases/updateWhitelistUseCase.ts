import { accessControlRepository } from '@/infra/repositories/accessControlRepository';

import { invalidateRouteAccessCache } from '../routeAccessCache';

export interface UpdateWhitelistRequest {
  emails: string[];
}

export class UpdateWhitelistUseCase {
  async execute(request: UpdateWhitelistRequest): Promise<void> {
    const { emails } = request;
    await accessControlRepository.saveWhitelist({ emails });
    // Whitelist membership is half of every route decision.
    invalidateRouteAccessCache();
  }
}

export const updateWhitelistUseCase = new UpdateWhitelistUseCase();
