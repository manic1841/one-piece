import { getAccountsUseCase } from './getAccountsUseCase';
import { getLatestSnapshotUseCase } from './getLatestSnapshotUseCase';
import { type AuthContext } from '@/application/types';

export interface GetTotalAssetsRequest {
  householdId: string;
  auth: AuthContext;
}

export class GetTotalAssetsUseCase {
  async execute(request: GetTotalAssetsRequest): Promise<number> {
    const { householdId, auth } = request;

    const accounts = await getAccountsUseCase.execute({ householdId, auth });
    let total = 0;

    for (const account of accounts) {
      const latest = await getLatestSnapshotUseCase.execute({
        householdId,
        accountId: account.id,
        auth,
      });
      total += latest ? latest.amount : 0;
    }

    return total;
  }
}

export const getTotalAssetsUseCase = new GetTotalAssetsUseCase();
