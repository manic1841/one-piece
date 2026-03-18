import { userRepository } from '@/infra/repositories/userRepository';
import { type UserProfileCreate } from '@/domains/user/types';

export interface UpdateUserProfileRequest {
  uid: string;
  updates: Partial<UserProfileCreate>;
}

export class UpdateUserProfileUseCase {
  async execute(request: UpdateUserProfileRequest): Promise<void> {
    const { uid, updates } = request;
    return await userRepository.update([uid], updates, 'system');
  }
}

export const updateUserProfileUseCase = new UpdateUserProfileUseCase();
