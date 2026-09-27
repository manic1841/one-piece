import { collection, doc } from 'firebase/firestore';

import { UserProfileSchema } from '@/domains/auth/user/schemas';
import { type UserProfile } from '@/domains/auth/user/types';
import { db } from '@/firebase';
import { BaseRepository } from '@/infra/repositories/baseRepository';

class UserRepository extends BaseRepository<UserProfile, [string?]> {
  private readonly collectionName = 'users';

  protected getCollectionRef() {
    return collection(this.db, this.collectionName);
  }

  protected getDocRef(uid?: string) {
    if (!uid) throw new Error('UserRepository requires a uid to get a document reference');
    return doc(this.db, this.collectionName, uid);
  }

  protected getDomainSchema() {
    return UserProfileSchema;
  }
}

export const userRepository = new UserRepository(db);
