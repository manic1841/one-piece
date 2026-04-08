import { accessControlRepository } from '@/infra/repositories/accessControlRepository';
import { type AccessControlWhitelist } from '@/domains/access_control/types';

export class GetWhitelistUseCase {
  async execute(): Promise<AccessControlWhitelist | null> {
    return await accessControlRepository.getWhitelist();
  }
}

export const getWhitelistUseCase = new GetWhitelistUseCase();
