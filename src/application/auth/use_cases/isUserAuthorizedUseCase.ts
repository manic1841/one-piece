import { isEmailWhitelisted } from '@/domains/auth/whitelistRules';
import { accessControlRepository } from '@/infra/repositories/accessControlRepository';

export interface IsUserAuthorizedRequest {
  email: string | null;
}

export class IsUserAuthorizedUseCase {
  async execute(request: IsUserAuthorizedRequest): Promise<boolean> {
    const { email } = request;
    if (!email) return false;

    const whitelist = await accessControlRepository.getWhitelist();
    if (!whitelist) return false;

    // 比對規則住 domain（純函式），本 use case 只負責讀取白名單。
    return isEmailWhitelisted(whitelist.emails, email);
  }
}

export const isUserAuthorizedUseCase = new IsUserAuthorizedUseCase();
