import { z } from 'zod';

import {
  PortfolioCreateSchema,
  PortfolioSchema,
  PortfolioSnapshotCreateSchema,
  PortfolioSnapshotSchema,
} from '../schemas';

export type Portfolio = z.infer<typeof PortfolioSchema>;
export type PortfolioCreate = z.infer<typeof PortfolioCreateSchema>;
export type PortfolioSnapshot = z.infer<typeof PortfolioSnapshotSchema>;
export type PortfolioSnapshotCreate = z.infer<typeof PortfolioSnapshotCreateSchema>;
