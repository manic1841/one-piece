import { collection, doc, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import { BaseRepository } from '@/infra/repositories/baseRepository';
import { type Account, AccountSchema, type AccountCreate, type AccountSnapshot, type AccountSnapshotCreate } from '@/domains/account/types/account';
import { accountSnapshotRepository } from './accountSnapshotRepository';

/**
 * AccountRepository
 * Path: households/{householdId}/accounts
 */
class AccountRepository extends BaseRepository<Account, [string, string?]> {
  private readonly collectionName = 'accounts';

  protected getCollectionRef(householdId: string) {
    return collection(this.db, 'households', householdId, this.collectionName);
  }

  protected getDocRef(householdId: string, accountId: string) {
    return doc(this.db, 'households', householdId, this.collectionName, accountId);
  }

  protected getDomainSchema() {
    return AccountSchema;
  }

  async getAccounts(householdId: string): Promise<Account[]> {
    return this.list([householdId], [orderBy('order', 'asc')]);
  }

  async createAccount(householdId: string, data: AccountCreate, userEmail: string): Promise<string> {
    return this.create([householdId], data, userEmail);
  }

  async updateAccount(householdId: string, id: string, data: Partial<AccountCreate>, userEmail: string): Promise<void> {
    return this.update([householdId, id], data, userEmail);
  }

  async saveSnapshot(householdId: string, accountId: string, snapshot: AccountSnapshotCreate, userEmail: string): Promise<void> {
    const snapshotId = accountSnapshotRepository.buildId(snapshot.year, snapshot.month);
    const existing = await accountSnapshotRepository.get([householdId, accountId, snapshotId]);
    if (existing) {
      await accountSnapshotRepository.update([householdId, accountId, snapshotId], snapshot, userEmail);
    } else {
      await accountSnapshotRepository.create([householdId, accountId], snapshot, userEmail, undefined, snapshotId);
    }
  }

  async getSnapshot(householdId: string, accountId: string, yearMonth: string): Promise<AccountSnapshot | null> {
    return accountSnapshotRepository.getSnapshot(householdId, accountId, yearMonth);
  }

  async getLatestSnapshot(householdId: string, accountId: string): Promise<AccountSnapshot | null> {
    return accountSnapshotRepository.getLatestSnapshot(householdId, accountId);
  }
}

export const accountRepository = new AccountRepository(db);
