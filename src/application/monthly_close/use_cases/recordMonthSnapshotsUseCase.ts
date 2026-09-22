import { batchRecordSnapshotsUseCase } from '@/application/account/use_cases/batchRecordSnapshotsUseCase';
import { MonthlyCloseCommandError, MonthlyCloseCommandErrorCode } from '@/application/monthly_close/errors';
import { type AuthContext } from '@/application/types';
import { type AccountBalanceInput } from '@/application/monthly_close/use_cases/monthlyCloseRequests';

export interface RecordMonthSnapshotsRequest {
  householdId: string;
  year: number;
  month: number;
  accountBalances: AccountBalanceInput[];
  userEmail: string;
  auth: AuthContext;
}

/**
 * ACCOUNT_BALANCE stage action (spec 05 stage 01): idempotently writes account
 * snapshots from the submitted balances. Snapshots are created only for
 * accounts with input; no zero-value fabrication (ADR-0052).
 */
export class RecordMonthSnapshotsUseCase {
  async execute(request: RecordMonthSnapshotsRequest): Promise<void> {
    const { householdId, year, month, accountBalances, userEmail, auth } = request;
    if (accountBalances.length === 0) {
      throw new MonthlyCloseCommandError(
        MonthlyCloseCommandErrorCode.STAGE_INPUT_REQUIRED,
        'at least one account balance is required',
      );
    }

    await batchRecordSnapshotsUseCase.execute({
      householdId,
      snapshots: accountBalances.map((input) => ({
        accountId: input.accountId,
        data: {
          accountId: input.accountId,
          year,
          month,
          amount: input.amount,
          ...(input.originalAmount !== undefined ? { originalAmount: input.originalAmount } : {}),
          ...(input.exchangeRate !== undefined ? { exchangeRate: input.exchangeRate } : {}),
          ...(input.holdings !== undefined ? { holdings: input.holdings } : {}),
        },
      })),
      userEmail,
      auth,
    });
  }
}
