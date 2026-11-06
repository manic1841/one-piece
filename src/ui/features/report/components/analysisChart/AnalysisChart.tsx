import { useState } from 'react';

import { ChartLegend, type ChartLegendItem } from '@/ui/components/charts/ChartLegend';
import { InteractiveComposedChart } from '@/ui/components/charts/InteractiveComposedChart';
import { heroPoint, listPoint, type TooltipItem } from '@/ui/components/charts/chartInteraction';
import { CHART_COLOR_TOKEN_COLOR, type ChartColorToken, type ChartTone } from '@/ui/components/charts/chartTheme';
import { type ComposedSeries } from '@/ui/components/charts/composedChartGeometry';
import { REPORT_ANALYSIS_LABELS } from '@/ui/constants/report/reportCenterLabels';
import { useIsDesktop } from '@/ui/features/app/layout/useIsDesktop';

import { unclosedReferenceLines, withoutLabels } from '../unclosedMarkers';

/** A tooltip row. `seriesKey` ties it to a layer so hiding the layer drops the row. */
export type ChartTooltipItem = TooltipItem & { seriesKey?: string };

export type ChartTooltipSpec =
  | { primary?: ChartTooltipItem; secondary?: (ChartTooltipItem | null)[] }
  | { mode: 'list'; items: (ChartTooltipItem | null)[] };

export type ChartLayer =
  | {
      kind: 'line';
      seriesKey: string;
      values: (number | null)[];
      tone: ChartTone;
      colorToken?: ChartColorToken;
      axis?: 'right';
      dashed?: boolean;
      area?: boolean;
      /** Stack this band on the layers before it instead of the zero baseline. */
      baseline?: 'stack';
    }
  | {
      kind: 'bar';
      seriesKey: string;
      values: number[];
      tone: ChartTone;
      toneBySign?: boolean;
    };

/** A narrow band under the main plot, owning its own scale and unit caption. */
export type ChartSecondary = {
  seriesKey: string;
  unit: string;
  tone: ChartTone;
  values: (number | null)[];
  includeZero?: boolean;
  yTicks?: number;
  yDecimals?: number;
  yUnit?: string;
};

type ChartHeight = {
  mobile: number;
  desktop: number;
  /** Desktop height while the series is dense (fewer than 6 points). */
  shortDesktop?: number;
};

export interface AnalysisChartProps<Point extends { yearMonth: string; label: string; unclosed: boolean }> {
  points: Point[];
  /** The chart's layers, given the points and the current visibility. */
  layers: (points: Point[], isVisible: (seriesKey: string) => boolean) => ChartLayer[];
  /** Semantic tooltip content; hidden layers are filtered out by the module. */
  tooltip: (point: Point, isVisible: (seriesKey: string) => boolean) => ChartTooltipSpec;
  /** Series toggles. Omitted charts render without a legend and cannot hide layers. */
  legend?: { items: { key: string; label: string; tone?: ChartTone; color?: string }[] };
  /** Accessible name; called with the labels currently visible. */
  ariaLabel: (visibleLabels: string[]) => string;
  /** Period key of the page's selected point. */
  selectedPeriod: string;
  onPointSelect: (yearMonth: string) => void;
  /** Series switched on at mount, e.g. from `?series=`. */
  initialActive?: string[];
  /** Draw the unclosed caption; only the first chart on a page needs it. */
  showUnclosedLabels?: boolean;
  /** Extra bands under the main plot (e.g. a rate line). All hidden, the main plot labels x. */
  secondary?: (points: Point[]) => ChartSecondary[];
  height?: ChartHeight;
  yDomain?: { min: number; max: number };
  yTicks?: number;
  yDecimals?: number;
  yUnit?: string;
  includeZero?: boolean;
}

const DEFAULT_HEIGHT: ChartHeight = { mobile: 160, desktop: 240, shortDesktop: 160 };
const SECONDARY_HEIGHT = 96;

const pointTitle = (point: { label: string; unclosed: boolean }): string =>
  `${point.label}${point.unclosed ? REPORT_ANALYSIS_LABELS.PROVISIONAL_SUFFIX : ''}`;

