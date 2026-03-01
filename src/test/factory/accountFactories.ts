import type { AccountSnapshot } from '@/schemas/account';

// Factory: AccountSnapshot
export function createAccountSnapshot(overrides?: Partial<AccountSnapshot>): AccountSnapshot {
  return {
    id: 'account-test-1',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    amount: 10000,
    createdBy: 'test-user',
    createdAt: new Date(),
    updatedAt: new Date(),
    updatedBy: 'test-user',
    ...overrides,
  };
}

// Batch Factory: Create multiple AccountSnapshots
export function createAccountSnapshots(
  count: number,
  overrides?: Partial<AccountSnapshot>,
): AccountSnapshot[] {
  return Array.from({ length: count }, (_, i) =>
    createAccountSnapshot({
      id: `account-test-${i + 1}`,
      ...overrides,
    }),
  );
}
