import { type MouseEvent, type ReactNode, useEffect, useState } from 'react';

import { useNavigate, useSearchParams } from 'react-router-dom';

import { EmptyState } from '@/ui/components/EmptyState';
import { FilterStrip } from '@/ui/components/FilterStrip';
import { LoadErrorAlert } from '@/ui/components/LoadErrorAlert';
import { PageHeader } from '@/ui/components/PageHeader';
import { PageSection } from '@/ui/components/PageSection';
import { Skeleton } from '@/ui/components/Skeleton';
import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { Button } from '@/ui/components/ui/button';
import { ANALYSIS_ANCHORS, REPORT_ANALYSIS_LABELS } from '@/ui/constants/report/reportCenterLabels';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { AssetCompositionChart } from '@/ui/features/report/components/AssetCompositionChart';
import { DebtLeverageChart } from '@/ui/features/report/components/DebtLeverageChart';
import { IncomeSavingsChart } from '@/ui/features/report/components/IncomeSavingsChart';
import { InvestmentPerformanceChart } from '@/ui/features/report/components/InvestmentPerformanceChart';
import { NetCashFlowChart } from '@/ui/features/report/components/NetCashFlowChart';
import { NetWorthTrendChart } from '@/ui/features/report/components/NetWorthTrendChart';
import { useFinancialAnalysis } from '@/ui/features/report/hooks/useFinancialAnalysis';
import {
  ANALYSIS_GRANULARITIES,
  ANALYSIS_RANGES,
  type AnalysisGranularity,
  type AnalysisRange,
  DEFAULT_GRANULARITY,
  DEFAULT_RANGE,
  type NetWorthSeriesKey,
  type SeriesParam,
} from '@/ui/features/report/viewmodels/reportAnalysis.vm';
import { cn } from '@/ui/utils/cn';

const parseRange = (raw: string | null): AnalysisRange =>
  raw !== null && ANALYSIS_RANGES.includes(raw as AnalysisRange)
    ? (raw as AnalysisRange)
    : DEFAULT_RANGE;

const parseGranularity = (raw: string | null): AnalysisGranularity =>
  raw !== null && ANALYSIS_GRANULARITIES.includes(raw as AnalysisGranularity)
    ? (raw as AnalysisGranularity)
    : DEFAULT_GRANULARITY;

const parseSeries = (raw: string | null): NetWorthSeriesKey[] => {
  const series = raw as SeriesParam | null;
  if (series === 'assets') return ['assets'];
  if (series === 'debt') return ['liabilities'];
  return [];
};

interface AnalysisSectionProps {
  id: string;
  title: string;
  latestText: string | null;
  /** One-line methodology note, pinned to the section's bottom so paired bands align. */
  footnote?: string;
  insufficient: boolean;
  children: ReactNode;
}

