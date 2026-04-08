import { where } from 'firebase/firestore';

import { userRepository } from '@/infra/repositories/userRepository';
import { type UserProfile } from '@/domains/user/types';

export interface GetUserByEmailRequest {
  email: string;
}

export class GetUserByEmailUseCase {
  async execute(request: GetUserByEmailRequest): Promise<UserProfile | null> {
    const { email } = request;
    const list = await userRepository.list([], [where('email', '==', email.toLowerCase().trim())]);
    return list[0] || null;
  }
}

export const getUserByEmailUseCase = new GetUserByEmailUseCase();
