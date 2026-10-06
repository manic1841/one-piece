import { type NextMonthDebtDueResult } from '@/application/debt/use_cases/getNextMonthDebtDueUseCase';
import { type CloseStageId, type FinancialPeriod } from '@/domains/financial_period/schemas';
import { type StatusGlyphType } from '@/ui/components/StatusGlyph';
import {
  DASHBOARD_CLOSE_NO_RECORD,
  DASHBOARD_CLOSE_STATUS_GLYPHS,
  DASHBOARD_CLOSE_STATUS_TEXT_MAP,
} from '@/ui/constants/dashboard/monthlyCloseStatus';
import { CLOSE_STAGE_LABELS, CLOSE_STAGE_ORDER } from '@/ui/constants/monthlyClose';
import { formatCurrency, formatYearMonth } from '@/ui/utils';

export type { NextMonthDebtDueResult };

export interface DashboardCloseStageVM {
  stageId: CloseStageId;
  label: string;
  glyphType: StatusGlyphType;
}

export interface DashboardCloseStatusVM {
  yearMonth: string;
  periodText: string;
  glyphType: StatusGlyphType;
  statusText: string;
  completedCount: number;
  totalCount: number;
  nextStageLabel: string | null;
  stages: DashboardCloseStageVM[];
}

export const mapPeriodToCloseStatusVM = (
  period: FinancialPeriod | null,
  yearMonth: string,
): DashboardCloseStatusVM => {
  if (!period) {
    return {
      yearMonth,
      periodText: formatYearMonthOf(yearMonth),
      glyphType: DASHBOARD_CLOSE_NO_RECORD.glyphType,
      statusText: DASHBOARD_CLOSE_NO_RECORD.statusText,
      completedCount: 0,
      totalCount: CLOSE_STAGE_ORDER.length,
      nextStageLabel: null,
      stages: buildStageVMs(null, null),
    };
  }

  const completedCount = CLOSE_STAGE_ORDER.filter(
    (stageId) => period.stages[stageId]?.status === 'COMPLETED',
  ).length;
  const isClosed = period.status === 'CLOSED';
  const nextStageId = isClosed
    ? null
    : CLOSE_STAGE_ORDER.find((stageId) => period.stages[stageId]?.status !== 'COMPLETED');

  return {
    yearMonth: period.yearMonth,
    periodText: formatYearMonthOf(period.yearMonth),
    glyphType: DASHBOARD_CLOSE_STATUS_GLYPHS[period.status],
    statusText: DASHBOARD_CLOSE_STATUS_TEXT_MAP[period.status],
    completedCount: isClosed ? CLOSE_STAGE_ORDER.length : completedCount,
    totalCount: CLOSE_STAGE_ORDER.length,
    nextStageLabel: nextStageId ? CLOSE_STAGE_LABELS[nextStageId] : null,
    stages: buildStageVMs(period, isClosed ? null : (nextStageId ?? null), isClosed),
  };
};

const buildStageVMs = (
  period: FinancialPeriod | null,
  nextStageId: CloseStageId | null,
  isClosed = false,
): DashboardCloseStageVM[] =>
  CLOSE_STAGE_ORDER.map((stageId) => {
    const completed = isClosed || period?.stages[stageId]?.status === 'COMPLETED';
    return {
      stageId,
      label: CLOSE_STAGE_LABELS[stageId],
      glyphType: completed ? 'verified' : stageId === nextStageId ? 'active' : 'waiting',
    };
  });

export const mapNextMonthDueText = (nextMonthDue: NextMonthDebtDueResult | null): string | null => {
  if (!nextMonthDue) {
    return null;
  }
  return formatCurrency(nextMonthDue.total);
};

const formatYearMonthOf = (yearMonth: string): string => {
  const [year, month] = yearMonth.split('-').map(Number);
  return formatYearMonth(year, month);
};
