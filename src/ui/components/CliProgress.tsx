import { cn } from '@/ui/utils/cn';

export type CliProgressTone = 'default' | 'positive' | 'warning';

export type CliProgressProps = {
  /** The command line shown above the bar, e.g. "generate-reports --period SEP-2026". */
  command?: string;
  /** Progress percentage, 0-100. */
  value: number;
  /** Bar color tone; defaults to the primary accent. */
  tone?: CliProgressTone;
  /** Current step description, e.g. "Generating September financial statements...". */
  statusText?: string;
  /** Trailing detail line, e.g. "3/5 · NEXT LEDGER". */
  detail?: string;
  /** Accessible name. Falls back to `command` when omitted. */
  ariaLabel?: string;
  className?: string;
};

/** Long enough to fill any container; the track is clipped to the rendered width. */
const TRACK_WIDTH = 400;

const TONE_CLASS: Record<CliProgressTone, string> = {
  default: 'text-primary',
  positive: 'text-positive',
  warning: 'text-warning',
};

const clamped = (value: number): number => Math.min(100, Math.max(0, Math.round(value)));

/**
 * Terminal-style progress for long-running work (states-and-a11y: the engineering identity).
 * Self-drawn bar, so it carries its own role="progressbar" and aria-value* attributes.
 * The ASCII track stretches to the container width: the fill and the remaining cells are
 * over-long glyph runs clipped per side, so the bar looks like a terminal readout at any width.
 */
export function CliProgress({
  command,
  value,
  tone = 'default',
  statusText,
  detail,
  ariaLabel,
  className,
}: CliProgressProps) {
  const percent = clamped(value);
  const name = ariaLabel ?? command ?? 'progress';

  return (
    <div className={cn('font-mono text-sm text-foreground', className)}>
      {command !== undefined && (
        <div className="flex items-center gap-2 leading-relaxed">
          <span className="text-primary">$</span>
          <span className="text-muted-foreground">{command}</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={name}
        className={cn('flex items-center gap-1.5', command !== undefined && 'mt-2')}
      >
        <span className="text-muted-foreground">[</span>
        <span className="flex min-w-0 flex-1 overflow-hidden whitespace-nowrap tracking-tight">
          <span
            className={cn('overflow-hidden', TONE_CLASS[tone])}
            style={{ width: `${percent}%` }}
          >
            {'█'.repeat(TRACK_WIDTH)}
          </span>
          <span className={cn('flex-1 overflow-hidden', TONE_CLASS[tone])}>
            {'░'.repeat(TRACK_WIDTH)}
          </span>
        </span>
        <span className="text-muted-foreground">]</span>
        <span className="ml-1 shrink-0">{percent}%</span>
      </div>
      {statusText !== undefined && (
        <div className="mt-1.5 text-muted-foreground leading-relaxed">→ {statusText}</div>
      )}
      {detail !== undefined && (
        <div className="mt-1.5 font-mono text-[10px] tracking-widest text-muted-foreground">
          {detail}
        </div>
      )}
    </div>
  );
}