const AnalysisSection: React.FC<AnalysisSectionProps> = ({
  id,
  title,
  latestText,
  footnote,
  insufficient,
  children,
}) => (
  <div id={id} tabIndex={-1} className="h-full scroll-mt-32 outline-none">
    <PageSection
      title={title}
      spacing="compact"
      hint={latestText ?? undefined}
      className="flex h-full flex-col"
    >
      {insufficient ? (
        <p className="py-6 text-sm text-muted-foreground">{REPORT_ANALYSIS_LABELS.INSUFFICIENT}</p>
      ) : (
        children
      )}
      {footnote !== undefined && (
        <p className="mt-auto pt-3 text-xs text-muted-foreground">{footnote}</p>
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
  const granularity = parseGranularity(searchParams.get('granularity'));
  const selectedPeriod = searchParams.get('period');
  const [initialSeries] = useState(() => parseSeries(searchParams.get('series')));
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const { analysis, analysisVM, loading, errorMessage, reload } = useFinancialAnalysis(
    householdId,
    range,
    granularity,
    selectedPeriod,
  );

  // The anchored sections only exist once the analysis resolves, so re-run on new data.
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash === '' || analysis === null) return;
    document.getElementById(hash)?.scrollIntoView?.({ block: 'start' });
  }, [analysis]);

  // Highlight the section crossing the upper third of the viewport.
  useEffect(() => {
    if (analysisVM === null) return;
    const sections = analysisVM.indexItems
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => element !== null);
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible !== undefined) setActiveSection(visible.target.id);
      },
      { rootMargin: '-30% 0px -60% 0px' },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [analysisVM]);

  // Keep the active tab reachable when the index overflows on narrow screens.
  useEffect(() => {
    if (activeSection === null) return;
    const active = document.querySelector<HTMLElement>('nav [aria-current="true"]');
    active?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [activeSection]);

  const updateParams = (update: (params: URLSearchParams) => void) => {
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current);
        update(params);
        return params;
      },
      { replace: true },
    );
  };

  const changeRange = (next: string) => updateParams((params) => params.set('range', next));

  const changeGranularity = (next: string) => {
    // Period keys change shape between scales, so the selection is dropped.
    updateParams((params) => {
      params.set('granularity', next);
      params.delete('period');
    });
  };

  const selectPeriod = (period: string) => updateParams((params) => params.set('period', period));

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
        crumb={REPORT_ANALYSIS_LABELS.CRUMB}
        backLabel={REPORT_ANALYSIS_LABELS.BACK}
        onBack={() => navigate('/reports')}
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
            <p className="text-base text-foreground">
              {analysisVM.takeaway.before !== '' && `${analysisVM.takeaway.before} `}
              <span className="text-xl font-medium tabular-nums">{analysisVM.takeaway.value}</span>
              {analysisVM.takeaway.after}
            </p>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span>{analysisVM.cutoffText}</span>
              {analysisVM.unclosedNote !== null && (
                <>
                  <span aria-hidden="true">·</span>
                  <StatusGlyph type="review" label={REPORT_ANALYSIS_LABELS.UNCLOSED_NOTE_LABEL} />
                  <span>{analysisVM.unclosedNote.text}</span>
                  {analysisVM.unclosedNote.showHistoryLink && (
                    <Button variant="text" onClick={() => navigate('/reports')}>
                      {REPORT_ANALYSIS_LABELS.UNCLOSED_HISTORY_LINK}
                    </Button>
                  )}
                </>
              )}
            </div>

            {/* The index sticks only while its own block is on screen, so it must
                share a parent with the sections it navigates. */}
            <div className="space-y-8">
              <nav
                aria-label={REPORT_ANALYSIS_LABELS.INDEX_LABEL}
                className="-mx-4 sticky top-16 z-20 border-y border-border bg-background/95 px-4 backdrop-blur md:-mx-8 md:px-8"
              >
                <div className="flex gap-5 overflow-x-auto">
                  {analysisVM.indexItems.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      aria-current={activeSection === item.id ? 'true' : undefined}
                      onClick={(event) => goToSection(event, item.id)}
                      className={cn(
                        'flex min-h-10 shrink-0 items-center border-b-2 border-transparent text-xs transition-colors duration-fast',
                        activeSection === item.id
                          ? 'border-foreground text-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
              </nav>

              <div className="-mt-6 space-y-2">
                <p className="text-xs text-muted-foreground">{REPORT_ANALYSIS_LABELS.POINT_HINT}</p>
                <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
                  {analysisVM.showRangeControl && (
                    <FilterStrip
                      items={analysisVM.rangeItems}
                      value={analysisVM.range}
                      onValueChange={changeRange}
                      ariaLabel={REPORT_ANALYSIS_LABELS.RANGE_LABEL}
                    />
                  )}
                  {analysisVM.showGranularityControl && (
                    <FilterStrip
                      items={analysisVM.granularityItems}
                      value={analysisVM.granularity}
                      onValueChange={changeGranularity}
                      ariaLabel={REPORT_ANALYSIS_LABELS.GRANULARITY_LABEL}
                    />
                  )}
                </div>
              </div>

              {analysisVM.selection.periodKey !== '' && (
                <section
                  aria-label={REPORT_ANALYSIS_LABELS.SELECTION_LABEL}
                  className="border-y border-border py-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                    <p className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                      {REPORT_ANALYSIS_LABELS.SELECTED_PERIOD(analysisVM.selection.periodText)}
                      {analysisVM.selection.unclosed && (
                        <StatusGlyph
                          type="review"
                          label={REPORT_ANALYSIS_LABELS.PROVISIONAL_SHORT}
                        />
                      )}
                    </p>
                    <Button
                      variant="text"
                      onClick={() => navigate(analysisVM.selection.reportHref)}
                    >
                      {analysisVM.selection.reportLabel}
                    </Button>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-5">
                    {analysisVM.selection.rows.map((row) => (
                      <div key={row.label}>
                        <dt className="text-xs text-muted-foreground">{row.label}</dt>
                        <dd className="font-mono text-sm tabular-nums text-foreground">
                          {row.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}

              <AnalysisSection
                id={ANALYSIS_ANCHORS.NET_WORTH}
                title={REPORT_ANALYSIS_LABELS.NET_WORTH_SECTION}
                latestText={analysisVM.netWorth.latestText}
                insufficient={analysisVM.netWorth.insufficient}
              >
                <NetWorthTrendChart
                  points={analysisVM.netWorth.points}
                  initialSeries={initialSeries}
                  selectedPeriod={analysisVM.selection.periodKey}
                  onPointSelect={selectPeriod}
                />
              </AnalysisSection>

              <div className="grid grid-cols-1 gap-y-8 lg:grid-cols-2 lg:gap-x-10">
                <AnalysisSection
                  id={ANALYSIS_ANCHORS.ASSET_COMPOSITION}
                  title={REPORT_ANALYSIS_LABELS.ASSET_COMPOSITION_SECTION}
                  latestText={analysisVM.assetComposition.latestText}
                  insufficient={analysisVM.assetComposition.insufficient}
                >
                  <AssetCompositionChart
                    points={analysisVM.assetComposition.points}
                    markerLabels={false}
                    selectedPeriod={analysisVM.selection.periodKey}
                    onPointSelect={selectPeriod}
                  />
                </AnalysisSection>

                <AnalysisSection
                  id={ANALYSIS_ANCHORS.INVESTMENT_PERFORMANCE}
                  title={REPORT_ANALYSIS_LABELS.INVESTMENT_PERFORMANCE_SECTION}
                  latestText={analysisVM.investmentPerformance.latestText}
                  footnote={REPORT_ANALYSIS_LABELS.INVESTMENT_PERFORMANCE_HINT}
                  insufficient={analysisVM.investmentPerformance.insufficient}
                >
                  <InvestmentPerformanceChart
                    points={analysisVM.investmentPerformance.points}
                    markerLabels={false}
                    selectedPeriod={analysisVM.selection.periodKey}
                    onPointSelect={selectPeriod}
                  />
                </AnalysisSection>
              </div>

              <div className="grid grid-cols-1 gap-y-8 lg:grid-cols-2 lg:gap-x-10">
                <AnalysisSection
                  id={ANALYSIS_ANCHORS.INCOME}
                  title={REPORT_ANALYSIS_LABELS.INCOME_SECTION}
                  latestText={analysisVM.income.latestText}
                  footnote={REPORT_ANALYSIS_LABELS.SAVINGS_FORMULA}
                  insufficient={analysisVM.income.insufficient}
                >
                  <IncomeSavingsChart
                    points={analysisVM.income.points}
                    markerLabels={false}
                    selectedPeriod={analysisVM.selection.periodKey}
                    onPointSelect={selectPeriod}
                  />
                </AnalysisSection>

                <AnalysisSection
                  id={ANALYSIS_ANCHORS.CASH_FLOW}
                  title={REPORT_ANALYSIS_LABELS.CASH_FLOW_SECTION}
                  latestText={analysisVM.cashFlow.latestText}
                  footnote={REPORT_ANALYSIS_LABELS.CASH_FLOW_HINT}
                  insufficient={analysisVM.cashFlow.insufficient}
                >
                  <NetCashFlowChart
                    points={analysisVM.cashFlow.points}
                    markerLabels={false}
                    selectedPeriod={analysisVM.selection.periodKey}
                    onPointSelect={selectPeriod}
                  />
                </AnalysisSection>
              </div>

              <AnalysisSection
                id={ANALYSIS_ANCHORS.DEBT_LEVERAGE}
                title={REPORT_ANALYSIS_LABELS.DEBT_LEVERAGE_SECTION}
                latestText={analysisVM.debtLeverage.latestText}
                insufficient={analysisVM.debtLeverage.insufficient}
              >
                <DebtLeverageChart
                  points={analysisVM.debtLeverage.points}
                  showLeverage={analysisVM.debtLeverage.showLeverage}
                  markerLabels={false}
                  selectedPeriod={analysisVM.selection.periodKey}
                  onPointSelect={selectPeriod}
                />
              </AnalysisSection>
            </div>
          </>
        )}
    </div>
  );
};

export default ReportAnalysisPage;
