import { accessControlRepository } from '@/infra/repositories/accessControlRepository';

export interface UpdateWhitelistRequest {
  emails: string[];
}

export class UpdateWhitelistUseCase {
  async execute(request: UpdateWhitelistRequest): Promise<void> {
    const { emails } = request;
    await accessControlRepository.saveWhitelist({ emails });
  }
}

export const updateWhitelistUseCase = new UpdateWhitelistUseCase();
