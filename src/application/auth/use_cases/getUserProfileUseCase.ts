import { type UserProfile } from '@/domains/auth/user/types';
import { userRepository } from '@/infra/repositories/userRepository';

export interface GetUserProfileRequest {
  uid: string;
}

export class GetUserProfileUseCase {
  async execute(request: GetUserProfileRequest): Promise<UserProfile | null> {
    const { uid } = request;
    return await userRepository.get([uid]);
  }
}

export const getUserProfileUseCase = new GetUserProfileUseCase();
