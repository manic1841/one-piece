import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    arrayUnion,
    arrayRemove,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { type AccessControl } from '../types';

const ADMIN_UID = 'rnSCoxeAl0bmc9NQeHSzFR5gYUB3';
const ACCESS_CONTROL_DOC = 'config';

export const accessControlService = {
    // Check if user is admin
    isAdmin(uid: string): boolean {
        return uid === ADMIN_UID;
    },

    // Get whitelisted emails
    async getWhitelist(): Promise<string[]> {
        try {
            const docRef = doc(db, 'access_control', ACCESS_CONTROL_DOC);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data() as AccessControl;
                return data.whitelistedEmails || [];
            }

            return [];
        } catch (error) {
            console.error('Error getting whitelist:', error);
            return [];
        }
    },

    // Add email to whitelist (admin only)
    async addEmailToWhitelist(email: string, adminUid: string): Promise<void> {
        if (!this.isAdmin(adminUid)) {
            throw new Error('Only admin can modify whitelist');
        }

        const docRef = doc(db, 'access_control', ACCESS_CONTROL_DOC);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            await updateDoc(docRef, {
                whitelistedEmails: arrayUnion(email.toLowerCase().trim()),
                updatedAt: serverTimestamp(),
                updatedBy: adminUid
            });
        } else {
            await setDoc(docRef, {
                whitelistedEmails: [email.toLowerCase().trim()],
                updatedAt: serverTimestamp(),
                updatedBy: adminUid
            });
        }
    },

    // Remove email from whitelist (admin only)
    async removeEmailFromWhitelist(email: string, adminUid: string): Promise<void> {
        if (!this.isAdmin(adminUid)) {
            throw new Error('Only admin can modify whitelist');
        }

        const docRef = doc(db, 'access_control', ACCESS_CONTROL_DOC);
        await updateDoc(docRef, {
            whitelistedEmails: arrayRemove(email.toLowerCase().trim()),
            updatedAt: serverTimestamp(),
            updatedBy: adminUid
        });
    },

    // Check if user is authorized (admin or whitelisted)
    async isUserAuthorized(uid: string, email: string | null): Promise<boolean> {
        // Admin is always authorized
        if (this.isAdmin(uid)) {
            return true;
        }

        // Check whitelist
        if (!email) {
            return false;
        }

        const whitelist = await this.getWhitelist();
        return whitelist.includes(email.toLowerCase().trim());
    }
};
