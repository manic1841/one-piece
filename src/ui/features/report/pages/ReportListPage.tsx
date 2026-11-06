import { useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { EmptyState } from '@/ui/components/EmptyState';
import { FilterStrip } from '@/ui/components/FilterStrip';
import { LoadErrorAlert } from '@/ui/components/LoadErrorAlert';
import { PageHeader } from '@/ui/components/PageHeader';
import { PageSection } from '@/ui/components/PageSection';
import { Skeleton } from '@/ui/components/Skeleton';
import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { sectionTitleClass } from '@/ui/components/eyebrow';
import { Button } from '@/ui/components/ui/button';
import {
  REPORT_LIST_LABELS,
  REPORT_SUMMARY_LABELS,
} from '@/ui/constants/report/reportCenterLabels';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { FinancialSummaryKpis } from '@/ui/features/report/components/FinancialSummaryKpis';
import { ReportHistoryTable } from '@/ui/features/report/components/ReportHistoryTable';
import { useReportHistory } from '@/ui/features/report/hooks/useReportHistory';
import { useReportSummary } from '@/ui/features/report/hooks/useReportSummary';
import { type ReportGranularity } from '@/ui/features/report/viewmodels/reportHistory.vm';
import { cn } from '@/ui/utils/cn';

const MODE_ITEMS = [
  { id: 'MONTHLY', label: REPORT_LIST_LABELS.MODE_MONTHLY },
  { id: 'YEARLY', label: REPORT_LIST_LABELS.MODE_YEARLY },
];

const SKELETON_ROWS = [0, 1, 2, 3, 4];

const ReportListPage: React.FC = () => {
  const { userProfile } = useAuthState();
  const householdId = userProfile?.householdId ?? '';
  const [granularity, setGranularity] = useState<ReportGranularity>('MONTHLY');

  const { vm, loading, errorMessage, reload } = useReportHistory(householdId, granularity);
  const {
    summaryVM,
    loading: summaryLoading,
    errorMessage: summaryError,
    reload: reloadSummary,
  } = useReportSummary(householdId);
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <PageHeader title={REPORT_LIST_LABELS.TITLE} description={REPORT_LIST_LABELS.DESCRIPTION} />

      <PageSection
        title={REPORT_SUMMARY_LABELS.SECTION_TITLE}
        spacing="compact"
        action={
          <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
            {summaryVM !== null && (
              <>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {summaryVM.periodText}
                </span>
                {summaryVM.unclosed && (
                  <StatusGlyph type="review" label={REPORT_SUMMARY_LABELS.UNCLOSED} />
                )}
              </>
            )}
            <Button variant="text" onClick={() => navigate('/reports/analysis')}>
              {REPORT_SUMMARY_LABELS.VIEW_ANALYSIS} →
            </Button>
          </div>
        }
      >
        {summaryLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : summaryError !== null ? (
          <LoadErrorAlert
            errorMessage={summaryError}
            message={REPORT_SUMMARY_LABELS.LOAD_ERROR}
            retryLabel={REPORT_SUMMARY_LABELS.RETRY_ACTION}
            onRetry={() => void reloadSummary()}
          />
        ) : summaryVM === null ? (
          <p className="text-sm text-muted-foreground">{REPORT_SUMMARY_LABELS.MISSING}</p>
        ) : (
          <FinancialSummaryKpis vm={summaryVM} />
        )}
      </PageSection>

      {loading && (
        <div role="status" className="space-y-2 py-2">
          <span className="sr-only">{REPORT_LIST_LABELS.LOADING}</span>
          {SKELETON_ROWS.map((row) => (
            <Skeleton key={row} className="h-12" />
          ))}
        </div>
      )}

      {errorMessage && (
        <LoadErrorAlert
          errorMessage={errorMessage}
          message={REPORT_LIST_LABELS.LOAD_ERROR}
          retryLabel={REPORT_LIST_LABELS.RETRY_ACTION}
          onRetry={() => void reload()}
        />
      )}

      {!loading && !errorMessage && (
        <>
          <PageSection>
            <div className="space-y-6">
              <div className="flex items-end justify-between gap-4 border-b border-border">
                <p className={cn(sectionTitleClass, 'pb-2')}>
                  {REPORT_LIST_LABELS.HISTORY_SECTION_TITLE}
                </p>
                <FilterStrip
                  items={MODE_ITEMS}
                  value={granularity}
                  onValueChange={(id) => setGranularity(id as ReportGranularity)}
                  ariaLabel={REPORT_LIST_LABELS.MODE_LABEL}
                />
              </div>
              {vm.rows.length === 0 ? (
                <EmptyState
                  title={REPORT_LIST_LABELS.EMPTY_TITLE}
                  description={REPORT_LIST_LABELS.EMPTY_DESCRIPTION}
                />
              ) : (
                <ReportHistoryTable rows={vm.rows} />
              )}
            </div>
          </PageSection>
        </>
      )}
    </div>
  );
};

export default ReportListPage;
