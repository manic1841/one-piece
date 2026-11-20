import { useCallback, useEffect, useRef, useState } from 'react';

import { useSearchParams } from 'react-router-dom';

import { type FinancialAnalysis } from '@/application/report/use_cases/getFinancialAnalysisWorkflow';
import { type AnalysisGranularity, type AnalysisRange } from '@/domains/report/analysisScale';
import { ANALYSIS_SECTIONS } from '@/ui/features/report/components/analysisChart';
import {
  type NetWorthSeriesKey,
  type ReportAnalysisVM,
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

/**
 * The page's URL as state: range, scale, selection and the derived section index.
 * Everything that has to stay in step with the URL lives here so the page stays a
 * Surface that only renders.
 */
export const useReportAnalysisUrlState = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { range, granularity, period: selectedPeriod } = resolveAnalysisUrlState(searchParams);
  const [initialSeries] = useState(() => parseSeries(searchParams.get('series')));

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

  const changeRange = (next: AnalysisRange) => updateParams((params) => params.set('range', next));
  const selectYear = (year: string) => {
    updateParams((params) => {
      params.set('granularity', 'annual');
      params.set('period', year);
    });
  };

  return {
    range,
    granularity,
    selectedPeriod,
    initialSeries,
    searchParams,
    updateParams,
    changeRange,
    selectYear,
  };
};

type UrlState = ReturnType<typeof useReportAnalysisUrlState>;

/**
 * Keeps the URL and the resolved analysis in step: a deep-linked year widens the
 * range once, an unreachable year falls back to the anchor, a month key on the
 * annual scale is rewritten to its year, and the hash is restored once the
 * sections exist. Lives with the URL state because it mutates it.
 */
export const useReportAnalysisUrlSync = (
  analysis: FinancialAnalysis | null,
  analysisVM: ReportAnalysisVM | null,
  url: UrlState,
) => {
  const { range, granularity, selectedPeriod, updateParams } = url;
  // A year carried by the first URL may need the range widened once, not on every edit.
  const initialYearRef = useRef(selectedPeriod !== null && selectedPeriod.length === 4);
  const expandedYearRef = useRef(false);

  const rawPeriod = url.searchParams.get('period');

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
  const { activeSection } = useActiveSectionObserver(analysisVM);
  // Keep the active tab reachable when the index overflows on narrow screens.
  useEffect(() => {
    if (activeSection === null) return;
    const active = document.querySelector<HTMLElement>('nav [aria-current="true"]');
    active?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [activeSection]);

  const changeGranularity = (next: AnalysisGranularity) => {
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
      // Back on the monthly scale, keep looking at the same year's latest month.
      const month =
        selectedPeriod !== null && selectedPeriod.length === 4 && analysis !== null
          ? latestMonthOfYear(analysis, selectedPeriod)
          : null;
      if (month !== null) params.set('period', month);
      else params.delete('period');
    });
  };

  return { activeSection, changeGranularity };
};

/** Tracks which section crosses the upper third of the viewport. */
const useActiveSectionObserver = (analysisVM: ReportAnalysisVM | null) => {
  const [activeSection, setActiveSection] = useState<string | null>(null);

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

  return { activeSection, setActiveSection };
};
