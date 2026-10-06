import { type Portfolio } from '@/domains/portfolio/types/portfolio';

/** Missing-value placeholder shared by the portfolio view-models. */
export const EMPTY_TEXT = '—';

/** A portfolio participates in totals and aggregates unless explicitly deactivated. */
export const isPortfolioActive = (portfolio: Portfolio): boolean => portfolio.isActive !== false;
