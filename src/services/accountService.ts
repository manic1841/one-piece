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
import { AccountSchema, BalanceSnapshotSchema, parseWithSchema } from '../schemas';
import type { Account, BalanceSnapshot } from '../schemas';

export const accountService = {
    // Create a new account
    async createAccount(account: Omit<Account, 'id' | 'createdAt'>): Promise<string> {
        const accountRef = doc(collection(db, 'accounts'));
        const accountId = accountRef.id;

        const newAccount = {
            ...account,
            id: accountId,
            createdAt: serverTimestamp()
        };

        await setDoc(accountRef, newAccount);
        return accountId;
    },

    // Get all accounts for a household
    async getAccounts(householdId: string): Promise<Account[]> {
        const q = query(
            collection(db, 'accounts'),
            where('householdId', '==', householdId),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return parseWithSchema(AccountSchema, data);
        });
    },

    // Get a single account
    async getAccount(id: string): Promise<Account | null> {
        const docRef = doc(db, 'accounts', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            return parseWithSchema(AccountSchema, data);
        }
        return null;
    },

    // Update an account
    async updateAccount(id: string, updates: Partial<Account>): Promise<void> {
        const accountRef = doc(db, 'accounts', id);
        await updateDoc(accountRef, updates);
    },

    // Delete an account
    async deleteAccount(id: string): Promise<void> {
        const accountRef = doc(db, 'accounts', id);
        await deleteDoc(accountRef);
    },

    // Record a balance snapshot
    async recordBalanceSnapshot(snapshot: Omit<BalanceSnapshot, 'id' | 'recordedAt'>): Promise<string> {
        const snapshotRef = doc(collection(db, 'balance_snapshots'));
        const snapshotId = snapshotRef.id;

        const newSnapshot = {
            ...snapshot,
            id: snapshotId,
            recordedAt: serverTimestamp()
        };

        await setDoc(snapshotRef, newSnapshot);
        return snapshotId;
    },

    // Get balance snapshots for an account
    async getBalanceSnapshots(
        accountId: string,
        year?: number,
        month?: number
    ): Promise<BalanceSnapshot[]> {
        const q = query(
            collection(db, 'balance_snapshots'),
            where('accountId', '==', accountId),
            orderBy('year', 'desc'),
            orderBy('month', 'desc')
        );

        const querySnapshot = await getDocs(q);
        let snapshots = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return parseWithSchema(BalanceSnapshotSchema, data);
        });

        // Apply filters if provided
        if (year !== undefined) {
            snapshots = snapshots.filter(s => s.year === year);
        }
        if (month !== undefined) {
            snapshots = snapshots.filter(s => s.month === month);
        }

        return snapshots;
    },

    // Get latest snapshot for each account in a household
    async getLatestSnapshots(householdId: string): Promise<Map<string, BalanceSnapshot>> {
        const accounts = await this.getAccounts(householdId);
        const latestSnapshots = new Map<string, BalanceSnapshot>();

        for (const account of accounts) {
            const snapshots = await this.getBalanceSnapshots(account.id);
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
            total += snapshot.balance;
        }

        return total;
    }
};
