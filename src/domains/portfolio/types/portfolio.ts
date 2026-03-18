import { z } from 'zod';

import {
  PortfolioAccountSnapshotSchema,
  PortfolioCashFlowSchema,
  PortfolioCreateSchema,
  PortfolioPerformanceSchema,
  PortfolioSchema,
  PortfolioSnapshotCreateSchema,
  PortfolioSnapshotSchema,
} from '../schemas';

export type Portfolio = z.infer<typeof PortfolioSchema>;
export type PortfolioCreate = z.infer<typeof PortfolioCreateSchema>;
export type PortfolioSnapshot = z.infer<typeof PortfolioSnapshotSchema>;
export type PortfolioSnapshotCreate = z.infer<typeof PortfolioSnapshotCreateSchema>;
export type PortfolioAccountSnapshot = z.infer<typeof PortfolioAccountSnapshotSchema>;
export type PortfolioPerformance = z.infer<typeof PortfolioPerformanceSchema>;
export type PortfolioCashFlow = z.infer<typeof PortfolioCashFlowSchema>;

export interface PortfolioFormData {
  name: string;
  description?: string;
  accountIds: string[];
  isActive: boolean;
  order: number;
}

export interface PortfolioSnapshotFormData {
  year: number;
  month: number;
  deposits: number;
  withdrawals: number;
}

export interface PortfolioListItemViewModel {
  id: string;
  name: string;
  description?: string;
  totalValue: number;
  asOfDate?: string;
  accountCount: number;
  isActive: boolean;
  order: number;
}

export interface PortfolioDetailViewModel {
  id: string;
  name: string;
  description?: string;
  accountIds: string[];
  isActive: boolean;
  order: number;
  history: PortfolioSnapshot[];
  latestSnapshot: PortfolioSnapshot | null;
}
