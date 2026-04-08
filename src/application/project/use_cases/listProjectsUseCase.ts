import { orderBy } from 'firebase/firestore';

import { type Project } from '@/domains/project/schemas';
import { projectRepository } from '@/infra/repositories/projectRepository';

export interface ListProjectsRequest {
  householdId: string;
}

export class ListProjectsUseCase {
  async execute(request: ListProjectsRequest): Promise<Project[]> {
    const { householdId } = request;
    return await projectRepository.list([householdId], [orderBy('order', 'asc')]);
  }
}

export const listProjectsUseCase = new ListProjectsUseCase();
