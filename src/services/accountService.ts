import { orderBy } from 'firebase/firestore';
import type { Account, AccountSnapshot } from '../schemas';
import { accountRepository } from '../repositories/accountRepository';

class AccountService {
  // Create a new account
  async createAccount(
    householdId: string,
    account: Omit<Account, 'id' | 'createdAt'>,
  ): Promise<string> {
    return accountRepository.create(householdId, account);
  }

  // Get all accounts for a household
  async getAccounts(householdId: string): Promise<Account[]> {
    return accountRepository.getAll(householdId, [orderBy('createdAt', 'desc')]);
  }

  // Get a single account
  async getAccount(householdId: string, id: string): Promise<Account | null> {
    return accountRepository.getById(householdId, id);
  }

  // Update an account
  async updateAccount(householdId: string, id: string, updates: Partial<Account>): Promise<void> {
    return accountRepository.update(householdId, id, updates);
  }

  // Delete an account
  async deleteAccount(householdId: string, id: string): Promise<void> {
    return accountRepository.delete(householdId, id);
  }

  // Record a balance snapshot
  async recordSnapshot(
    householdId: string,
    accountId: string,
    snapshot: Omit<AccountSnapshot, 'id' | 'createdAt'>,
  ): Promise<string> {
    return accountRepository.createSnapshot(householdId, accountId, snapshot);
  }

  // Get balance snapshots for an account
  async getSnapshots(
    householdId: string,
    accountId: string,
    year?: number,
    month?: number,
  ): Promise<AccountSnapshot[]> {
    return accountRepository.getSnapshots(householdId, accountId, year, month);
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
    return accountRepository.updateSnapshot(householdId, accountId, snapshotId, updates);
  }

  // Delete a snapshot
  async deleteSnapshot(householdId: string, accountId: string, snapshotId: string): Promise<void> {
    return accountRepository.deleteSnapshot(householdId, accountId, snapshotId);
  }
}

export const accountService = new AccountService();
