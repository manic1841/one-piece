import type { FieldValue } from 'firebase/firestore';

import { auditFields, splitYearMonth } from './audit';

export interface ProjectDoc {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  category: string;
  isActive: boolean;
  order: number;
  createdAt: FieldValue;
  updatedAt: FieldValue;
  createdBy: string;
  updatedBy: string;
}

export interface ProjectSnapshotDoc {
  id: string;
  year: number;
  month: number;
  openingBalance: number;
  income: number;
  expense: number;
  closingBalance: number;
  createdAt: FieldValue;
  updatedAt: FieldValue;
  createdBy: string;
  updatedBy: string;
}

export const buildProject = (id: string, overrides: Partial<ProjectDoc> = {}): ProjectDoc => ({
  id,
  name: `Project ${id}`,
  description: '',
  color: '#000000',
  icon: 'default',
  category: 'OPERATING',
  isActive: true,
  order: 0,
  ...auditFields(),
  ...overrides,
});

export const buildProjectSnapshot = (
  yearMonth: string,
  overrides: Partial<ProjectSnapshotDoc> = {},
): ProjectSnapshotDoc => ({
  id: yearMonth,
  ...splitYearMonth(yearMonth),
  openingBalance: 0,
  income: 0,
  expense: 0,
  closingBalance: 0,
  ...auditFields(),
  ...overrides,
});
