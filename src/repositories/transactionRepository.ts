import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  serverTimestamp,
  Timestamp,
  type DocumentData,
  type WithFieldValue,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '../firebase';
import { TransactionSchema, type Transaction } from '../schemas';

class TransactionRepository {
  private readonly collectionName = 'transactions';

  private getCollectionRef(householdId: string) {
    return collection(db, 'households', householdId, this.collectionName);
  }

  private getDocRef(householdId: string, transactionId: string) {
    return doc(db, 'households', householdId, this.collectionName, transactionId);
  }

  private parse(data: DocumentData): Transaction {
    return TransactionSchema.parse(data);
  }

  async create(householdId: string, data: Omit<Transaction, 'id' | 'createdAt'>): Promise<string> {
    const docRef = doc(this.getCollectionRef(householdId));
    const id = docRef.id;

    const newTransaction = {
      ...data,
      id,
      createdAt: serverTimestamp(),
      // Ensure date is Timestamp if it's a Date
      date: data.date instanceof Date ? Timestamp.fromDate(data.date) : data.date,
    };

    await setDoc(docRef, newTransaction as WithFieldValue<DocumentData>);
    return id;
  }

  async getById(householdId: string, transactionId: string): Promise<Transaction | null> {
    const docSnap = await getDoc(this.getDocRef(householdId, transactionId));
    if (docSnap.exists()) {
      return this.parse(docSnap.data());
    }
    return null;
  }

  async getAll(householdId: string, constraints: QueryConstraint[] = []): Promise<Transaction[]> {
    const q = query(this.getCollectionRef(householdId), ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => this.parse(doc.data()));
  }

  async update(
    householdId: string,
    transactionId: string,
    updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>,
  ): Promise<void> {
    const docRef = this.getDocRef(householdId, transactionId);
    const processedUpdates = { ...updates } as DocumentData;

    if (processedUpdates.date && processedUpdates.date instanceof Date) {
      processedUpdates.date = Timestamp.fromDate(processedUpdates.date);
    }

    await updateDoc(docRef, processedUpdates);
  }

  async delete(householdId: string, transactionId: string): Promise<void> {
    await deleteDoc(this.getDocRef(householdId, transactionId));
  }
}

export const transactionRepository = new TransactionRepository();
