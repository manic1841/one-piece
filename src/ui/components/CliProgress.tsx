import { cn } from '@/ui/utils/cn';

export type CliProgressProps = {
  /** The command line shown above the bar, e.g. "generate-reports --period SEP-2026". */
  command: string;
  /** Progress percentage, 0-100. */
  value: number;
  /** Current step description, e.g. "Generating September financial statements...". */
  statusText?: string;
  className?: string;
};

const BAR_WIDTH = 20;

const filled = (value: number): string => '█'.repeat(Math.round((value / 100) * BAR_WIDTH));

const remaining = (value: number): string =>
  '░'.repeat(BAR_WIDTH - Math.round((value / 100) * BAR_WIDTH));

const clamped = (value: number): number => Math.min(100, Math.max(0, Math.round(value)));

/**
 * Terminal-style progress for long-running work (states-and-a11y: the engineering identity).
 * Self-drawn bar, so it carries its own role="progressbar" and aria-value* attributes.
 */
export function CliProgress({ command, value, statusText, className }: CliProgressProps) {
  const percent = clamped(value);

  return (
    <div className={cn('font-mono text-sm text-foreground', className)}>
      <div className="flex items-center gap-2 leading-relaxed">
        <span className="text-primary">$</span>
        <span className="text-muted-foreground">{command}</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={command}
        className="mt-2 flex items-center gap-1.5"
      >
        <span className="text-muted-foreground">[</span>
        <span className="min-w-0 overflow-hidden whitespace-nowrap text-primary tracking-tight">
          {filled(percent)}
          {remaining(percent)}
        </span>
        <span className="text-muted-foreground">]</span>
        <span className="ml-1 shrink-0">{percent}%</span>
      </div>
      {statusText !== undefined && (
        <div className="mt-1.5 text-muted-foreground leading-relaxed">→ {statusText}</div>
      )}
    </div>
  );
}
