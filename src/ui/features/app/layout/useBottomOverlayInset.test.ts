import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useBottomOverlayInset } from './useBottomOverlayInset';

/** Observer stub that lets a test fire the callbacks on demand. */
class ObserverStub {
  static instances: ObserverStub[] = [];
  constructor(private callback: () => void) {
    ObserverStub.instances.push(this);
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  fire() {
    this.callback();
  }
}

vi.stubGlobal('ResizeObserver', ObserverStub);
vi.stubGlobal('MutationObserver', ObserverStub);

/** jsdom runs neither observer, so a body mutation is reported by hand. */
const flush = () => ObserverStub.instances.forEach((instance) => instance.fire());

const inset = () => document.documentElement.style.getPropertyValue('--bottom-overlay');

const addBanner = (height: number) => {
  const banner = document.createElement('p');
  banner.className = 'firebase-emulator-warning';
  banner.getBoundingClientRect = () => ({ height }) as DOMRect;
  document.body.append(banner);
  return banner;
};

afterEach(() => {
  document.body.innerHTML = '';
  ObserverStub.instances = [];
  document.documentElement.style.removeProperty('--bottom-overlay');
});

describe('useBottomOverlayInset', () => {
  it('publishes zero when no overlay exists', () => {
    renderHook(() => useBottomOverlayInset());

    expect(inset()).toBe('0px');
  });

  it('publishes the measured height once an overlay is inserted', () => {
    renderHook(() => useBottomOverlayInset());

    addBanner(51);
    flush();

    expect(inset()).toBe('51px');
  });

  it('follows the height while the overlay is present', () => {
    renderHook(() => useBottomOverlayInset());
    addBanner(51);
    flush();

    // Simulate the banner wrapping to two lines.
    document.querySelector('.firebase-emulator-warning')!.getBoundingClientRect = () =>
      ({ height: 64 }) as DOMRect;
    flush();

    expect(inset()).toBe('64px');
  });

  it('returns to zero when the overlay goes away and clears on unmount', () => {
    const { unmount } = renderHook(() => useBottomOverlayInset());
    const banner = addBanner(51);
    flush();
    expect(inset()).toBe('51px');

    banner.remove();
    flush();
    expect(inset()).toBe('0px');

    unmount();
    expect(inset()).toBe('');
  });
});
