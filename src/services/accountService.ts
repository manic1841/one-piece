import type {
  Account,
  AccountCreate,
  AccountSnapshot,
  AccountSnapshotCreate,
  AccountWithSnapshot,
} from '@/domains/account/types';
import { accountRepository } from '@/repositories/accountRepository';
import { accountSnapshotRepository } from '@/repositories/accountSnapshotRepository';
import { QueryConstraint, orderBy, where } from 'firebase/firestore';

class AccountService {
  // Create a new account
  async createAccount(
    householdId: string,
    account: AccountCreate,
    userEmail: string,
  ): Promise<string> {
    return accountRepository.create([householdId], account, userEmail);
  }

  // Get all accounts for a household
  async getAccounts(householdId: string): Promise<Account[]> {
    const accounts = await accountRepository.list([householdId], [orderBy('createdAt', 'desc')]);
    return accounts.map((account) => {
      if (!account.category) account.category = account.type; // for backward compatibility
      return account;
    });
  }

  // Get a single account
  async getAccount(householdId: string, id: string): Promise<Account | null> {
    return accountRepository.get([householdId, id]);
  }

  // Update an account
  async updateAccount(
    householdId: string,
    id: string,
    updates: Partial<AccountCreate>,
    userEmail: string,
  ): Promise<void> {
    return accountRepository.update([householdId, id], updates, userEmail);
  }

  // Delete an account
  async deleteAccount(householdId: string, id: string): Promise<void> {
    return accountRepository.delete([householdId, id]);
  }

  // Record a balance snapshot
  async recordSnapshot(
    householdId: string,
    accountId: string,
    snapshot: AccountSnapshotCreate,
    userEmail: string,
  ): Promise<string> {
    return accountSnapshotRepository.create([householdId, accountId], snapshot, userEmail);
  }

  // Get balance snapshots for an account
  async getSnapshots(
    householdId: string,
    accountId: string,
    year?: number,
    month?: number,
  ): Promise<AccountSnapshot[]> {
    const q: QueryConstraint[] = [orderBy('createdAt', 'desc')];
    if (year) {
      q.push(where('year', '==', year));
    }
    if (month) {
      q.push(where('month', '==', month));
    }
    return accountSnapshotRepository.list([householdId, accountId], q);
  }

  async getAccountWithSnapshots(
    householdId: string,
    accountId?: string,
  ): Promise<AccountWithSnapshot[]> {
    const accounts = accountId
      ? [await this.getAccount(householdId, accountId)]
      : await this.getAccounts(householdId);

    const result: AccountWithSnapshot[] = [];
    for (const account of accounts) {
      if (!account) continue;
      const snapshots = await this.getSnapshots(householdId, account.id);
      result.push({ ...account, snapshots });
    }
    return result;
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
    updates: Partial<AccountSnapshotCreate>,
    userEmail: string,
  ): Promise<void> {
    return accountSnapshotRepository.update(
      [householdId, accountId, snapshotId],
      updates,
      userEmail,
    );
  }

  // Delete a snapshot
  async deleteSnapshot(householdId: string, accountId: string, snapshotId: string): Promise<void> {
    return accountSnapshotRepository.delete([householdId, accountId, snapshotId]);
  }
}

export const accountService = new AccountService();
