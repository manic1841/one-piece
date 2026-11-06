import { type MouseEvent, useCallback, useEffect, useRef, useState } from 'react';

import { useNavigate, useSearchParams } from 'react-router-dom';

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
  type NetWorthSeriesKey,
  type SeriesParam,
} from '@/ui/features/report/viewmodels/reportAnalysis.vm';
import {
  drawableYears,
  latestMonthOfYear,
  monthsNeededForYear,
  rangeForYear,
  resolveAnalysisUrlState,
  widerRange,
  yearOfMonth,
} from '@/ui/features/report/viewmodels/reportAnalysisParams';

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
  const { range, granularity, period: selectedPeriod } = resolveAnalysisUrlState(searchParams);
  const [initialSeries] = useState(() => parseSeries(searchParams.get('series')));
  const [activeSection, setActiveSection] = useState<string | null>(null);
  // A year carried by the first URL may need the range widened once, not on every edit.
  const initialYearRef = useRef(selectedPeriod !== null && selectedPeriod.length === 4);
  const expandedYearRef = useRef(false);

  const { analysis, analysisVM, loading, errorMessage, reload } = useFinancialAnalysis(
    householdId,
    range,
    granularity,
    selectedPeriod,
  );

  const updateParams = useCallback(
    (update: (params: URLSearchParams) => void) => {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current);
          update(params);
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // A deep-linked year outside the range widens it once to the smallest range that
  // reaches the year; a year that still has no point falls back to the anchor year.
  useEffect(() => {
    if (analysis === null || granularity !== 'annual' || selectedPeriod === null) return;
    if (selectedPeriod.length !== 4) return;
    // The resolved analysis lags a URL range change; deciding on it would undo the
    // expansion before the wider response lands.
    if (analysis.range !== range) return;
    if (drawableYears(analysis).includes(selectedPeriod)) {
      // The initial year is already reachable; later range edits must not re-expand.
      expandedYearRef.current = true;
      return;
    }

    if (initialYearRef.current && !expandedYearRef.current && analysis.anchor !== null) {
      expandedYearRef.current = true;
      const needed = monthsNeededForYear(selectedPeriod, analysis.anchor.yearMonth);
      const smallest = rangeForYear(analysis.availableRanges, needed);
      const nextRange = smallest === null ? null : widerRange(range, smallest);
      if (nextRange !== null && nextRange !== range) {
        updateParams((params) => params.set('range', nextRange));
        return;
      }
    }

    if (analysis.anchor === null) return;
    const anchorYear = yearOfMonth(analysis.anchor.yearMonth);
    if (anchorYear !== selectedPeriod) {
      updateParams((params) => params.set('period', anchorYear));
    }
  }, [analysis, granularity, selectedPeriod, range, updateParams]);

  const rawPeriod = searchParams.get('period');

  // A month key on the annual scale is carried in the URL as its year.
  useEffect(() => {
    if (granularity !== 'annual' || rawPeriod === null || rawPeriod.length <= 4) return;
    updateParams((params) => params.set('period', yearOfMonth(rawPeriod)));
  }, [granularity, rawPeriod, updateParams]);

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

  const changeRange = (next: string) => updateParams((params) => params.set('range', next));

  const changeGranularity = (next: string) => {
    if (next === granularity) return;
    updateParams((params) => {
      params.set('granularity', next);
      if (next === 'annual') {
        const year =
          selectedPeriod !== null && selectedPeriod.length > 4
            ? yearOfMonth(selectedPeriod)
            : analysis?.anchor
              ? yearOfMonth(analysis.anchor.yearMonth)
              : null;
        if (year !== null) params.set('period', year);
        else params.delete('period');
        return;
      }
      // Back on the monthly scale, keep looking at the same year when it has a month.
      const month =
        selectedPeriod !== null && selectedPeriod.length === 4 && analysis !== null
          ? latestMonthOfYear(analysis, selectedPeriod)
          : null;
      if (month !== null) params.set('period', month);
      else params.delete('period');
    });
  };

  const selectYear = (year: string) => {
    updateParams((params) => {
      params.set('granularity', 'annual');
      params.set('period', year);
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
        />
      )}
    </div>
  );
};

export default ReportAnalysisPage;
