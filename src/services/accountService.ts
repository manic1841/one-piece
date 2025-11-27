import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { AccountSchema, AccountSnapshotSchema, parseWithSchema } from '../schemas';
import type { Account, AccountSnapshot } from '../schemas';
import { BaseService } from './baseService';

class AccountService extends BaseService<Account> {
  constructor() {
    super('accounts', AccountSchema);
  }

  // Create a new account
  async createAccount(
    householdId: string,
    account: Omit<Account, 'id' | 'createdAt'>,
  ): Promise<string> {
    return this.create(householdId, account);
  }

  // Get all accounts for a household
  async getAccounts(householdId: string): Promise<Account[]> {
    return this.getAll(householdId, [orderBy('createdAt', 'desc')]);
  }

  // Get a single account
  async getAccount(householdId: string, id: string): Promise<Account | null> {
    return this.getById(householdId, id);
  }

  // Update an account
  async updateAccount(householdId: string, id: string, updates: Partial<Account>): Promise<void> {
    return this.update(householdId, id, updates);
  }

  // Delete an account
  async deleteAccount(householdId: string, id: string): Promise<void> {
    return this.delete(householdId, id);
  }

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
  }

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
  }

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
  }

  // Get total assets for a household
  async getTotalAssets(householdId: string): Promise<number> {
    const latestSnapshots = await this.getLatestSnapshots(householdId);
    let total = 0;

    for (const snapshot of latestSnapshots.values()) {
      total += snapshot.amount;
    }

    return total;
  }
  // Update a snapshot
  async updateSnapshot(
    householdId: string,
    accountId: string,
    snapshotId: string,
    updates: Partial<Omit<AccountSnapshot, 'id' | 'createdAt'>>,
  ): Promise<void> {
    const snapshotRef = doc(
      db,
      'households',
      householdId,
      'accounts',
      accountId,
      'snapshots',
      snapshotId,
    );
    await setDoc(snapshotRef, updates, { merge: true });
  }

  // Delete a snapshot
  async deleteSnapshot(householdId: string, accountId: string, snapshotId: string): Promise<void> {
    const snapshotRef = doc(
      db,
      'households',
      householdId,
      'accounts',
      accountId,
      'snapshots',
      snapshotId,
    );
    await deleteDoc(snapshotRef);
  }
}

export const accountService = new AccountService();
