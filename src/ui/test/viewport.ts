import { vi } from 'vitest';

/** The breakpoint `useIsDesktop` matches on; a stubbed viewport answers it by width. */
const MIN_WIDTH_QUERY = /^min-width:\s*(\d+)px$/;
const MAX_WIDTH_QUERY = /^max-width:\s*(\d+)px$/;

/** Answer a width query from `width`; anything else (e.g. reduced motion) is false. */
function matchesViewport(query: string, width: number) {
  const minWidth = MIN_WIDTH_QUERY.exec(query);
  if (minWidth !== null) return width >= Number(minWidth[1]);
  const maxWidth = MAX_WIDTH_QUERY.exec(query);
  if (maxWidth !== null) return width <= Number(maxWidth[1]);
  return false;
}

/**
 * happy-dom has no layout, so every element measures 0×0 and width-driven
 * branching (chart axis density, `useIsDesktop`) collapses to one branch.
 *
 * `stubViewportWidth` pins both seams — `getBoundingClientRect` for measured
 * elements and `matchMedia` for the media-query branch, answered from `width` —
 * for the duration of a test. Call the returned restore in `afterEach`.
 */
export function stubViewportWidth(width: number) {
  const rect = {
    width,
    height: 0,
    top: 0,
    left: 0,
    right: width,
    bottom: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect;

  const rectSpy = vi
    .spyOn(Element.prototype, 'getBoundingClientRect')
    .mockImplementation(() => rect);
  const matchMediaSpy = vi.spyOn(window, 'matchMedia').mockImplementation(
    (query) =>
      ({
        matches: matchesViewport(query, width),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  );

  return () => {
    rectSpy.mockRestore();
    matchMediaSpy.mockRestore();
  };
}
