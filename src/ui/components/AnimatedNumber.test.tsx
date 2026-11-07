import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AnimatedNumber } from './AnimatedNumber';

const format = (value: number) => value.toFixed(0);

const setReducedMotion = (matches: boolean) => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? matches : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

/** Frame clock the component can drive, flushed one step at a time. */
const stubFrames = () => {
  let now = 0;
  let pending: FrameRequestCallback | null = null;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    pending = callback;
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {
    pending = null;
    return 1;
  });
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  return {
    advance(ms: number) {
      now = ms;
      const callback = pending;
      pending = null;
      callback?.(now);
    },
  };
};

describe('AnimatedNumber', () => {
  beforeEach(() => {
    setReducedMotion(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shows the first value immediately, without counting up', () => {
    stubFrames();
    render(<AnimatedNumber value={1000} format={format} />);
    expect(screen.getByText('1000')).toBeInTheDocument();
  });

  it('interpolates from the confirmed value to the new one', () => {
    const frames = stubFrames();
    const { rerender } = render(<AnimatedNumber value={0} format={format} />);

    rerender(<AnimatedNumber value={100} format={format} />);
    act(() => frames.advance(0));
    expect(screen.getByText('0')).toBeInTheDocument();

    act(() => frames.advance(200));
    const midway = Number(screen.getByText(/^\d+$/).textContent);
    expect(midway).toBeGreaterThan(0);
    expect(midway).toBeLessThan(100);

    act(() => frames.advance(400));
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('jumps straight to the new value under reduced motion', () => {
    setReducedMotion(true);
    const frames = stubFrames();
    const { rerender } = render(<AnimatedNumber value={0} format={format} />);

    rerender(<AnimatedNumber value={100} format={format} />);
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(frames).toBeDefined();
  });

  it('cancels the pending frame on unmount', () => {
    const cancel = vi.fn();
    stubFrames();
    vi.stubGlobal('cancelAnimationFrame', cancel);

    const { rerender, unmount } = render(<AnimatedNumber value={0} format={format} />);
    rerender(<AnimatedNumber value={100} format={format} />);
    unmount();

    expect(cancel).toHaveBeenCalled();
  });

  it('renders the missing form for a null value', () => {
    stubFrames();
    render(<AnimatedNumber value={null} format={format} missing="—" />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('reaches the settled value after a null hop mid-flight', () => {
    const frames = stubFrames();
    const { rerender } = render(<AnimatedNumber value={1000} format={format} />);

    rerender(<AnimatedNumber value={2000} format={format} />);
    act(() => frames.advance(200));
    expect(Number(screen.getByText(/^\d+$/).textContent)).toBeLessThan(2000);

    rerender(<AnimatedNumber value={null} format={format} />);
    expect(screen.getByText('—')).toBeInTheDocument();

    rerender(<AnimatedNumber value={3000} format={format} />);
    expect(screen.getByText('3000')).toBeInTheDocument();
  });

  it('announces only once the interpolation has settled', () => {
    const frames = stubFrames();
    const { rerender, container } = render(<AnimatedNumber value={0} format={format} />);
    const node = container.firstElementChild;
    expect(node?.getAttribute('aria-live')).toBe('polite');

    rerender(<AnimatedNumber value={100} format={format} />);
    act(() => frames.advance(0));
    expect(node?.getAttribute('aria-live')).toBe('off');

    act(() => frames.advance(400));
    expect(node?.getAttribute('aria-live')).toBe('polite');
  });
});
