/**
 * The collapsed body surface every hand-rolled disclosure shares (M05,
 * motion-system §5.1). Kept in one place so the pair cannot be half-removed, or
 * wired the wrong way round, in one surface only.
 *
 * `height: auto <-> 0` interpolates under `interpolate-size: allow-keywords`;
 * `grid-rows-[0fr]` cannot be used, because an `auto` container has no definite
 * height to resolve the track against. The body has to carry no height of its
 * own — the caller owns padding and borders.
 */
export const disclosureBodyClass =
  'overflow-hidden [interpolate-size:allow-keywords] ' +
  'data-[state=closed]:h-0 data-[state=closed]:-translate-y-0.5 data-[state=closed]:opacity-0 data-[state=closed]:animate-disclosure-up ' +
  'data-[state=open]:h-auto data-[state=open]:translate-y-0 data-[state=open]:animate-disclosure-down';
