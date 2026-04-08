import { userRepository } from '@/infra/repositories/userRepository';
import { type UserProfileCreate } from '@/domains/user/types';

export interface CreateUserProfileRequest {
  profile: UserProfileCreate;
}

export class CreateUserProfileUseCase {
  async execute(request: CreateUserProfileRequest): Promise<string> {
    const { profile } = request;
    return await userRepository.create([], profile, 'system', undefined, profile.uid);
  }
}

export const createUserProfileUseCase = new CreateUserProfileUseCase();
