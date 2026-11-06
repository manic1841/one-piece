import { type MouseEvent, useEffect, useState } from 'react';

import { useNavigate, useSearchParams } from 'react-router-dom';

import { EmptyState } from '@/ui/components/EmptyState';
import { FilterStrip } from '@/ui/components/FilterStrip';
import { LoadErrorAlert } from '@/ui/components/LoadErrorAlert';
import { PageHeader } from '@/ui/components/PageHeader';
import { Skeleton } from '@/ui/components/Skeleton';
import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { Button } from '@/ui/components/ui/button';
import { REPORT_ANALYSIS_LABELS } from '@/ui/constants/report/reportCenterLabels';
import { useAuthState } from '@/ui/contexts/useAuthState';
import {
  ANALYSIS_SECTIONS,
  AnalysisSection,
  type AnalysisSectionSpec,
  groupSections,
} from '@/ui/features/report/components/analysisChart';
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
    const sections = ANALYSIS_SECTIONS.map((item) => document.getElementById(item.id)).filter(
      (element): element is HTMLElement => element !== null,
    );
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

  // A point is a drill-down: it opens that period's report rather than reselecting in place.
  const openPeriod = (period: string) => navigate(`/reports/${period}`);

  const goToSection = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault();
    window.history.replaceState(null, '', `#${id}`);
    const target = document.getElementById(id);
    target?.scrollIntoView({ block: 'start' });
    target?.focus({ preventScroll: true });
  };

  const renderSection = (spec: AnalysisSectionSpec) => {
    if (analysisVM === null) return null;
    const section = analysisVM[spec.vmKey];
    return (
      <AnalysisSection
        key={spec.id}
        id={spec.id}
        title={spec.title}
        latestText={section.latestText}
        footnote={spec.footnote}
        insufficient={section.insufficient}
        className={spec.sectionClassName}
      >
        {spec.chart(analysisVM, {
          selectedPeriod: analysisVM.selection.periodKey,
          onPointSelect: openPeriod,
          initialSeries,
          // The caption is a page-level concern; only the first block carries it.
          showUnclosedLabels: spec === ANALYSIS_SECTIONS[0],
        })}
      </AnalysisSection>
    );
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
                  {ANALYSIS_SECTIONS.map((item) => (
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
                      {item.title}
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

              {groupSections(ANALYSIS_SECTIONS).map((row) =>
                row.length === 1 ? (
                  <div key={row[0].id}>{renderSection(row[0])}</div>
                ) : (
                  <div
                    key={row.map((item) => item.id).join('-')}
                    className="grid grid-cols-1 gap-y-8 lg:grid-cols-2 lg:gap-x-10"
                  >
                    {row.map(renderSection)}
                  </div>
                ),
              )}
            </div>
          </>
        )}
    </div>
  );
};

export default ReportAnalysisPage;
