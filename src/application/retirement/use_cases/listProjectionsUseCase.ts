import { withReadPermission } from '@/application/common/readGuard';
import { type AuthContext } from '@/application/types';
import {
  type ProjectionDocument,
  projectionRepository,
} from '@/infra/repositories/projectionRepository';

export type { ProjectionDocument } from '@/domains/retirement/schemas';

interface ListProjectionsRequest {
  householdId: string;
  auth: AuthContext;
}

export class ListProjectionsUseCase {
  async execute(request: ListProjectionsRequest): Promise<ProjectionDocument[]> {
    const { householdId, auth } = request;

    return withReadPermission(householdId, auth, () =>
      projectionRepository.listProjections(householdId),
    );
  }
}

export const listProjectionsUseCase = new ListProjectionsUseCase();
