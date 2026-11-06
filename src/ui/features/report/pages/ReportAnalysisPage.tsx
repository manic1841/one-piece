import { type MouseEvent } from 'react';

import { Link, useNavigate } from 'react-router-dom';

import { EmptyState } from '@/ui/components/EmptyState';
import { LoadErrorAlert } from '@/ui/components/LoadErrorAlert';
import { PageHeader } from '@/ui/components/PageHeader';
import { Skeleton } from '@/ui/components/Skeleton';
import { REPORT_ANALYSIS_LABELS } from '@/ui/constants/report/reportCenterLabels';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { AnalysisContent } from '@/ui/features/report/components/AnalysisContent';
import { ANALYSIS_SECTIONS, groupSections } from '@/ui/features/report/components/analysisChart';
import { useFinancialAnalysis } from '@/ui/features/report/hooks/useFinancialAnalysis';
import {
  useReportAnalysisUrlState,
  useReportAnalysisUrlSync,
} from '@/ui/features/report/hooks/useReportAnalysisUrlState';

const ReportAnalysisPage: React.FC = () => {
  const { userProfile } = useAuthState();
  const householdId = userProfile?.householdId ?? '';
  const navigate = useNavigate();

  const url = useReportAnalysisUrlState();
  const { range, granularity, selectedPeriod, initialSeries } = url;

  const { analysis, analysisVM, loading, errorMessage, reload } = useFinancialAnalysis(
    householdId,
    range,
    granularity,
    selectedPeriod,
  );

  const { activeSection, changeGranularity } = useReportAnalysisUrlSync(analysis, analysisVM, url);
  const { changeRange, selectYear } = url;

  // A point is a drill-down: it opens that period's report rather than reselecting in place.
  const openPeriod = (period: string) => navigate(`/reports/${period}`);

  const goToSection = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault();
    window.history.replaceState(null, '', `#${id}`);
    const target = document.getElementById(id);
    target?.scrollIntoView({ block: 'start' });
    target?.focus({ preventScroll: true });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={REPORT_ANALYSIS_LABELS.TITLE}
        crumb={
          <Link
            to="/reports"
            className="rounded-sm hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {REPORT_ANALYSIS_LABELS.CRUMB}
          </Link>
        }
      />

      {errorMessage !== null && (
        <LoadErrorAlert
          errorMessage={errorMessage}
          message={REPORT_ANALYSIS_LABELS.LOAD_ERROR}
          retryLabel={REPORT_ANALYSIS_LABELS.RETRY_ACTION}
          onRetry={() => void reload()}
        />
      )}

      {loading && (
        <div role="status" className="space-y-8">
          <span className="sr-only">{REPORT_ANALYSIS_LABELS.LOADING}</span>
          {groupSections(ANALYSIS_SECTIONS).map((row) =>
            row.length === 1 ? (
              <Skeleton key={row[0].id} className="h-56 w-full" />
            ) : (
              <div
                key={row.map((item) => item.id).join('-')}
                className="grid grid-cols-1 gap-y-8 lg:grid-cols-2 lg:gap-x-10"
              >
                {row.map((item) => (
                  <Skeleton key={item.id} className="h-40 w-full" />
                ))}
              </div>
            ),
          )}
        </div>
      )}

      {!loading && errorMessage === null && analysis !== null && analysis.anchor === null && (
        <EmptyState
          title={REPORT_ANALYSIS_LABELS.EMPTY_TITLE}
          description={REPORT_ANALYSIS_LABELS.EMPTY_DESCRIPTION}
        />
      )}

      {!loading && errorMessage === null && analysisVM !== null && analysis?.anchor !== null && (
        <AnalysisContent
          vm={analysisVM}
          activeSection={activeSection}
          initialSeries={initialSeries}
          onRangeChange={changeRange}
          onGranularityChange={changeGranularity}
          onYearChange={selectYear}
          onPointSelect={openPeriod}
          onSectionClick={goToSection}
          onHistoryLink={() => navigate('/reports')}
          onBackToReports={() => navigate('/reports')}
        />
      )}
    </div>
  );
};

export default ReportAnalysisPage;
