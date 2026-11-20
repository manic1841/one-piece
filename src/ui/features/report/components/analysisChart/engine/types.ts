import { type ReactNode } from 'react';

import { type TooltipItem } from '@/ui/components/charts/chartInteraction';
import { type ChartColorToken, type ChartTone } from '@/ui/components/charts/chartTheme';

import {
  type NetWorthSeriesKey,
  type ReportAnalysisVM,
} from '../../../viewmodels/reportAnalysis.vm';

/** A tooltip row. `seriesKey` ties it to a layer so hiding the layer drops the row. */
export type ChartTooltipItem = TooltipItem & { seriesKey?: string };

export type ChartTooltipSpec =
  | { primary?: ChartTooltipItem; secondary?: (ChartTooltipItem | null)[] }
  | { mode: 'list'; items: (ChartTooltipItem | null)[] };

type LayerBase<S extends string> = {
  seriesKey: S;
  label: string;
  tone: ChartTone;
  colorToken?: ChartColorToken;
  /** Explicit swatch colour, e.g. a category-ramp colour. Wins over `tone`. */
  color?: string;
};

/** A layer on the main plot. */
export type ChartMainLayer<S extends string = string> = LayerBase<S> &
  (
    | {
        kind: 'line';
        values: (number | null)[];
        axis?: 'right';
        dashed?: boolean;
        area?: boolean;
        /** Stack this band on the layers before it instead of the zero baseline. */
        baseline?: 'stack';
      }
    | { kind: 'bar'; values: number[]; toneBySign?: boolean }
  );

/** A narrow band under the main plot, owning its own scale and unit caption. */
export type ChartBandLayer<S extends string = string> = LayerBase<S> & {
  kind: 'band';
  unit: string;
  values: (number | null)[];
  includeZero?: boolean;
  yTicks?: number;
  yDecimals?: number;
  yUnit?: string;
};

export type ChartLayer<S extends string = string> = ChartMainLayer<S> | ChartBandLayer<S>;

/** Names the module's pinned height pair; the module owns the numbers. */
export type ChartDensity = 'tall' | 'standard' | 'compact';

export interface ChartContext {
  /** Period key of the page's selected point. */
  selectedPeriod: string;
  onPointSelect: (yearMonth: string) => void;
  /** Context series preselected from `?series=`. */
  initialSeries: NetWorthSeriesKey[];
  /** Draw the unclosed caption; only the page's first block carries it. */
  showUnclosedLabels: boolean;
}

/** One block's chart description; the registry owns which one runs where. */
export type RenderChart = (vm: ReportAnalysisVM, context: ChartContext) => ReactNode;
