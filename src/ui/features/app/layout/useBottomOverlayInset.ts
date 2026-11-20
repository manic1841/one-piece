import { useEffect } from 'react';

const OVERLAY_SELECTOR = '.firebase-emulator-warning';
const CSS_VAR = '--bottom-overlay';

/**
 * Publishes the height of the fixed overlay the Firebase SDK injects at the
 * bottom of the viewport as `--bottom-overlay`. Sticky docks and the page
 * footer read the variable, so neither has to know what the overlay is and
 * neither hard-codes a height (the banner wraps to two lines on narrow
 * screens). The variable is `0px` whenever no overlay exists.
 *
 * The overlay is third-party DOM, so it is found by selector and tracked with
 * observers rather than through React state.
 */
export function useBottomOverlayInset() {
  useEffect(() => {
    const root = document.documentElement;
    let resize: ResizeObserver | null = null;
    let watched: Element | null | undefined;

    const publish = (height: number) => root.style.setProperty(CSS_VAR, `${height}px`);

    const watch = (element: Element | null) => {
      if (element === watched) return;
      resize?.disconnect();
      watched = element;

      if (element === null) {
        publish(0);
        return;
      }

      resize = new ResizeObserver(() => {
        if (watched !== element) return;
        publish(element.getBoundingClientRect().height);
      });
      resize.observe(element);
      publish(element.getBoundingClientRect().height);
    };

    watch(document.querySelector(OVERLAY_SELECTOR));

    const mutations = new MutationObserver(() => watch(document.querySelector(OVERLAY_SELECTOR)));
    mutations.observe(document.body, { childList: true });

    return () => {
      mutations.disconnect();
      resize?.disconnect();
      root.style.removeProperty(CSS_VAR);
    };
  }, []);
}
