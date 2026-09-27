import { type FinancialPeriodStatus } from '@/domains/financial_period/schemas';
import { type StatusGlyphType } from '@/ui/components/StatusGlyph';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';

export const DASHBOARD_CLOSE_LABELS = {
  SECTION_TITLE: 'MONTHLY CLOSE',
  ENTRY_HINT: '月度關帳工作流程',
} as const;

const DASHBOARD_CLOSE_STATUS_TEXT_MAP: Record<FinancialPeriodStatus, string> = {
  OPEN: MONTHLY_CLOSE_LABELS.NOT_STARTED,
  IN_PROGRESS: MONTHLY_CLOSE_LABELS.IN_PROGRESS,
  NEEDS_REVIEW: MONTHLY_CLOSE_LABELS.NEEDS_REVIEW,
  CLOSED: MONTHLY_CLOSE_LABELS.CLOSED,
};

export { DASHBOARD_CLOSE_STATUS_TEXT_MAP };

export const DASHBOARD_CLOSE_STATUS_GLYPHS: Record<FinancialPeriodStatus, StatusGlyphType> = {
  OPEN: 'waiting',
  IN_PROGRESS: 'active',
  NEEDS_REVIEW: 'review',
  CLOSED: 'verified',
};

export const DASHBOARD_CLOSE_NO_RECORD = {
  glyphType: 'waiting',
  statusText: MONTHLY_CLOSE_LABELS.NOT_STARTED,
} as const;
