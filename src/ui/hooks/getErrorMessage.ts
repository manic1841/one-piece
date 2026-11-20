/**
 * Presentation helper: turns an unknown thrown value into text fit for display.
 *
 * Deliberately does NOT fall back to `String(error)`: a thrown plain object
 * would render as `[object Object]`, which is noise rather than a message.
 * Anything that is neither an `Error` with a message nor a non-empty string
 * becomes the fallback.
 */
export function getErrorMessage(error: unknown, fallback = '發生未知錯誤'): string {
  if (error instanceof Error) {
    return error.message || fallback;
  }
  if (typeof error === 'string' && error.length > 0) {
    return error;
  }
  return fallback;
}

/** Failure copy for a `useLoadingTask` result; an abort has no thrown value. */
export function getTaskErrorMessage(
  result: { ok: false; kind: 'failed' | 'aborted'; error?: unknown },
  fallback?: string,
): string {
  return result.kind === 'failed' ? getErrorMessage(result.error, fallback) : (fallback ?? '');
}
