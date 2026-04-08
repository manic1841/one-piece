import { userRepository } from '@/infra/repositories/userRepository';
import { type UserProfile } from '@/domains/user/types';

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
