import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { AccountSchema, AccountSnapshotSchema, parseWithSchema } from '../schemas';
import type { Account, AccountSnapshot } from '../schemas';

export const accountService = {
    // Create a new account
    async createAccount(householdId: string, account: Omit<Account, 'id' | 'createdAt'>): Promise<string> {
        const accountRef = doc(collection(db, 'households', householdId, 'accounts'));
        const accountId = accountRef.id;

        const newAccount = {
            ...account,
            id: accountId,
            createdAt: serverTimestamp(),
        };

        await setDoc(accountRef, newAccount);
        return accountId;
    },

    // Get all accounts for a household
    async getAccounts(householdId: string): Promise<Account[]> {
        const accountsRef = collection(db, 'households', householdId, 'accounts');
        const q = query(accountsRef, orderBy('createdAt', 'desc'));

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => {
            const data = doc.data();
            return parseWithSchema(AccountSchema, data);
        });
    },

    // Get a single account
    async getAccount(householdId: string, id: string): Promise<Account | null> {
        const docRef = doc(db, 'households', householdId, 'accounts', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            return parseWithSchema(AccountSchema, data);
        }
        return null;
    },

    // Update an account
    async updateAccount(householdId: string, id: string, updates: Partial<Account>): Promise<void> {
        const accountRef = doc(db, 'households', householdId, 'accounts', id);
        await updateDoc(accountRef, updates);
    },

    // Delete an account
    async deleteAccount(householdId: string, id: string): Promise<void> {
        const accountRef = doc(db, 'households', householdId, 'accounts', id);
        await deleteDoc(accountRef);
    },

    // Record a balance snapshot
    async recordSnapshot(
        householdId: string,
        accountId: string,
        snapshot: Omit<AccountSnapshot, 'id' | 'createdAt'>,
    ): Promise<string> {
        const snapshotRef = doc(
            collection(db, 'households', householdId, 'accounts', accountId, 'snapshots'),
        );
        const snapshotId = snapshotRef.id;

        const newSnapshot = {
            ...snapshot,
            id: snapshotId,
            createdAt: serverTimestamp(),
        };

        await setDoc(snapshotRef, newSnapshot);
        return snapshotId;
    },

    // Get balance snapshots for an account
    async getSnapshots(
        householdId: string,
        accountId: string,
        year?: number,
        month?: number,
    ): Promise<AccountSnapshot[]> {
        const snapshotsRef = collection(
            db,
            'households',
            householdId,
            'accounts',
            accountId,
            'snapshots',
        );
        let q = query(snapshotsRef, orderBy('year', 'desc'), orderBy('month', 'desc'));

        if (year !== undefined) {
            q = query(q, where('year', '==', year));
        }
        if (month !== undefined) {
            q = query(q, where('month', '==', month));
        }

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => {
            const data = doc.data();
            return parseWithSchema(AccountSnapshotSchema, data);
        });
    },

    // Get latest snapshot for each account in a household
    async getLatestSnapshots(householdId: string): Promise<Map<string, AccountSnapshot>> {
        const accounts = await this.getAccounts(householdId);
        const latestSnapshots = new Map<string, AccountSnapshot>();

        for (const account of accounts) {
            const snapshots = await this.getSnapshots(householdId, account.id);
            if (snapshots.length > 0) {
                latestSnapshots.set(account.id, snapshots[0]);
            }
        }

        return latestSnapshots;
    },

    // Get total assets for a household
    async getTotalAssets(householdId: string): Promise<number> {
        const latestSnapshots = await this.getLatestSnapshots(householdId);
        let total = 0;

        for (const snapshot of latestSnapshots.values()) {
            total += snapshot.amount;
        }

        return total;
    },
};
