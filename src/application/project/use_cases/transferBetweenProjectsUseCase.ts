import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

export interface TransferBetweenProjectsInput {
  fromProjectId: string;
  toProjectId: string;
  amount: number;
  date?: Date;
  description?: string;
}

export interface TransferBetweenProjectsRequest {
  householdId: string;
  input: TransferBetweenProjectsInput;
  userEmail: string;
  auth: AuthContext;
}

export class TransferBetweenProjectsUseCase {
  async execute(request: TransferBetweenProjectsRequest): Promise<void> {
    const { householdId, input, userEmail, auth } = request;
    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const { fromProjectId, toProjectId, amount, date, description } = input;

    if (amount <= 0) {
      throw new Error('Transfer amount must be greater than zero.');
    }

    if (fromProjectId === toProjectId) {
      throw new Error('Source and target projects must be different.');
    }

    await transactionRepository.create(
      [householdId],
      {
        date: date ?? new Date(),
        description: description ?? 'Project Transfer',
        intentType: 'TRANSFER',
        amount,
        fromProjectId,
        toProjectId,
        createdBy: userEmail,
        entries: [],
      },
      userEmail,
    );
  }
}

export const transferBetweenProjectsUseCase = new TransferBetweenProjectsUseCase();
