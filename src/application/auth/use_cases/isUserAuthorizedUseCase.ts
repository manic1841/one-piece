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

    return whitelist.emails.includes(email.toLowerCase().trim());
  }
}

export const isUserAuthorizedUseCase = new IsUserAuthorizedUseCase();
