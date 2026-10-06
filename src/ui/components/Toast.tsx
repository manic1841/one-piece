import { toast } from 'sonner';

import { Button } from '@/ui/components/ui/button';
import { cn } from '@/ui/utils/cn';

export type ToastTone = 'success' | 'error';

type ToastProps = {
  /** Short status message, e.g. "TRANSACTION SAVED". */
  message: string;
  /** Glyph tone: `success` (✓, positive) by default; `error` (!, negative) for failures. */
  tone?: ToastTone;
  /** Optional single action on the right, e.g. UNDO. */
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

const TONE_GLYPH: Record<ToastTone, string> = { success: '✓', error: '!' };
const TONE_COLOR: Record<ToastTone, string> = { success: 'text-positive', error: 'text-negative' };

/**
 * Toast surface (visual-standards §通知): a floating card carrying a status
 * glyph + message on the left and one optional action on the right. Render it
 * inside sonner via `toast.custom(..., { unstyled: true })` for live toasts, or
 * standalone as a static preview. Toast only reports — it never carries a
 * workflow instruction (states-and-a11y §error states).
 */
export function Toast({ message, tone = 'success', actionLabel, onAction, className }: ToastProps) {
  return (
    <div
      role="status"
      className={cn(
        'flex w-full items-center justify-between gap-5 rounded border border-border bg-card px-3.5 py-3 shadow-lg',
        className,
      )}
    >
      <span className={cn('flex items-center gap-2 text-xs font-medium', TONE_COLOR[tone])}>
        <span className="text-[10px] leading-none" aria-hidden="true">
          {TONE_GLYPH[tone]}
        </span>
        {message}
      </span>
      {actionLabel !== undefined && (
        <Button variant="text" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

/** sonner options that let `<Toast>` own the surface; width matches sonner's default. */
export const LIVE_TOAST_OPTIONS = { unstyled: true, style: { width: '356px' } } as const;

/** Emit a live toast rendered from the shared `Toast` surface. */
export function showToast(message: string, tone: ToastTone = 'success'): void {
  toast.custom(() => <Toast message={message} tone={tone} />, LIVE_TOAST_OPTIONS);
}
