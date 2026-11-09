import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OrbitLoader } from './OrbitLoader';

const setReducedMotion = (matches: boolean) => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? matches : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

describe('OrbitLoader', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('stays hidden until the wait is long enough to matter', () => {
    render(<OrbitLoader />);
    expect(screen.queryByTestId('orbit-loader')).toBeNull();

    act(() => void vi.advanceTimersByTime(299));
    expect(screen.queryByTestId('orbit-loader')).toBeNull();

    act(() => void vi.advanceTimersByTime(1));
    expect(screen.queryByTestId('orbit-loader')).not.toBeNull();
  });

  it('is decorative so the caller keeps the status text', () => {
    render(<OrbitLoader appearAfterMs={0} />);

    expect(screen.getByTestId('orbit-loader').getAttribute('aria-hidden')).toBe('true');
  });

  it('disappears when the pending work ends', () => {
    const { unmount } = render(<OrbitLoader appearAfterMs={0} />);
    expect(screen.queryByTestId('orbit-loader')).not.toBeNull();

    unmount();
    expect(screen.queryByTestId('orbit-loader')).toBeNull();
  });

  it('keeps a still ring under reduced motion', () => {
    setReducedMotion(true);
    render(<OrbitLoader appearAfterMs={0} />);

    const loaders = screen.getAllByTestId('orbit-loader');
    expect(loaders.length).toBeGreaterThan(0);
    // The spin is gated by `motion-safe`, so the reduced branch keeps the ring
    // but the browser stops driving it.
    expect(document.querySelector('.motion-safe\\:animate-spin')).not.toBeNull();
  });
});
