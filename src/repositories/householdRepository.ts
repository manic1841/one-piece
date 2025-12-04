import { collection, doc, type DocumentData, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { HouseholdSchema, type Household } from '../schemas';
import { toDate } from '@/utils/dateUtils';
import { BaseRepository } from './baseRepository';

type HouseholdFirestore = {
  id: string;
  name: string;
  members: Record<
    string,
    {
      role: string;
      joinedAt: Timestamp;
    }
  >;
  createdBy: string;
  createdAt: Timestamp;
  updatedBy: string;
  updatedAt: Timestamp;
};

class HouseholdRepository extends BaseRepository<Household, HouseholdFirestore, [string?]> {
  private readonly collectionName = 'households';

  protected getCollectionRef() {
    return collection(this.db, this.collectionName);
  }

  protected getDocRef(householdId: string) {
    return doc(this.db, this.collectionName, householdId);
  }

  protected toFirestore(entity: Household): HouseholdFirestore {
    const members = Object.entries(entity.members).reduce(
      (acc, [key, value]) => {
        acc[key] = {
          role: value.role,
          joinedAt: Timestamp.fromDate(value.joinedAt),
        };
        return acc;
      },
      {} as Record<string, { role: string; joinedAt: Timestamp }>,
    );

    return {
      ...entity,
      members,
      createdAt: Timestamp.fromDate(entity.createdAt),
      updatedAt: Timestamp.fromDate(entity.updatedAt),
    };
  }

  protected fromFirestore(data: DocumentData): Household {
    const members = Object.entries(data.members).reduce(
      (acc, [key, value]) => {
        const k = key as string;
        const { role, joinedAt } = value as { role: string; joinedAt: Timestamp };
        acc[k] = {
          role,
          joinedAt: toDate(joinedAt),
        };
        return acc;
      },
      {} as Record<string, { role: string; joinedAt: Date }>,
    );
    return HouseholdSchema.parse({
      ...data,
      members,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    });
  }
}

export const householdRepository = new HouseholdRepository(db);
