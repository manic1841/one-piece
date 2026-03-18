import { LedgerValidator } from '@/domains/ledger/validator';
import { transactionRepository } from '@/infra/repositories/transactionRepository';
import { type TransactionCreate } from '@/infra/schemas/ledger';

export interface CreateTransactionRequest {
  householdId: string;
  data: TransactionCreate;
  userEmail: string;
}

export class CreateTransactionUseCase {
  async execute(request: CreateTransactionRequest): Promise<string> {
    const { householdId, data, userEmail } = request;

    // Domain Business Rule Validation
    const validationErrors = LedgerValidator.validateTransaction(data);
    if (validationErrors.length > 0) {
      throw new Error(`Invalid transaction: ${validationErrors.join(', ')}`);
    }

    const transactionId = await transactionRepository.create([householdId], data, userEmail);

    return transactionId;
  }
}

export const createTransactionUseCase = new CreateTransactionUseCase();
