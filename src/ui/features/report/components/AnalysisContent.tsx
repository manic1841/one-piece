import { type MouseEvent } from 'react';

import { FilterStrip } from '@/ui/components/FilterStrip';
import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { Button } from '@/ui/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/ui/select';
import { REPORT_ANALYSIS_LABELS } from '@/ui/constants/report/reportCenterLabels';
import {
  ANALYSIS_SECTIONS,
  AnalysisSection,
  type AnalysisSectionSpec,
  groupSections,
} from '@/ui/features/report/components/analysisChart';
import {
  type AnalysisGranularity,
  type AnalysisRange,
  type NetWorthSeriesKey,
  type ReportAnalysisVM,
} from '@/ui/features/report/viewmodels/reportAnalysis.vm';
import { cn } from '@/ui/utils/cn';

export interface AnalysisContentProps {
  vm: ReportAnalysisVM;
  activeSection: string | null;
  initialSeries: NetWorthSeriesKey[];
  onRangeChange: (next: AnalysisRange) => void;
  onGranularityChange: (next: AnalysisGranularity) => void;
  onYearChange: (year: string) => void;
  onPointSelect: (period: string) => void;
  onSectionClick: (event: MouseEvent<HTMLAnchorElement>, id: string) => void;
  onHistoryLink: () => void;
  onBackToReports: () => void;
}

/** The resolved page body: takeaway, notes, index, controls, selection and sections. */
export const AnalysisContent: React.FC<AnalysisContentProps> = ({
  vm,
  activeSection,
  initialSeries,
  onRangeChange,
  onGranularityChange,
  onYearChange,
  onPointSelect,
  onSectionClick,
  onHistoryLink,
  onBackToReports,
}) => {
  const renderSection = (spec: AnalysisSectionSpec) => {
    const section = vm[spec.vmKey];
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
        {spec.chart(vm, {
          selectedPeriod: vm.selection.periodKey,
          onPointSelect,
          initialSeries,
          // The caption is a page-level concern; only the first block carries it.
          showUnclosedLabels: spec === ANALYSIS_SECTIONS[0],
        })}
      </AnalysisSection>
    );
  };

  return (
    <>
      <p className="text-base text-foreground">
        {vm.takeaway.before !== '' && `${vm.takeaway.before} `}
        <span className="text-xl font-medium tabular-nums">{vm.takeaway.value}</span>
        {vm.takeaway.after}
      </p>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span>{vm.cutoffText}</span>
        {vm.unclosedNote !== null && (
          <>
            <span aria-hidden="true">·</span>
            <StatusGlyph type="review" label={REPORT_ANALYSIS_LABELS.UNCLOSED_NOTE_LABEL} />
            <span>{vm.unclosedNote.text}</span>
            {vm.unclosedNote.showHistoryLink && (
              <Button variant="text" onClick={onHistoryLink}>
                {REPORT_ANALYSIS_LABELS.UNCLOSED_HISTORY_LINK}
              </Button>
            )}
          </>
        )}
        {vm.singleYearNote !== null && (
          <>
            <span aria-hidden="true">·</span>
            <span>{vm.singleYearNote}</span>
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
                onClick={(event) => onSectionClick(event, item.id)}
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
            {vm.showRangeControl && (
              <FilterStrip
                items={vm.rangeItems}
                value={vm.range}
                onValueChange={(id) => onRangeChange(id as AnalysisRange)}
                ariaLabel={REPORT_ANALYSIS_LABELS.RANGE_LABEL}
              />
            )}
            {vm.showGranularityControl && (
              <FilterStrip
                items={vm.granularityItems}
                value={vm.granularity}
                onValueChange={(id) => onGranularityChange(id as AnalysisGranularity)}
                ariaLabel={REPORT_ANALYSIS_LABELS.GRANULARITY_LABEL}
              />
            )}
            {vm.showYearFilter && (
              <Select value={vm.year} onValueChange={onYearChange}>
                <SelectTrigger
                  className="h-10 w-28"
                  aria-label={REPORT_ANALYSIS_LABELS.YEAR_FILTER_LABEL}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {vm.yearItems.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {vm.selection.periodKey !== '' && (
          <section
            aria-label={REPORT_ANALYSIS_LABELS.SELECTION_LABEL}
            className="border-y border-border py-4"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
              <p className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                {REPORT_ANALYSIS_LABELS.SELECTED_PERIOD(vm.selection.periodText)}
                {vm.selection.unclosed && (
                  <StatusGlyph type="review" label={REPORT_ANALYSIS_LABELS.PROVISIONAL_SHORT} />
                )}
              </p>
              <Button variant="text" onClick={() => onPointSelect(vm.selection.periodKey)}>
                {vm.selection.reportLabel}
              </Button>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-5">
              {vm.selection.rows.map((row) => (
                <div key={row.label}>
                  <dt className="text-xs text-muted-foreground">{row.label}</dt>
                  <dd className="font-mono text-sm tabular-nums text-foreground">{row.value}</dd>
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

        <div className="pt-2">
          <Button variant="text" onClick={onBackToReports}>
            {REPORT_ANALYSIS_LABELS.BACK}
          </Button>
        </div>
      </div>
    </>
  );
};
