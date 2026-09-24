import { accessControlRepository } from '@/infra/repositories/accessControlRepository';
import { type AccessControlWhitelist } from '@/domains/auth/whitelist/types';

export class GetWhitelistUseCase {
  async execute(): Promise<AccessControlWhitelist | null> {
    return await accessControlRepository.getWhitelist();
  }
}

export const getWhitelistUseCase = new GetWhitelistUseCase();
