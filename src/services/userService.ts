import { where } from 'firebase/firestore';

import { userRepository } from '@/repositories/userRepository';
import { type UserProfile, type UserProfileCreate } from '@/schemas';

class UserService {
  async createUserProfile(profile: UserProfileCreate): Promise<string> {
    return await userRepository.create([], profile, 'system');
  }

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    return await userRepository.get([uid]);
  }

  async updateUserProfile(uid: string, updates: Partial<UserProfileCreate>): Promise<void> {
    return await userRepository.update([uid], updates, 'system');
  }

  async getUserByEmail(email: string): Promise<UserProfile | null> {
    const list = await userRepository.list([], [where('email', '==', email.toLowerCase().trim())]);
    return list[0] || null;
  }
}

export const userService = new UserService();
