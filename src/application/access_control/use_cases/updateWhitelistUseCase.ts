import { accessControlRepository } from '@/infra/repositories/accessControlRepository';

export interface UpdateWhitelistRequest {
  emails: string[];
  userEmail: string;
}

export class UpdateWhitelistUseCase {
  async execute(request: UpdateWhitelistRequest): Promise<void> {
    const { emails, userEmail } = request;
    await accessControlRepository.saveWhitelist({ emails }, userEmail);
  }
}

export const updateWhitelistUseCase = new UpdateWhitelistUseCase();
