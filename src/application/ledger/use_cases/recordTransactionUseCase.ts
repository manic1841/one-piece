import { runTransaction, where } from 'firebase/firestore';

import { db } from '@/firebase';
import { intentMappingRepository } from '@/infra/repositories/intentMappingRepository';
import { transactionRepository } from '@/infra/repositories/transactionRepository';
import { type TransactionCreate } from '@/infra/schemas/ledger';
import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';

export interface RecordTransactionRequest {
  householdId: string;
  transactions: TransactionCreate[];
  userEmail: string;
  auth: AuthContext;
}

export class RecordTransactionUseCase {
  async execute(request: RecordTransactionRequest): Promise<string[]> {
    const { householdId, transactions, userEmail, auth } = request;

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );
    const transactionIds: string[] = [];

    await runTransaction(db, async (tx) => {
      for (const tData of transactions) {
        // 1. Fetch Intent Mapping
        const mappings = await intentMappingRepository.list(
          [householdId],
          [where('intent', '==', tData.intent)],
        );
        if (mappings.length === 0) {
          throw new Error(`Intent mapping not found for intent: ${tData.intent}`);
        }
        const mapping = mappings[0];

        // 2. Build entries based on Mapping
        // Simple logic: debit the debit ledger, credit the credit ledger
        // We might need to determine which side gets the accountId. 
        // For now, if it's an expense, debit is usually the expense category (ledgerCode only), 
        // and credit is the bank account (ledgerCode + accountId).
        const entries = [
          {
            ledgerCode: mapping.debitLedgerCode,
            debit: tData.amount || 0,
            credit: 0,
          },
          {
            ledgerCode: mapping.creditLedgerCode,
            debit: 0,
            credit: tData.amount || 0,
          },
        ];

        // 3. Create Transaction Record with embedded entries
        const transactionId = await transactionRepository.create(
          [householdId],
          {
            ...tData,
            entries,
          },
          userEmail,
          tx,
        );
        transactionIds.push(transactionId);
      }
    });

    return transactionIds;
  }
}

export const recordTransactionUseCase = new RecordTransactionUseCase();
