import { QueryConstraint, orderBy, where } from 'firebase/firestore';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { type PortfolioSnapshot } from '@/domains/portfolio/types/portfolio';
import { portfolioSnapshotRepository } from '@/infra/repositories/portfolioSnapshotRepository';

export interface ListPortfolioSnapshotsRequest {
  householdId: string;
  portfolioId: string;
  year?: number;
  month?: number;
  auth?: AuthContext;
}

export class ListPortfolioSnapshotsUseCase {
  async execute(request: ListPortfolioSnapshotsRequest): Promise<PortfolioSnapshot[]> {
    const { householdId, portfolioId, year, month, auth } = request;
    if (auth) {
      await householdPermissionService.assertReadPermission(
        householdId,
        auth.uid,
        auth.isGlobalAdmin,
      );
    }
    const queryConstraints: QueryConstraint[] = [];
    if (year) {
      queryConstraints.push(where('year', '==', year));
    }
    if (month) {
      queryConstraints.push(where('month', '==', month));
    }
    queryConstraints.push(orderBy('year', 'desc'), orderBy('month', 'desc'));
    return portfolioSnapshotRepository.list([householdId, portfolioId], queryConstraints);
  }
}

export const listPortfolioSnapshotsUseCase = new ListPortfolioSnapshotsUseCase();
