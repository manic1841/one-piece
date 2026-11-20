/** Chart interaction hooks. The pure vocabulary lives in `@/ui/utils/chartInteraction`. */
import * as React from 'react';

import { TOOLTIP_CARD_ALLOWANCE, TOOLTIP_GAP, clampIndex } from '@/ui/utils/chartInteraction';

export * from '@/ui/utils/chartInteraction';

/**
 * Measures the rendered tooltip card so the charts can anchor it inside the plot.
 * Re-runs on `contentKey` because wrapped text changes the card height.
 */
export const useTooltipAllowance = (
  plotHeight: number,
  contentKey: string | number | null,
): { ref: React.Ref<HTMLDivElement>; allowedTopRatio: number } => {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [cardHeight, setCardHeight] = React.useState<number | null>(null);

  React.useLayoutEffect(() => {
    const height = ref.current?.getBoundingClientRect().height ?? 0;
    setCardHeight(height > 0 ? height : null);
  }, [contentKey]);

  const allowance = (cardHeight ?? TOOLTIP_CARD_ALLOWANCE) + TOOLTIP_GAP;

  return { ref, allowedTopRatio: Math.min(0.9, allowance / plotHeight) };
};

/**
 * Scrubber state shared by the interactive charts: arrow keys move the active
 * index, Escape clears it. `ariaValueProps` keeps the aria value contract in one
 * place; `role`/`tabIndex` stay literal on each element so the a11y linter sees
 * them (jsx-a11y cannot read a spread).
 */
export const useChartScrubber = (
  count: number,
  plotHeight: number,
  onActivate?: (index: number) => void,
  selectedIndex?: number,
) => {
  const [active, setActive] = React.useState<number | null>(null);
  const { ref: tooltipRef, allowedTopRatio } = useTooltipAllowance(plotHeight, active);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const step = event.key === 'ArrowRight' ? 1 : -1;
      setActive(clampIndex((active ?? selectedIndex ?? -1) + step, count));
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      const index = active ?? selectedIndex;
      if (onActivate === undefined || index === undefined) return;
      event.preventDefault();
      onActivate(index);
      return;
    }
    if (event.key === 'Escape') setActive(null);
  };

  const clear = () => setActive(null);

  const ariaValueProps = {
    'aria-valuemin': 0,
    'aria-valuemax': count - 1,
    'aria-valuenow': active ?? 0,
  } as const;

  return { active, setActive, clear, handleKeyDown, tooltipRef, allowedTopRatio, ariaValueProps };
};