/** Series visibility for one chart, seeded with the series that start visible. */
const useSeriesVisibility = (initial: readonly string[]) => {
  const [active, setActive] = useState<ReadonlySet<string>>(() => new Set(initial));
  const isVisible = (key: string): boolean => active.has(key);
  const toggle = (key: string) =>
    setActive((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  return { active, isVisible, toggle };
};

const stackBaseline = (values: (number | null)[], baseline: number[]): number[] =>
  values.map((_, index) => baseline[index] ?? 0);

/**
 * The baseline each stacked layer should sit on: the running sum of the stacked
 * layers before it. Non-stacked layers get none.
 */
const stackOffsets = (layerList: ChartLayer[], count: number): (number[] | undefined)[] => {
  const offsets: (number[] | undefined)[] = [];
  let running = Array.from({ length: count }, () => 0);
  for (const layer of layerList) {
    if (layer.kind === 'line' && layer.baseline === 'stack') {
      offsets.push(running);
      running = running.map((value, index) => value + (layer.values[index] ?? 0));
    } else {
      offsets.push(undefined);
    }
  }
  return offsets;
};

/**
 * One analysis chart: the shared interaction pipeline (series toggles, tooltip
 * content, unclosed markers, keyboard activation, responsive height, a11y)
 * behind a caller-supplied layer and tooltip description. Callers keep the
 * series definitions; this module keeps the wiring.
 */
export function AnalysisChart<Point extends { yearMonth: string; label: string; unclosed: boolean }>({
  points,
  layers,
  tooltip,
  legend,
  ariaLabel,
  selectedPeriod,
  onPointSelect,
  initialActive,
  showUnclosedLabels = false,
  secondary,
  height = DEFAULT_HEIGHT,
  yDomain,
  yTicks,
  yDecimals,
  yUnit,
  includeZero,
}: AnalysisChartProps<Point>) {
  const isDesktop = useIsDesktop();
  const legendKeys = legend?.items.map((item) => item.key) ?? [];
  const { isVisible, toggle } = useSeriesVisibility(initialActive ?? legendKeys);

  const visibleLegendItems = (legend?.items ?? []).filter((item) => isVisible(item.key));
  const visibleLabels = visibleLegendItems.map((item) => item.label);
  const selectedIndex = points.findIndex((point) => point.yearMonth === selectedPeriod);
  const activate = (index: number) => {
    const point = points[index];
    if (point !== undefined) onPointSelect(point.yearMonth);
  };

  const referenceLines = showUnclosedLabels
    ? unclosedReferenceLines(points)
    : withoutLabels(unclosedReferenceLines(points));

  // Stacked layers sit on everything before them; hidden layers collapse out.
  const requestedLayers = layers(points, isVisible);
  const offsets = stackOffsets(requestedLayers, points.length);
  const series: ComposedSeries[] = requestedLayers.map((layer, index) => {
    if (layer.kind === 'bar') {
      return {
        kind: 'bar' as const,
        tone: layer.tone,
        values: layer.values,
        ...(layer.toneBySign === undefined ? {} : { toneBySign: layer.toneBySign }),
      };
    }
    const values = layer.values;
    const baseline = offsets[index];
    const baselineValues = baseline === undefined ? undefined : stackBaseline(values, baseline);
    return {
      kind: 'line' as const,
      tone: layer.tone,
      values,
      ...(layer.colorToken === undefined ? {} : { colorToken: layer.colorToken }),
      ...(layer.axis === undefined ? {} : { axis: layer.axis }),
      ...(layer.dashed === undefined ? {} : { dashed: layer.dashed }),
      ...(layer.area === undefined ? {} : { area: layer.area }),
      ...(baselineValues === undefined ? {} : { baselineValues }),
    };
  });

  const visibleSecondaries = (secondary?.(points) ?? []).filter((band) =>
    isVisible(band.seriesKey),
  );

  const tooltipPoints = points.map((point) => {
    const spec = tooltip(point, isVisible);
    if ('mode' in spec && spec.mode === 'list') {
      const items = (spec.items ?? []).filter(
        (item): item is ChartTooltipItem =>
          item !== null && (item.seriesKey === undefined || isVisible(item.seriesKey)),
      );
      return listPoint(pointTitle(point), items);
    }
    const hero = spec as Extract<ChartTooltipSpec, { primary?: ChartTooltipItem }>;
    const secondaryItems = (hero.secondary ?? []).filter(
      (item): item is ChartTooltipItem =>
        item !== null && (item.seriesKey === undefined || isVisible(item.seriesKey)),
    );
    return heroPoint(pointTitle(point), hero.primary, secondaryItems);
  });

  const chartHeight = isDesktop
    ? points.length < 6
      ? (height.shortDesktop ?? height.desktop)
      : height.desktop
    : height.mobile;

  // The lowest visible layer owns the x labels; the main plot only labels while
  // no band is showing.
  const showLabels = visibleSecondaries.length === 0;
  const shared = {
    labels: points.map((point) => point.label),
    points: tooltipPoints,
    onPointClick: activate,
  };

  return (
    <div className="space-y-3">
      <InteractiveComposedChart
        {...shared}
        series={series}
        referenceLines={referenceLines}
        height={chartHeight}
        showLabels={showLabels}
        ariaLabel={ariaLabel(visibleLabels)}
        selectedIndex={selectedIndex}
        {...(yDomain === undefined ? {} : { yDomain })}
        {...(yTicks === undefined ? {} : { yTicks })}
        {...(yDecimals === undefined ? {} : { yDecimals })}
        {...(yUnit === undefined ? {} : { yUnit })}
        {...(includeZero === undefined ? {} : { includeZero })}
      />

      {visibleSecondaries.map((band) => (
        <div key={band.seriesKey} className="mt-3 border-t border-border pt-3">
          <p className="mb-1 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
            {band.unit}
          </p>
          <InteractiveComposedChart
            {...shared}
            series={[{ kind: 'line', tone: band.tone, values: band.values }]}
            referenceLines={withoutLabels(referenceLines)}
            height={SECONDARY_HEIGHT}
            yTicks={band.yTicks ?? 3}
            yDecimals={band.yDecimals ?? 1}
            ariaLabel={legend?.items.find((item) => item.key === band.seriesKey)?.label ?? band.unit}
            {...(band.yUnit === undefined ? {} : { yUnit: band.yUnit })}
            {...(band.includeZero === undefined ? {} : { includeZero: band.includeZero })}
          />
        </div>
      ))}

      {legend !== undefined && (
        <ChartLegend
          items={legend.items.map<ChartLegendItem>((item) => ({
            label: item.label,
            ...(item.tone === undefined ? {} : { tone: item.tone }),
            ...(item.color === undefined ? {} : { color: item.color }),
          }))}
          active={visibleLabels}
          onToggle={(label) => {
            const key = legend.items.find((item) => item.label === label)?.key;
            if (key !== undefined) toggle(key);
          }}
        />
      )}
    </div>
  );
}

export { CHART_COLOR_TOKEN_COLOR };
