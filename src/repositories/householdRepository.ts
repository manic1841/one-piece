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
  type DocumentData,
  type WithFieldValue,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '../firebase';
import { HouseholdSchema, type Household } from '../schemas';

class HouseholdRepository {
  private readonly collectionName = 'households';

  private getCollectionRef() {
    return collection(db, this.collectionName);
  }

  private getDocRef(householdId: string) {
    return doc(db, this.collectionName, householdId);
  }

  private parse(data: DocumentData): Household {
    return HouseholdSchema.parse(data);
  }

  async create(data: WithFieldValue<Omit<Household, 'id' | 'createdAt'>>): Promise<string> {
    const docRef = doc(this.getCollectionRef());
    const id = docRef.id;

    const newHousehold = {
      ...data,
      id,
      createdAt: serverTimestamp(),
    };

    await setDoc(docRef, newHousehold as WithFieldValue<DocumentData>);
    return id;
  }

  async getById(householdId: string): Promise<Household | null> {
    const docSnap = await getDoc(this.getDocRef(householdId));
    if (docSnap.exists()) {
      return this.parse(docSnap.data());
    }
    return null;
  }

  async getAll(constraints: QueryConstraint[] = []): Promise<Household[]> {
    const q = query(this.getCollectionRef(), ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => this.parse(doc.data()));
  }

  async update(
    householdId: string,
    updates: WithFieldValue<Partial<Omit<Household, 'id' | 'createdAt'>>>,
  ): Promise<void> {
    const docRef = this.getDocRef(householdId);
    await updateDoc(docRef, updates as DocumentData);
  }

  async delete(householdId: string): Promise<void> {
    await deleteDoc(this.getDocRef(householdId));
  }
}

export const householdRepository = new HouseholdRepository();
