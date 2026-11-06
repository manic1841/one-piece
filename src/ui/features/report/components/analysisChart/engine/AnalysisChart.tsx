import { useState } from 'react';

import { ChartLegend, type ChartLegendItem } from '@/ui/components/charts/ChartLegend';
import { InteractiveComposedChart } from '@/ui/components/charts/InteractiveComposedChart';
import { type TooltipItem, heroPoint, listPoint } from '@/ui/components/charts/chartInteraction';
import { CHART_COLOR_TOKEN_COLOR } from '@/ui/components/charts/chartTheme';
import {
  type ComposedReferenceLine,
  type ComposedSeries,
} from '@/ui/components/charts/composedChartGeometry';
import { REPORT_ANALYSIS_LABELS } from '@/ui/constants/report/reportCenterLabels';
import { useIsDesktop } from '@/ui/features/app/layout/useIsDesktop';

import {
  type ChartBandLayer,
  type ChartDensity,
  type ChartLayer,
  type ChartMainLayer,
  type ChartTooltipSpec,
} from './types';

type ChartHeight = { mobile: number; desktop: number };

const HEIGHT: Record<ChartDensity, ChartHeight> = {
  tall: { mobile: 200, desktop: 320 },
  standard: { mobile: 160, desktop: 240 },
  compact: { mobile: 160, desktop: 160 },
};
const SECONDARY_HEIGHT = 96;

export interface AnalysisChartProps<
  SeriesKey extends string,
  Point extends { yearMonth: string; label: string; unclosed: boolean },
> {
  points: Point[];
  /** Every layer, visible or not; the module drops the hidden ones and builds the legend. */
  layers: (points: Point[]) => ChartLayer<SeriesKey>[];
  /** Semantic tooltip content; hidden layers are filtered out by the module. */
  tooltip: (point: Point) => ChartTooltipSpec;
  /** Height pair from the visual standard. Defaults to `standard`. */
  density?: ChartDensity;
  /** Accessible name; called with the labels currently visible. */
  ariaLabel?: (visibleLabels: string[]) => string;
  /** Period key of the page's selected point. */
  selectedPeriod: string;
  onPointSelect: (yearMonth: string) => void;
  /** Series switched on at mount, e.g. from `?series=`. */
  initialActive?: SeriesKey[];
  /** Draw the unclosed caption; only the first chart on a page needs it. */
  showUnclosedLabels?: boolean;
  yDomain?: { min: number; max: number };
  yTicks?: number;
  yDecimals?: number;
  yUnit?: string;
  includeZero?: boolean;
}

const pointTitle = (point: { label: string; unclosed: boolean }): string =>
  `${point.label}${point.unclosed ? REPORT_ANALYSIS_LABELS.PROVISIONAL_SUFFIX : ''}`;

