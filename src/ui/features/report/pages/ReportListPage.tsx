import { useState } from 'react';

import { EmptyState } from '@/ui/components/EmptyState';
import { FilterStrip } from '@/ui/components/FilterStrip';
import { Metric, MetricGroup } from '@/ui/components/MetricGroup';
import { PageHeader } from '@/ui/components/PageHeader';
import { PageSection } from '@/ui/components/PageSection';
import { Skeleton } from '@/ui/components/Skeleton';
import { eyebrowClass, sectionTitleClass } from '@/ui/components/eyebrow';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import { REPORT_LIST_LABELS } from '@/ui/constants/report/reportCenterLabels';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { ReportHistoryTable } from '@/ui/features/report/components/ReportHistoryTable';
import { useReportHistory } from '@/ui/features/report/hooks/useReportHistory';
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

  return (
    <div className="space-y-8">
      <PageHeader title={REPORT_LIST_LABELS.TITLE} description={REPORT_LIST_LABELS.DESCRIPTION} />

      {loading && (
        <div role="status" className="space-y-2 py-2">
          <span className="sr-only">{REPORT_LIST_LABELS.LOADING}</span>
          {SKELETON_ROWS.map((row) => (
            <Skeleton key={row} className="h-12" />
          ))}
        </div>
      )}

      {errorMessage && (
        <Alert variant="warning">
          <AlertDescription>{REPORT_LIST_LABELS.LOAD_ERROR}</AlertDescription>
          <Button variant="text" className="ml-auto shrink-0" onClick={() => void reload()}>
            {REPORT_LIST_LABELS.RETRY_ACTION}
          </Button>
        </Alert>
      )}

      {!loading && !errorMessage && (
        <>
          {vm.latest && (
            <PageSection
              title={REPORT_LIST_LABELS.SUMMARY_SECTION_TITLE}
              spacing="compact"
              action={<span className={eyebrowClass}>{vm.latest.display}</span>}
            >
              <MetricGroup columns={3}>
                <Metric
                  testId="report-latest-net-income"
                  label={REPORT_LIST_LABELS.SUMMARY_NET_INCOME}
                  value={vm.latest.netIncomeText}
                  tone={vm.latest.netIncomeTone}
                />
                <Metric
                  testId="report-latest-equity"
                  label={REPORT_LIST_LABELS.SUMMARY_EQUITY}
                  value={vm.latest.equityText}
                />
                <Metric
                  testId="report-latest-cash"
                  label={REPORT_LIST_LABELS.SUMMARY_CASH}
                  value={vm.latest.endingCashText}
                />
              </MetricGroup>
            </PageSection>
          )}

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
