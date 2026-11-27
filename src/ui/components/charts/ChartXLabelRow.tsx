import { cn } from '@/ui/utils/cn';

import { AXIS_GUTTER_CLASS } from './ChartAxisGutter';
import { chartAxisLabelClass } from './chartTheme';

type ChartXLabelRowProps = {
  /** Label positions as a 0–1 fraction of the plot width, first to last. */
  labels: { xRatio: number; text: string }[];
  /** Reserve the left gutter's width so the labels start where the plot does. */
  leftGutter: boolean;
  /** Same, for a right-hand y axis. */
  rightGutter: boolean;
  testId?: string;
  className?: string;
};

/**
 * The line under the plot that carries the x-axis labels.
 *
 * The row is the plot's sibling column and reserves the gutter widths with empty
 * boxes: the labels are absolutely positioned, so a `pl-12` on the row would not
 * reach them — only a real box keeps the percentages aligned with the plot.
 */
export function ChartXLabelRow({
  labels,
  leftGutter,
  rightGutter,
  testId,
  className,
}: ChartXLabelRowProps) {
  return (
    <div className={cn('mt-2 flex h-4', className)}>
      {leftGutter && <div className={cn('shrink-0', AXIS_GUTTER_CLASS)} aria-hidden="true" />}
      <div data-testid={testId} className="relative min-w-0 flex-1">
        {labels.map((label, index) => (
          <span
            key={`${label.text}-${index}`}
            className={cn('absolute whitespace-nowrap', chartAxisLabelClass)}
            style={{
              left: `${label.xRatio * 100}%`,
              transform:
                index === 0
                  ? 'none'
                  : index === labels.length - 1
                    ? 'translateX(-100%)'
                    : 'translateX(-50%)',
            }}
          >
            {label.text}
          </span>
        ))}
      </div>
      {rightGutter && <div className={cn('shrink-0', AXIS_GUTTER_CLASS)} aria-hidden="true" />}
    </div>
  );
}
