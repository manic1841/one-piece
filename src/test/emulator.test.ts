import { doc, getDoc, setDoc } from 'firebase/firestore';
import { beforeEach, describe, expect, it } from 'vitest';

import { db, resetMockDb } from './mocks/firebase';

describe('emulator firestore mock', () => {
  beforeEach(async () => {
    await resetMockDb();
  });

  it('writes then reads a document', async () => {
    const testRef = doc(db, 'test-collection/test-doc');
    await setDoc(testRef, { message: 'Hello Emulator' });

    const snap = await getDoc(testRef);
    expect(snap.exists()).toBe(true);
    expect(snap.data()).toEqual({ message: 'Hello Emulator' });
  });

  it('clears data after reset', async () => {
    const testRef = doc(db, 'test-collection/test-doc');
    await setDoc(testRef, { message: 'Temp' });

    await resetMockDb();

    const snap = await getDoc(testRef);
    expect(snap.exists()).toBe(false);
  });
});
