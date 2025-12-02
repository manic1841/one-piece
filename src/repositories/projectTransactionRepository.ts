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
  type Transaction as FirestoreTransaction,
} from 'firebase/firestore';
import { db } from '../firebase';
import { ProjectTransactionSchema, type ProjectTransaction } from '../schemas';

class ProjectTransactionRepository {
  private readonly collectionName = 'projectTransactions';

  private getCollectionRef(householdId: string) {
    return collection(db, 'households', householdId, this.collectionName);
  }

  private getDocRef(householdId: string, transactionId: string) {
    return doc(db, 'households', householdId, this.collectionName, transactionId);
  }

  private parse(data: DocumentData): ProjectTransaction {
    return ProjectTransactionSchema.parse(data);
  }

  async create(
    householdId: string,
    data: WithFieldValue<Omit<ProjectTransaction, 'id' | 'createdAt'>>,
    transaction?: FirestoreTransaction,
  ): Promise<string> {
    const docRef = doc(this.getCollectionRef(householdId));
    const id = docRef.id;

    // Convert date to Firestore Timestamp if it's a Date object
    const date = data.date instanceof Date ? Timestamp.fromDate(data.date) : data.date;

    const newTransaction = {
      ...data,
      id,
      date,
      createdAt: serverTimestamp(),
    };

    if (transaction) {
      transaction.set(docRef, newTransaction as WithFieldValue<DocumentData>);
    } else {
      await setDoc(docRef, newTransaction as WithFieldValue<DocumentData>);
    }

    return id;
  }

  async getById(householdId: string, transactionId: string): Promise<ProjectTransaction | null> {
    const docSnap = await getDoc(this.getDocRef(householdId, transactionId));
    if (docSnap.exists()) {
      return this.parse(docSnap.data());
    }
    return null;
  }

  async getAll(
    householdId: string,
    constraints: QueryConstraint[] = [],
  ): Promise<ProjectTransaction[]> {
    const q = query(this.getCollectionRef(householdId), ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => this.parse(doc.data()));
  }

  async update(
    householdId: string,
    transactionId: string,
    updates: WithFieldValue<Partial<Omit<ProjectTransaction, 'id' | 'createdAt' | 'createdBy'>>>,
  ): Promise<void> {
    const docRef = this.getDocRef(householdId, transactionId);
    const processedUpdates = { ...updates } as DocumentData;

    // Convert Date to Timestamp if needed
    if (processedUpdates.date && processedUpdates.date instanceof Date) {
      processedUpdates.date = Timestamp.fromDate(processedUpdates.date);
    }

    await updateDoc(docRef, processedUpdates);
  }

  async delete(
    householdId: string,
    transactionId: string,
    transaction?: FirestoreTransaction,
  ): Promise<void> {
    const docRef = this.getDocRef(householdId, transactionId);

    if (transaction) {
      transaction.delete(docRef);
    } else {
      await deleteDoc(docRef);
    }
  }

  async deleteMultiple(
    householdId: string,
    transactionIds: string[],
    transaction?: FirestoreTransaction,
  ): Promise<void> {
    if (transactionIds.length === 0) return;

    if (transaction) {
      for (const id of transactionIds) {
        const docRef = this.getDocRef(householdId, id);
        transaction.delete(docRef);
      }
    } else {
      for (const id of transactionIds) {
        const docRef = this.getDocRef(householdId, id);
        await deleteDoc(docRef);
      }
    }
  }

  // Get document reference (useful for transactions)
  getDocRefForTransaction(householdId: string, transactionId?: string) {
    if (transactionId) {
      return this.getDocRef(householdId, transactionId);
    }
    return doc(this.getCollectionRef(householdId));
  }
}

export const projectTransactionRepository = new ProjectTransactionRepository();