/** Series visibility for one chart, seeded with the series that start visible. */
const useSeriesVisibility = (initial: readonly string[]) => {
  const [active, setActive] = useState<ReadonlySet<string>>(() => new Set(initial));
  const toggle = (key: string) =>
    setActive((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  return { active, toggle };
};

const stackBaseline = (values: (number | null)[], baseline: number[]): number[] =>
  values.map((_, index) => baseline[index] ?? 0);

/** Drop the labels so a lower layer can draw the same markers without repeating them. */
const withoutLabels = (lines: readonly ComposedReferenceLine[]): ComposedReferenceLine[] =>
  lines.map(({ index, tone }) => ({ index, tone }));

/** One labelled warning marker at the first index of every contiguous unclosed run. */
const unclosedReferenceLines = (
  points: readonly { unclosed: boolean }[],
): ComposedReferenceLine[] =>
  points.flatMap((point, index) => {
    if (!point.unclosed || points[index - 1]?.unclosed === true) return [];
    return [{ index, tone: 'warning', label: REPORT_ANALYSIS_LABELS.UNCLOSED_MARKER }];
  });

/**
 * The baseline each stacked layer should sit on: the running sum of the stacked
 * layers before it. Non-stacked layers get none.
 */
const stackOffsets = <S extends string>(
  layerList: ChartMainLayer<S>[],
  count: number,
): (number[] | undefined)[] => {
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

const isBand = <S extends string>(layer: ChartLayer<S>): layer is ChartBandLayer<S> =>
  layer.kind === 'band';

/**
 * One analysis chart: the shared interaction pipeline (series toggles, tooltip
 * filtering, unclosed markers, keyboard activation, responsive height, a11y)
 * behind a caller-supplied layer and tooltip description.
 */
export function AnalysisChart<
  SeriesKey extends string,
  Point extends { yearMonth: string; label: string; unclosed: boolean },
>({
  points,
  layers,
  tooltip,
  density = 'standard',
  ariaLabel,
  selectedPeriod,
  onPointSelect,
  initialActive,
  showUnclosedLabels = false,
  yDomain,
  yTicks,
  yDecimals,
  yUnit,
  includeZero,
}: AnalysisChartProps<SeriesKey, Point>) {
  const isDesktop = useIsDesktop();
  const allLayers = layers(points);
  // A key with no legend entry cannot be toggled, so it always stays visible.
  const legendKeys: string[] = allLayers.map((layer) => layer.seriesKey);
  const { active, toggle } = useSeriesVisibility(initialActive ?? legendKeys);
  const isVisible = (key: string): boolean => !legendKeys.includes(key) || active.has(key);

  const visibleLabels = allLayers
    .filter((layer) => isVisible(layer.seriesKey))
    .map((layer) => layer.label);
  const selectedIndex = points.findIndex((point) => point.yearMonth === selectedPeriod);
  const activate = (index: number) => {
    const point = points[index];
    if (point !== undefined) onPointSelect(point.yearMonth);
  };

  const referenceLines = showUnclosedLabels
    ? unclosedReferenceLines(points)
    : withoutLabels(unclosedReferenceLines(points));

  // Hidden layers collapse out, and stacked layers sit on everything before them.
  const visibleLayers = allLayers.filter((layer) => isVisible(layer.seriesKey));
  const visibleMain = visibleLayers.filter(
    (layer): layer is ChartMainLayer<SeriesKey> => !isBand(layer),
  );
  const offsets = stackOffsets(visibleMain, points.length);
  const series: ComposedSeries[] = visibleMain.map((layer, index) => {
    if (layer.kind === 'bar') {
      return {
        kind: 'bar' as const,
        tone: layer.tone,
        values: layer.values,
        ...(layer.toneBySign === undefined ? {} : { toneBySign: layer.toneBySign }),
      };
    }
    const baseline = offsets[index];
    const baselineValues =
      baseline === undefined ? undefined : stackBaseline(layer.values, baseline);
    return {
      kind: 'line' as const,
      tone: layer.tone,
      values: layer.values,
      ...(layer.colorToken === undefined ? {} : { colorToken: layer.colorToken }),
      ...(layer.axis === undefined ? {} : { axis: layer.axis }),
      ...(layer.dashed === undefined ? {} : { dashed: layer.dashed }),
      ...(layer.area === undefined ? {} : { area: layer.area }),
      ...(baselineValues === undefined ? {} : { baselineValues }),
    };
  });

  const visibleSecondaries = visibleLayers.filter(isBand);

  const tooltipPoints = points.map((point) => {
    const spec = tooltip(point);
    if ('mode' in spec && spec.mode === 'list') {
      const items = (spec.items ?? []).filter(
        (item): item is NonNullable<typeof item> =>
          item !== null && (item.seriesKey === undefined || isVisible(item.seriesKey)),
      );
      return listPoint(pointTitle(point), items);
    }
    const hero = spec as Extract<ChartTooltipSpec, { primary?: TooltipItem }>;
    const primary =
      hero.primary?.seriesKey !== undefined && !isVisible(hero.primary.seriesKey)
        ? undefined
        : hero.primary;
    const secondaryItems = (hero.secondary ?? []).filter(
      (item): item is NonNullable<typeof item> =>
        item !== null && (item.seriesKey === undefined || isVisible(item.seriesKey)),
    );
    return heroPoint(pointTitle(point), primary, secondaryItems);
  });

  const chartHeight = HEIGHT[density][isDesktop ? 'desktop' : 'mobile'];

  // The lowest visible layer owns the x labels; the main plot only labels while
  // no band is showing.
  const showLabels = visibleSecondaries.length === 0;
  const shared = {
    labels: points.map((point) => point.label),
    points: tooltipPoints,
    onPointClick: activate,
  };

  const legendItems = allLayers.map<ChartLegendItem>((layer) => ({
    label: layer.label,
    ...(layer.color === undefined
      ? layer.colorToken === undefined
        ? { tone: layer.tone }
        : { color: CHART_COLOR_TOKEN_COLOR[layer.colorToken] }
      : { color: layer.color }),
  }));

  return (
    <div className="space-y-3">
      <InteractiveComposedChart
        {...shared}
        series={series}
        referenceLines={referenceLines}
        height={chartHeight}
        showLabels={showLabels}
        ariaLabel={(ariaLabel ?? ((visible) => visible.join('、')))(visibleLabels)}
        selectedIndex={selectedIndex}
        {...(yDomain === undefined ? {} : { yDomain })}
        {...(yTicks === undefined ? {} : { yTicks })}
        {...(yDecimals === undefined ? {} : { yDecimals })}
        {...(yUnit === undefined ? {} : { yUnit })}
        {...(includeZero === undefined ? {} : { includeZero })}
      />

      {visibleSecondaries.map((band, index) => (
        <div key={band.seriesKey} className="mt-3 border-t border-border pt-3">
          <p className="mb-1 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
            {band.unit}
          </p>
          <InteractiveComposedChart
            {...shared}
            series={[{ kind: 'line', tone: band.tone, values: band.values }]}
            referenceLines={withoutLabels(referenceLines)}
            height={SECONDARY_HEIGHT}
            // Only the lowest visible band carries the x labels.
            showLabels={index === visibleSecondaries.length - 1}
            yTicks={band.yTicks ?? 3}
            yDecimals={band.yDecimals ?? 1}
            ariaLabel={band.label}
            {...(band.yUnit === undefined ? {} : { yUnit: band.yUnit })}
            {...(band.includeZero === undefined ? {} : { includeZero: band.includeZero })}
          />
        </div>
      ))}

      <ChartLegend
        items={legendItems}
        active={visibleLabels}
        onToggle={(label) => {
          const key = allLayers.find((layer) => layer.label === label)?.seriesKey;
          if (key !== undefined) toggle(key);
        }}
      />
    </div>
  );
}
