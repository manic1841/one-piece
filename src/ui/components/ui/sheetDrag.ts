/** Fraction of the sheet height a downward drag must cover before release dismisses it. */
export const SHEET_DISMISS_DISTANCE_RATIO = 0.25;

/** Downward release speed (px/ms) that dismisses regardless of distance — a flick. */
export const SHEET_DISMISS_VELOCITY = 0.5;

/**
 * Release decision for a dragged bottom sheet (motion-system §5.3). Pure so the
 * thresholds stay testable; the caller owns the motion that follows.
 */
export const shouldDismiss = (displacement: number, velocity: number, height: number): boolean => {
  if (displacement <= 0) return false;
  if (height > 0 && displacement >= height * SHEET_DISMISS_DISTANCE_RATIO) return true;
  return velocity >= SHEET_DISMISS_VELOCITY;
};
