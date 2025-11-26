import {
    collection,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    arrayUnion,
    serverTimestamp,
    query,
    where,
    getDocs
} from 'firebase/firestore';
import { db } from '../firebase';
import { HouseholdSchema, UserProfileSchema, parseWithSchema } from '../schemas';
import type { UserProfile, Household } from '../schemas';

export const householdService = {
    // Create a new household
    async createHousehold(name: string, user: UserProfile): Promise<string> {
        // Validate user input
        parseWithSchema(UserProfileSchema, user);

        const q = query(collection(db, 'households'), where('name', '==', name));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            // Household with this name already exists
            const householdData = querySnapshot.docs[0].data();
            const household = parseWithSchema(HouseholdSchema, householdData);
            await this.joinHousehold(household.id, user);
            return household.id;
        }

        // Create a new household
        const householdRef = doc(collection(db, 'households'));
        const householdId = householdRef.id;

        const newHousehold = {
            id: householdId,
            name,
            members: [user.email],
            createdAt: serverTimestamp()
        };

        await setDoc(householdRef, newHousehold);

        // Update user profile with householdId
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
            ...user,
            householdId,
            updatedAt: serverTimestamp()
        }, { merge: true });

        return householdId;
    },

    // Join an existing household by Id or name
    async joinHousehold(householdIdOrName: string, user: UserProfile): Promise<void> {
        // Validate user input
        parseWithSchema(UserProfileSchema, user);

        let householdRef = doc(db, 'households', householdIdOrName);
        const householdSnap = await getDoc(householdRef);

        if (!householdSnap.exists()) {
            const q = query(collection(db, 'households'), where('name', '==', householdIdOrName));
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                throw new Error('Household not found');
            }
            householdRef = doc(db, 'households', querySnapshot.docs[0].id);
        }

        // Add user to household members
        await updateDoc(householdRef, {
            members: arrayUnion(user.email)
        });

        // Update user profile
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
            ...user,
            householdId: householdRef.id,
            updatedAt: serverTimestamp()
        }, { merge: true });
    },

    // Get household details
    async getHousehold(householdId: string): Promise<Household | null> {
        const docRef = doc(db, 'households', householdId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            // Validate the data from Firestore
            return parseWithSchema(HouseholdSchema, data);
        } else {
            return null;
        }
    },

    // Get user profile (helper to check if user has household)
    async getUserProfile(uid: string): Promise<UserProfile | null> {
        const docRef = doc(db, 'users', uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data() as UserProfile;
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
        const householdRef = doc(db, 'households', trimmedInput);
        const householdSnap = await getDoc(householdRef);

        if (householdSnap.exists()) {
            // Found by ID, join this household
            await this.joinHousehold(trimmedInput, user);
            return trimmedInput;
        }

        // If not found by ID, try to find by name
        const q = query(collection(db, 'households'), where('name', '==', trimmedInput));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            // Found by name, join this household
            const existingHouseholdId = querySnapshot.docs[0].id;
            await this.joinHousehold(existingHouseholdId, user);
            return existingHouseholdId;
        }

        // Not found by ID or name, create new household with this name
        return await this.createHousehold(trimmedInput, user);
    }
};
