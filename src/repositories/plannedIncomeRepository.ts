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
import { PlannedIncomeSchema, type PlannedIncome } from '../schemas';

class PlannedIncomeRepository {
  private readonly collectionName = 'plannedIncome';

  private getCollectionRef(householdId: string) {
    return collection(db, 'households', householdId, this.collectionName);
  }

  private getDocRef(householdId: string, plannedIncomeId: string) {
    return doc(db, 'households', householdId, this.collectionName, plannedIncomeId);
  }

  private parse(data: DocumentData): PlannedIncome {
    return PlannedIncomeSchema.parse(data);
  }

  async create(
    householdId: string,
    data: WithFieldValue<Omit<PlannedIncome, 'id' | 'createdAt'>>,
  ): Promise<string> {
    const docRef = doc(this.getCollectionRef(householdId));
    const id = docRef.id;

    const newPlannedIncome = {
      ...data,
      id,
      createdAt: serverTimestamp(),
    };

    await setDoc(docRef, newPlannedIncome as WithFieldValue<DocumentData>);
    return id;
  }

  async getById(householdId: string, plannedIncomeId: string): Promise<PlannedIncome | null> {
    const docSnap = await getDoc(this.getDocRef(householdId, plannedIncomeId));
    if (docSnap.exists()) {
      return this.parse(docSnap.data());
    }
    return null;
  }

  async getAll(householdId: string, constraints: QueryConstraint[] = []): Promise<PlannedIncome[]> {
    const q = query(this.getCollectionRef(householdId), ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => this.parse(doc.data()));
  }

  async update(
    householdId: string,
    plannedIncomeId: string,
    updates: WithFieldValue<Partial<Omit<PlannedIncome, 'id' | 'createdAt'>>>,
  ): Promise<void> {
    const docRef = this.getDocRef(householdId, plannedIncomeId);
    const processedUpdates = { ...updates } as DocumentData;

    // Convert Date objects to Timestamps if needed
    if (processedUpdates.date && processedUpdates.date instanceof Date) {
      processedUpdates.date = Timestamp.fromDate(processedUpdates.date);
    }

    await updateDoc(docRef, processedUpdates);
  }

  async delete(householdId: string, plannedIncomeId: string): Promise<void> {
    await deleteDoc(this.getDocRef(householdId, plannedIncomeId));
  }

  // Get document reference (useful for transactions)
  getDocRefForTransaction(householdId: string, plannedIncomeId?: string) {
    if (plannedIncomeId) {
      return this.getDocRef(householdId, plannedIncomeId);
    }
    return doc(this.getCollectionRef(householdId));
  }
}

export const plannedIncomeRepository = new PlannedIncomeRepository();
