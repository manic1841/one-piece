import { limit, orderBy } from 'firebase/firestore';

import { type Project } from '@/domains/project/schemas';
import { projectRepository } from '@/infra/repositories/projectRepository';
import { MASTER_LIST_LIMIT } from '@/shared/readLimits';

export interface ListProjectsRequest {
  householdId: string;
}

export class ListProjectsUseCase {
  async execute(request: ListProjectsRequest): Promise<Project[]> {
    const { householdId } = request;
    // `order` asc plus a cap: a truncated tail loses the bottom of the list only.
    return await projectRepository.list(
      [householdId],
      [orderBy('order', 'asc'), limit(MASTER_LIST_LIMIT)],
    );
  }
}

export const listProjectsUseCase = new ListProjectsUseCase();
