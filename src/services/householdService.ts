import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  where,
  deleteField,
} from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfileSchema, parseWithSchema } from '../schemas';
import type { UserProfile, Household } from '../schemas';
import { householdRepository } from '../repositories/householdRepository';
import { RoleEnum } from '../domains/core/role';

export const householdService = {
  // Create a new household
  async createHousehold(name: string, user: UserProfile): Promise<string> {
    // Validate user input
    parseWithSchema(UserProfileSchema, user);

    const existingHouseholds = await householdRepository.list([], [where('name', '==', name)]);

    if (existingHouseholds.length > 0) {
      // Household with this name already exists
      const household = existingHouseholds[0];
      await this.joinHousehold(household.id, user);
      return household.id;
    }

    // Create a new household using repository
    const householdId = await householdRepository.create(
      [],
      {
        name,
        members: {
          [user.uid]: {
            role: user.role || RoleEnum.GUEST,
            joinedAt: new Date(),
          },
        },
      },
      user.email,
    );

    // Update user profile with householdId
    const userRef = doc(db, 'users', user.uid);
    await setDoc(
      userRef,
      {
        ...user,
        householdId,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    return householdId;
  },

  // Join an existing household by Id or name
  async joinHousehold(householdIdOrName: string, user: UserProfile): Promise<void> {
    // Validate user input
    parseWithSchema(UserProfileSchema, user);

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
      await householdRepository.update(
        [household.id],
        {
          [`members.${user.uid}`]: {
            role: user.role || 'guest',
            joinedAt: new Date(),
          },
        },
        user.email,
      );
    }

    // Update user profile
    const userRef = doc(db, 'users', user.uid);
    await setDoc(
      userRef,
      {
        ...user,
        householdId: household.id,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  },

  // Get household details
  async getHousehold(householdId: string): Promise<Household | null> {
    return await householdRepository.get([householdId]);
  },

  // Get user profile (helper to check if user has household)
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      // Ensure role field exists, default to 'guest' if missing
      if (!data.role) {
        data.role = 'guest';
        await updateDoc(docRef, { role: 'guest' });
      }
      return parseWithSchema(UserProfileSchema, data);
    }
    return null;
  },

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
  },

  // Get all households where user is a member
  async getUserHouseholds(uid: string): Promise<Household[]> {
    const allHouseholds = await householdRepository.list([]);

    // Filter households where user is a member
    return allHouseholds.filter((household) => household.members[uid] !== undefined);
  },

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
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      householdId,
      updatedAt: serverTimestamp(),
    });
  },

  // Leave current household (clear householdId from user profile)
  async leaveCurrentHousehold(uid: string): Promise<void> {
    // First, get the current user profile to preserve the role
    const currentProfile = await this.getUserProfile(uid);
    if (!currentProfile) {
      throw new Error('User profile not found');
    }

    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      householdId: deleteField(),
      updatedAt: serverTimestamp(),
    });
  },
};
