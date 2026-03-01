import { where } from 'firebase/firestore';

import { DEFAULT_PROJECTS } from '@/constants/project/defaultProjects';
import { RoleEnum } from '@/domains/auth/role';
import { householdRepository } from '@/repositories/householdRepository';
import type { Household, UserProfile } from '@/schemas';
import { projectService } from '@/services/projectService';
import { userService } from '@/services/userService';

class HouseholdService {
  // Create a new household
  async createHousehold(name: string, user: UserProfile): Promise<string> {
    const existingHouseholds = await householdRepository.list([], [where('name', '==', name)]);

    if (existingHouseholds.length > 0) {
      // Household with this name already exists
      const household = existingHouseholds[0];
      await this.joinHousehold(household.id, user);
      return household.id;
    }

    // Create a new household using repository
    const newHousehold = {
      name,
      members: {
        [user.uid]: {
          role: user.role || RoleEnum.OWNER, // New household creator should be OWNER
          joinedAt: new Date(),
        },
      },
    };
    const householdId = await householdRepository.create([], newHousehold, user.email);

    // Initialize default projects
    const initProjects = DEFAULT_PROJECTS.map((project) =>
      projectService.createProject(householdId, project, 'system'),
    );
    await Promise.all(initProjects);

    // Update user profile with householdId
    await userService.updateUserProfile(user.uid, { householdId });

    return householdId;
  }

  // Join an existing household by Id or name
  async joinHousehold(householdIdOrName: string, user: UserProfile): Promise<void> {
    // Try to find by ID first
    let household = await householdRepository.get([householdIdOrName]);

    if (!household) {
      // Try to find by name
      const households = await householdRepository.list(
        [],
        [where('name', '==', householdIdOrName)],
      );
      if (households.length === 0) {
        throw new Error('Household not found');
      }
      household = households[0];
    }

    // Check if user is already a member
    if (!household.members[user.uid]) {
      // Add user to household members using repository
      const updates = {
        [`members.${user.uid}`]: {
          role: user.role || RoleEnum.GUEST,
          joinedAt: new Date(),
        },
      };
      await householdRepository.update([household.id], updates, user.email);
    }

    // Update user profile
    await userService.updateUserProfile(user.uid, { householdId: household.id });
  }

  // Get household details
  async getHousehold(householdId: string): Promise<Household | null> {
    return await householdRepository.get([householdId]);
  }

  // Smart method that creates or joins household based on input
  async createOrJoinHousehold(input: string, user: UserProfile): Promise<string> {
    const trimmedInput = input.trim();

    if (!trimmedInput) {
      throw new Error('Please enter a household name or ID');
    }

    // First, try to find by ID
    const householdById = await householdRepository.get([trimmedInput]);
    if (householdById) {
      // Found by ID, join this household
      await this.joinHousehold(trimmedInput, user);
      return trimmedInput;
    }

    // If not found by ID, try to find by name
    const householdsByName = await householdRepository.list(
      [],
      [where('name', '==', trimmedInput)],
    );

    if (householdsByName.length > 0) {
      // Found by name, join this household
      const existingHouseholdId = householdsByName[0].id;
      await this.joinHousehold(existingHouseholdId, user);
      return existingHouseholdId;
    }

    // Not found by ID or name, create new household with this name
    return await this.createHousehold(trimmedInput, user);
  }

  // Get all households where user is a member
  async getUserHouseholds(uid: string): Promise<Household[]> {
    const allHouseholds = await householdRepository.list([]);

    // Filter households where user is a member
    return allHouseholds.filter((household) => household.members[uid] !== undefined);
  }

  // Switch to a different household
  async switchHousehold(uid: string, householdId: string): Promise<void> {
    // Verify user is a member of the target household
    const household = await this.getHousehold(householdId);
    if (!household) {
      throw new Error('Household not found');
    }

    if (!household.members[uid]) {
      throw new Error('You are not a member of this household');
    }

    // Update user profile with new householdId
    await userService.updateUserProfile(uid, { householdId });
  }

  // Leave current household (clear householdId from user profile)
  async leaveCurrentHousehold(uid: string): Promise<void> {
    // First, get the current user profile to preserve the role
    const currentProfile = await userService.getUserProfile(uid);
    if (!currentProfile) {
      throw new Error('User profile not found');
    }

    await userService.updateUserProfile(uid, { householdId: undefined });
  }
}

export const householdService = new HouseholdService();
