import * as React from 'react';

/**
 * Track an element's rendered width in px (`null` until measured).
 *
 * Charts decide label density from their own width, so the plot column — not the
 * viewport — has to be measured: a chart in a grid cell is narrower than the
 * window. `ResizeObserver` covers container resizes; the window listener is the
 * fallback where it is missing.
 */
export function useMeasuredWidth<T extends HTMLElement>() {
  const ref = React.useRef<T>(null);
  const [width, setWidth] = React.useState<number | null>(null);

  React.useEffect(() => {
    const element = ref.current;
    if (element === null) return;
    const measure = () => setWidth(element.getBoundingClientRect().width);
    measure();
    window.addEventListener('resize', measure);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(element);
    return () => {
      window.removeEventListener('resize', measure);
      observer?.disconnect();
    };
  }, []);

  return [ref, width] as const;
}
