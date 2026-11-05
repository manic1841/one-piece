import { type ReactNode, useEffect, useState } from 'react';

import { useNavigate, useSearchParams } from 'react-router-dom';

import { EmptyState } from '@/ui/components/EmptyState';
import { FilterStrip } from '@/ui/components/FilterStrip';
import { PageHeader } from '@/ui/components/PageHeader';
import { PageSection } from '@/ui/components/PageSection';
import { Skeleton } from '@/ui/components/Skeleton';
import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import {
  ANALYSIS_ANCHORS,
  REPORT_ANALYSIS_LABELS,
} from '@/ui/constants/report/reportCenterLabels';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { IncomeSavingsChart } from '@/ui/features/report/components/IncomeSavingsChart';
import { NetCashFlowChart } from '@/ui/features/report/components/NetCashFlowChart';
import { NetWorthTrendChart } from '@/ui/features/report/components/NetWorthTrendChart';
import { useFinancialAnalysis } from '@/ui/features/report/hooks/useFinancialAnalysis';
import {
  type AnalysisRange,
  type NetWorthSeriesKey,
} from '@/ui/features/report/viewmodels/reportAnalysis.vm';

const RANGES: readonly AnalysisRange[] = ['1y', '3y', '5y', 'all'];
const DEFAULT_RANGE: AnalysisRange = '3y';

const parseRange = (raw: string | null): AnalysisRange =>
  raw !== null && (RANGES as readonly string[]).includes(raw) ? (raw as AnalysisRange) : DEFAULT_RANGE;

const parseSeries = (raw: string | null): NetWorthSeriesKey[] => {
  if (raw === 'assets') return ['assets'];
  if (raw === 'debt') return ['liabilities'];
  return [];
};

interface AnalysisSectionProps {
  id: string;
  title: string;
  latestText: string | null;
  insufficient: boolean;
  children: ReactNode;
}

const AnalysisSection: React.FC<AnalysisSectionProps> = ({
  id,
  title,
  latestText,
  insufficient,
  children,
}) => (
  <div id={id} className="scroll-mt-24">
    <PageSection
      title={title}
      spacing="compact"
      action={
        latestText === null ? undefined : (
          <span className="font-mono text-xs tabular-nums text-muted-foreground">{latestText}</span>
        )
      }
    >
      {insufficient ? (
        <p className="py-6 text-sm text-muted-foreground">{REPORT_ANALYSIS_LABELS.INSUFFICIENT}</p>
      ) : (
        children
      )}
    </PageSection>
  </div>
);

const ReportAnalysisPage: React.FC = () => {
  const { userProfile } = useAuthState();
  const householdId = userProfile?.householdId ?? '';
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const range = parseRange(searchParams.get('range'));
  const [initialSeries] = useState(() => parseSeries(searchParams.get('series')));

  const { analysis, analysisVM, loading, errorMessage, reload } = useFinancialAnalysis(
    householdId,
    range,
  );

  // The anchored sections only exist once the analysis resolves, so re-run on new data.
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash === '' || analysis === null) return;
    document.getElementById(hash)?.scrollIntoView?.({ block: 'start' });
  }, [analysis]);

  const changeRange = (next: string) => {
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current);
        params.set('range', next);
        return params;
      },
      { replace: true },
    );
  };

  const openReport = (yearMonth: string) => navigate(`/reports/${yearMonth}`);

  return (
    <div className="space-y-8">
      <PageHeader
        title={REPORT_ANALYSIS_LABELS.TITLE}
        crumb={REPORT_ANALYSIS_LABELS.CRUMB}
        onBack={() => navigate('/reports')}
        description={analysisVM?.description}
      />

      {errorMessage !== null && (
        <Alert variant="warning">
          <AlertDescription>{REPORT_ANALYSIS_LABELS.LOAD_ERROR}</AlertDescription>
          <Button variant="text" className="ml-auto shrink-0" onClick={() => void reload()}>
            {REPORT_ANALYSIS_LABELS.RETRY_ACTION}
          </Button>
        </Alert>
      )}

      {loading && (
        <div role="status" className="space-y-4">
          <span className="sr-only">{REPORT_ANALYSIS_LABELS.LOADING}</span>
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      {!loading && errorMessage === null && analysis !== null && analysis.anchor === null && (
        <EmptyState
          title={REPORT_ANALYSIS_LABELS.EMPTY_TITLE}
          description={REPORT_ANALYSIS_LABELS.EMPTY_DESCRIPTION}
        />
      )}

      {!loading &&
        errorMessage === null &&
        analysisVM !== null &&
        analysis?.anchor !== null &&
        analysis !== null && (
          <>
            <div className="space-y-2">
              {analysisVM.showRangeControl && (
                <FilterStrip
                  items={analysisVM.rangeItems}
                  value={analysisVM.range}
                  onValueChange={changeRange}
                  ariaLabel={REPORT_ANALYSIS_LABELS.RANGE_LABEL}
                />
              )}
              {analysisVM.unclosedNote !== null && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <StatusGlyph type="review" label={analysisVM.unclosedNote.text} />
                  {analysisVM.unclosedNote.showHistoryLink && (
                    <Button variant="text" onClick={() => navigate('/reports')}>
                      {REPORT_ANALYSIS_LABELS.UNCLOSED_HISTORY_LINK}
                    </Button>
                  )}
                </div>
              )}
            </div>

            <AnalysisSection
              id={ANALYSIS_ANCHORS.NET_WORTH}
              title={REPORT_ANALYSIS_LABELS.NET_WORTH_SECTION}
              latestText={analysisVM.netWorth.latestText}
              insufficient={analysisVM.netWorth.insufficient}
            >
              <NetWorthTrendChart
                points={analysisVM.netWorth.points}
                initialSeries={initialSeries}
                onPointActivate={openReport}
              />
            </AnalysisSection>

            <div className="grid grid-cols-1 lg:grid-cols-2">
              <AnalysisSection
                id={ANALYSIS_ANCHORS.INCOME}
                title={REPORT_ANALYSIS_LABELS.INCOME_SECTION}
                latestText={analysisVM.income.latestText}
                insufficient={analysisVM.income.insufficient}
              >
                <IncomeSavingsChart
                  points={analysisVM.income.points}
                  onPointActivate={openReport}
                />
              </AnalysisSection>

              <AnalysisSection
                id={ANALYSIS_ANCHORS.CASH_FLOW}
                title={REPORT_ANALYSIS_LABELS.CASH_FLOW_SECTION}
                latestText={analysisVM.cashFlow.latestText}
                insufficient={analysisVM.cashFlow.insufficient}
              >
                <NetCashFlowChart
                  points={analysisVM.cashFlow.points}
                  onPointActivate={openReport}
                />
                <p className="mt-3 text-xs text-muted-foreground">
                  {REPORT_ANALYSIS_LABELS.CASH_FLOW_HINT}
                </p>
              </AnalysisSection>
            </div>

            <div>
              <Button variant="text" onClick={() => navigate('/reports')}>
                {REPORT_ANALYSIS_LABELS.BACK} →
              </Button>
            </div>
          </>
        )}
    </div>
  );
};

export default ReportAnalysisPage;
