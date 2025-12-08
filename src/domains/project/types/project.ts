import { type Project, type ProjectSnapshot } from '@/domains/project/types';

export type ProjectWithSnapshot = Project & { snapshot: ProjectSnapshot | null };
