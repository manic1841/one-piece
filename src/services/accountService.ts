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

  async getAccountWithLatestSnapshots(
    householdId: string,
    accountId?: string,
  ): Promise<AccountWithSnapshot[]> {
    const accounts = accountId
      ? [await this.getAccount(householdId, accountId)]
      : await this.getAccounts(householdId);

    const result: AccountWithSnapshot[] = [];
    for (const account of accounts) {
      if (!account) continue;
      const snapshot = await this.getLatestSnapshot(householdId, account.id);

      result.push({ ...account, snapshot });
    }
    return result;
  }

  // Get latest snapshot for each account in a household
  async getLatestSnapshot(householdId: string, accountId: string): Promise<AccountSnapshot | null> {
    const snapshots = await this.getSnapshots(householdId, accountId);
    // compare year and month to get the latest snapshot
    const latestSnapshot = snapshots.reduce(
      (latest, current) => {
        if (!latest) return current;
        if (current.year > latest.year) return current;
        if (current.year === latest.year && current.month > latest.month) return current;
        return latest;
      },
      null as AccountSnapshot | null,
    );
    return latestSnapshot;
  }

  async getPreviousSnapshot(
    householdId: string,
    accountId: string,
    year: number,
    month: number,
  ): Promise<AccountSnapshot | null> {
    let prevYear = year;
    let prevMonth = month - 1;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = year - 1;
    }
    const snapshots = await this.getSnapshots(householdId, accountId, prevYear, prevMonth);
    return snapshots.length > 0 ? snapshots[0] : null;
  }

  // Get total assets for a household
  async getTotalAssets(householdId: string): Promise<number> {
    const accounts = await this.getAccounts(householdId);
    let total = 0;
    for (const account of accounts) {
      if (!account) continue;
      const latest = await this.getLatestSnapshot(householdId, account.id);
      total += latest ? latest.amount : 0;
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

  // Get snapshots for multiple accounts in a specific month
  async getAccountSnapshots(
    householdId: string,
    accountIds: string[],
    year: number,
    month: number,
  ): Promise<AccountSnapshot[]> {
    const snapshotPromises = accountIds.map((accountId) =>
      this.getSnapshots(householdId, accountId, year, month),
    );
    const snapshotArrays = await Promise.all(snapshotPromises);
    return snapshotArrays.flat();
  }
}

export const accountService = new AccountService();
