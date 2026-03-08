import { type Transaction, where } from 'firebase/firestore';

import { DEFAULT_PROJECTS } from '@/constants/project/defaultProjects';
import { RoleEnum } from '@/domains/auth/role';
import { householdRepository } from '@/repositories/householdRepository';
import type { Household, UserProfile } from '@/schemas';
import { projectService } from '@/services/projectService';
import { userService } from '@/services/userService';

export interface AuthContext {
  uid: string;
  isGlobalAdmin?: boolean;
}

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
          role: RoleEnum.OWNER, // New household creator should be OWNER
          joinedAt: new Date(),
        },
      },
    };
    const householdId = await householdRepository.create([], newHousehold, user.email);

    // Initialize default projects
    const initProjects = DEFAULT_PROJECTS.map((project) =>
      projectService.createProject(householdId, project, 'system', {
        uid: user.uid,
        isGlobalAdmin: true,
      }),
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

    if (!household.members[user.uid]) {
      throw new Error(
        'You are not a member of this household. Please ask an owner to add your email first.',
      );
    }

    // Update user profile
    await userService.updateUserProfile(user.uid, { householdId: household.id });
  }

  // Get household details
  async getHousehold(householdId: string, tx?: Transaction): Promise<Household | null> {
    return await householdRepository.get([householdId], tx);
  }

  // Smart method that creates or joins household based on input
  async createOrJoinHousehold(input: string, user: UserProfile, isAdmin: boolean): Promise<string> {
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
    // ONLY admin can create new household
    if (!isAdmin) {
      throw new Error(
        'Only admin users can create new households. Please enter a valid household ID to join.',
      );
    }

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

  // Member Management
  async addMemberByEmail(
    householdId: string,
    email: string,
    role: string,
    adminEmail: string,
    auth: AuthContext,
  ): Promise<void> {
    await this.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);
    const userToInvite = await userService.getUserByEmail(email);
    if (!userToInvite) {
      throw new Error('User with this email not found in the system');
    }

    const updates = {
      [`members.${userToInvite.uid}`]: {
        role,
        joinedAt: new Date(),
      },
    };
    await householdRepository.update([householdId], updates, adminEmail);

    // Also update that user's profile to point to this household
    await userService.updateUserProfile(userToInvite.uid, { householdId });
  }

  async updateMemberRole(
    householdId: string,
    targetUid: string,
    newRole: string,
    adminEmail: string,
    auth: AuthContext,
  ): Promise<void> {
    await this.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);
    const updates = {
      [`members.${targetUid}.role`]: newRole,
    };
    await householdRepository.update([householdId], updates, adminEmail);
  }

  async removeMember(
    householdId: string,
    targetUid: string,
    adminEmail: string,
    auth: AuthContext,
  ): Promise<void> {
    await this.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);
    // In Firestore, removing a field from a map can be done by setting it to deleteField()
    // or manually updating the whole map. BaseRepository doesn't explicitly support deleteField yet,
    // so we'll fetch, modify, and update the whole members object or use a specific implementation.
    // However, our repository is simplified. Let's use the update method with a dot notation if possible,
    // but the actual "deletion" of a key in deep map is tricky without fieldvalue.delete().

    // For now, let's fetch the household and update the entire members object
    const household = await this.getHousehold(householdId);
    if (!household) throw new Error('Household not found');

    const newMembers = { ...household.members };
    delete newMembers[targetUid];

    await householdRepository.update([householdId], { members: newMembers }, adminEmail);

    // Also clear the user's householdId if they were in this household
    const targetProfile = await userService.getUserProfile(targetUid);
    if (targetProfile?.householdId === householdId) {
      await userService.updateUserProfile(targetUid, { householdId: undefined });
    }
  }

  // Check if user is a member of a household
  async isUserMember(householdId: string, uid: string): Promise<boolean> {
    const household = await this.getHousehold(householdId);
    if (!household) return false;
    return !!household.members[uid];
  }

  // Check if user is an admin or owner of a household
  async isUserAdmin(householdId: string, uid: string, tx?: Transaction): Promise<boolean> {
    const household = await this.getHousehold(householdId, tx);
    if (!household) return false;
    const role = household.members[uid]?.role;
    return role === RoleEnum.ADMIN || role === RoleEnum.OWNER;
  }

  // Assert that user has write permission (household admin/owner or global admin)
  async assertWritePermission(
    householdId: string,
    uid: string,
    isGlobalAdmin?: boolean,
    tx?: Transaction,
  ): Promise<void> {
    if (isGlobalAdmin) return;

    const isAdmin = await this.isUserAdmin(householdId, uid, tx);
    if (!isAdmin) {
      throw new Error(
        'Permission denied: Only household owners or admins can perform this action.',
      );
    }
  }
}

export const householdService = new HouseholdService();
