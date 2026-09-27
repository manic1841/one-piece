import { type AccessControlWhitelist } from '@/domains/auth/whitelist/types';
import { accessControlRepository } from '@/infra/repositories/accessControlRepository';

export class GetWhitelistUseCase {
  async execute(): Promise<AccessControlWhitelist | null> {
    return await accessControlRepository.getWhitelist();
  }
}

export const getWhitelistUseCase = new GetWhitelistUseCase();
