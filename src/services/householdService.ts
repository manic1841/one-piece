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
import { type UserProfile, type Household } from '../types';

export const householdService = {
    // Create a new household
    async createHousehold(name: string, user: UserProfile): Promise<string> {
        const q = query(collection(db, 'households'), where('name', '==', name));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            // Household with this name already exists
            const household = querySnapshot.docs[0].data() as Household;
            await this.joinHousehold(household.id, user);
            return household.id;
        }

        // Create a new household
        const householdRef = doc(collection(db, 'households'));
        const householdId = householdRef.id;

        const newHousehold: Household = {
            id: householdId,
            name,
            members: [user.email],
            createdAt: serverTimestamp() as any
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
            return docSnap.data() as Household;
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
    }
};
