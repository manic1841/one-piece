import { runTransaction } from 'firebase/firestore';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { DEBT_TYPE_LEDGER_CODE, type DebtAccountCreate } from '@/domains/debt/schemas';
import { IntentType } from '@/domains/ledger/constants';
import { LEDGER_CODES } from '@/domains/ledger/constants';
import { type TransactionCreate } from '@/domains/ledger/schemas';
import { LedgerValidator } from '@/domains/ledger/validator';
import { db } from '@/firebase';
import { debtAccountRepository } from '@/infra/repositories/debtAccountRepository';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

export interface CreateDebtAccountRequest {
  householdId: string;
  data: Omit<DebtAccountCreate, 'linkedLedgerCode'>;
  disbursementDate?: Date;
  disbursementDescription?: string;
  userEmail: string;
  auth: AuthContext;
}

export class CreateDebtAccountUseCase {
  async execute(request: CreateDebtAccountRequest): Promise<string> {
    const { householdId, data, disbursementDate, disbursementDescription, userEmail, auth } =
      request;
    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const payload: DebtAccountCreate = {
      ...data,
      linkedLedgerCode: DEBT_TYPE_LEDGER_CODE[data.type],
      currentBalance: data.originalAmount,
    };

    const borrowTxDate = disbursementDate ?? data.startDate;
    const borrowTxDescription =
      (disbursementDescription || '').trim() || `${payload.name} 借款入帳`;

    return runTransaction(db, async (tx) => {
      const debtAccountId = await debtAccountRepository.createDebtAccount(
        householdId,
        payload,
        userEmail,
        tx,
      );

      const borrowTransactionData: TransactionCreate = {
        date: borrowTxDate,
        description: borrowTxDescription,
        intentType: IntentType.LIABILITY_BORROW,
        amount: payload.originalAmount,
        projectId: null,
        allocationId: null,
        debtAccountId,
        createdBy: userEmail,
        entries: [
          {
            ledgerCode: LEDGER_CODES.ASSET_CASH,
            debit: payload.originalAmount,
            credit: 0,
          },
          {
            ledgerCode: payload.linkedLedgerCode,
            debit: 0,
            credit: payload.originalAmount,
          },
        ],
      };

      const validationErrors = LedgerValidator.validateTransaction(borrowTransactionData);
      if (validationErrors.length > 0) {
        throw new Error(`Invalid liability borrow transaction: ${validationErrors.join(', ')}`);
      }

      await transactionRepository.create([householdId], borrowTransactionData, userEmail, tx);

      return debtAccountId;
    });
  }
}

export const createDebtAccountUseCase = new CreateDebtAccountUseCase();
