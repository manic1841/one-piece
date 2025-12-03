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
  type DocumentData,
  type WithFieldValue,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  AccountSchema,
  AccountSnapshotSchema,
  type Account,
  type AccountSnapshot,
  parseWithSchema,
} from '../schemas';

class AccountRepository {
  private readonly collectionName = 'accounts';
  private readonly snapshotCollectionName = 'snapshots';

  private getCollectionRef(householdId: string) {
    return collection(db, 'households', householdId, this.collectionName);
  }

  private getDocRef(householdId: string, accountId: string) {
    return doc(db, 'households', householdId, this.collectionName, accountId);
  }

  private getSnapshotCollectionRef(householdId: string, accountId: string) {
    return collection(
      db,
      'households',
      householdId,
      this.collectionName,
      accountId,
      this.snapshotCollectionName,
    );
  }

  private getSnapshotDocRef(householdId: string, accountId: string, snapshotId: string) {
    return doc(
      db,
      'households',
      householdId,
      this.collectionName,
      accountId,
      this.snapshotCollectionName,
      snapshotId,
    );
  }

  private parseAccount(data: DocumentData): Account {
    return parseWithSchema(AccountSchema, data);
  }

  private parseSnapshot(data: DocumentData): AccountSnapshot {
    return parseWithSchema(AccountSnapshotSchema, data);
  }

  // Account Operations
  async create(householdId: string, data: Omit<Account, 'id' | 'createdAt'>): Promise<string> {
    const docRef = doc(this.getCollectionRef(householdId));
    const id = docRef.id;

    const newAccount = {
      ...data,
      id,
      createdAt: serverTimestamp(),
    };

    await setDoc(docRef, newAccount as WithFieldValue<DocumentData>);
    return id;
  }

  async getAll(householdId: string, constraints: QueryConstraint[] = []): Promise<Account[]> {
    const q = query(this.getCollectionRef(householdId), ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => this.parseAccount(doc.data()));
  }

  async getById(householdId: string, accountId: string): Promise<Account | null> {
    const docSnap = await getDoc(this.getDocRef(householdId, accountId));
    if (docSnap.exists()) {
      return this.parseAccount(docSnap.data());
    }
    return null;
  }

  async update(householdId: string, accountId: string, updates: Partial<Account>): Promise<void> {
    const docRef = this.getDocRef(householdId, accountId);
    await updateDoc(docRef, updates as DocumentData);
  }

  async delete(householdId: string, accountId: string): Promise<void> {
    await deleteDoc(this.getDocRef(householdId, accountId));
  }

  // Snapshot Operations
  async createSnapshot(
    householdId: string,
    accountId: string,
    data: Omit<AccountSnapshot, 'id' | 'createdAt'>,
  ): Promise<string> {
    const docRef = doc(this.getSnapshotCollectionRef(householdId, accountId));
    const id = docRef.id;

    const newSnapshot = {
      ...data,
      id,
      createdAt: serverTimestamp(),
    };

    await setDoc(docRef, newSnapshot as WithFieldValue<DocumentData>);
    return id;
  }

  async getSnapshots(
    householdId: string,
    accountId: string,
    year?: number,
    month?: number,
  ): Promise<AccountSnapshot[]> {
    let q = query(
      this.getSnapshotCollectionRef(householdId, accountId),
      orderBy('year', 'desc'),
      orderBy('month', 'desc'),
    );

    if (year !== undefined) {
      q = query(q, where('year', '==', year));
    }
    if (month !== undefined) {
      q = query(q, where('month', '==', month));
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => this.parseSnapshot(doc.data()));
  }

  async updateSnapshot(
    householdId: string,
    accountId: string,
    snapshotId: string,
    updates: Partial<AccountSnapshot>,
  ): Promise<void> {
    const docRef = this.getSnapshotDocRef(householdId, accountId, snapshotId);
    await setDoc(docRef, updates as DocumentData, { merge: true });
  }

  async deleteSnapshot(householdId: string, accountId: string, snapshotId: string): Promise<void> {
    await deleteDoc(this.getSnapshotDocRef(householdId, accountId, snapshotId));
  }
}

export const accountRepository = new AccountRepository();
