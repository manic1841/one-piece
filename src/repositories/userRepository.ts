import { db } from '@/firebase';
import { BaseRepository } from '@/repositories/baseRepository';
import { type UserProfile, UserProfileSchema } from '@/schemas';
import { collection, doc } from 'firebase/firestore';

class UserRepository extends BaseRepository<UserProfile, [string?]> {
  private readonly collectionName = 'users';

  protected getCollectionRef() {
    return collection(this.db, this.collectionName);
  }

  protected getDocRef(householdId: string) {
    return doc(this.db, this.collectionName, householdId);
  }

  protected getDomainSchema() {
    return UserProfileSchema;
  }
}

export const userRepository = new UserRepository(db);
