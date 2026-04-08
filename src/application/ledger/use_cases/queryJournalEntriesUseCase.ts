import { type QueryConstraint, orderBy, where } from 'firebase/firestore';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { type JournalEntryLine } from '@/domains/ledger/schemas';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

export interface QueryJournalEntriesRequest {
  householdId: string;
  accountId?: string;
  ledgerCode?: string;
  startDate?: Date;
  endDate?: Date;
  auth: AuthContext;
}

export interface FlattenedJournalEntry extends JournalEntryLine {
  transactionId: string;
  date: Date;
  description: string;
}

export class QueryJournalEntriesUseCase {
  async execute(request: QueryJournalEntriesRequest): Promise<FlattenedJournalEntry[]> {
    const { householdId, accountId, ledgerCode, startDate, endDate, auth } = request;

    await householdPermissionService.assertReadPermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );
    const constraints: QueryConstraint[] = [orderBy('date', 'desc')];

    if (accountId) {
      constraints.push(where('accountIds', 'array-contains', accountId));
    }

    if (ledgerCode) {
      constraints.push(where('ledgerCodes', 'array-contains', ledgerCode));
    }

    if (startDate) {
      constraints.push(where('date', '>=', startDate));
    }

    if (endDate) {
      constraints.push(where('date', '<=', endDate));
    }

    const transactions = await transactionRepository.list([householdId], constraints);

    // Flatten entries and filter by accountId/ledgerCode if provided
    const flattened: FlattenedJournalEntry[] = [];
    for (const tx of transactions) {
      for (const entry of tx.entries) {
        if (accountId && entry.accountId !== accountId) continue;
        if (ledgerCode && entry.ledgerCode !== ledgerCode) continue;

        flattened.push({
          ...entry,
          transactionId: tx.id,
          date: tx.date,
          description: tx.description || '',
        });
      }
    }

    return flattened;
  }
}

export const queryJournalEntriesUseCase = new QueryJournalEntriesUseCase();
