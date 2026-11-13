import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PetAvatar from './PetAvatar';
import type { PetManifest } from './petManifest';

/**
 * Pixel Pet art seam: the mood picks an animation, and the manifest alone says
 * how it is drawn and timed. These tests pin the drawing half — frame 0 on
 * entry, one step per `delaysMs`, `loop` honoured, Facing mirrored and flipped,
 * `onEnd` reported for one-shots — and that an unbound mood falls back to the
 * placeholder.
 */

const { FIXTURE } = vi.hoisted(() => ({
  FIXTURE: {
    canvas: { width: 48, height: 48, anchor: { x: 24, y: 48 } },
    authoredFacing: 'right',
    animations: new Map([
      [
        'loop',
        {
          id: 'loop',
          sheet: 'clips/idle.png',
          frameCount: 3,
          delaysMs: [100],
          loop: true,
          flipsFacing: false,
        },
      ],
      [
        'one-shot',
        {
          id: 'one-shot',
          sheet: 'clips/happy.png',
          frameCount: 2,
          delaysMs: [100],
          loop: false,
          flipsFacing: true,
        },
      ],
      [
        'still',
        {
          id: 'still',
          sheet: 'clips/happy.png',
          frameCount: 1,
          delaysMs: [100],
          loop: true,
          flipsFacing: false,
        },
      ],
    ]),
    bindings: { rest: ['loop'], celebrate: ['still'], alert: ['one-shot'] },
  } satisfies PetManifest,
}));

vi.mock('./petManifest', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./petManifest')>();
  return { ...actual, petManifest: FIXTURE, petSheetUrl: () => 'fixture-sheet.png' };
});

const face = () => screen.getByTestId('pet-face');

const position = () => face().style.backgroundPosition;

const tick = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

const renderPet = (mood: 'rest' | 'sleep' | 'move' | 'nod' | 'celebrate' | 'alert', seq = 0) => {
  const onEnd = vi.fn();
  render(<PetAvatar mood={mood} seq={seq} onEnd={onEnd} />);
  return onEnd;
};

describe('PetAvatar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Deterministic pick: always the first bound animation.
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('falls back to the emoji placeholder when a mood is unbound', () => {
    renderPet('nod');

    expect(face().style.backgroundImage).toBe('');
    expect(face()).toHaveTextContent('◠');
  });

  it('labels the art with the mood it shows', () => {
    renderPet('celebrate');

    expect(screen.getByRole('img', { name: 'Pixel Pet 領獎' })).toBeInTheDocument();
  });

  it('draws the sheet at canvas size and anchors it', () => {
    renderPet('celebrate');
    const style = face().style;

    expect(style.width).toBe('48px');
    expect(style.height).toBe('48px');
    expect(style.left).toBe('calc(50% - 24px)');
    expect(style.top).toBe('calc(50% - 48px)');
    expect(style.backgroundSize).toBe('48px 48px');
  });

  it('rests on frame 0 before the first delay elapses', () => {
    renderPet('rest');

    expect(position()).toBe('0px 0px');
  });

  it('walks one frame per delay', () => {
    renderPet('rest');

    tick(100);
    expect(position()).toBe('-48px 0px');

    tick(100);
    expect(position()).toBe('-96px 0px');
  });

  it('wraps a looping animation back to frame 0 without reporting an end', () => {
    const onEnd = renderPet('rest');

    tick(300);

    expect(position()).toBe('0px 0px');
    expect(onEnd).not.toHaveBeenCalled();
  });

  it('reports the end of a one-shot and holds its last frame', () => {
    const onEnd = renderPet('alert');

    tick(200);
    expect(position()).toBe('-48px 0px');

    tick(400);
    expect(position()).toBe('-48px 0px');
    expect(onEnd).toHaveBeenCalledOnce();
  });

  it('mirrors after a flipsFacing animation ends', () => {
    renderPet('alert');
    expect(face().style.transform).toBe('');

    tick(200);

    expect(face().style.transform).toBe('scaleX(-1)');
  });

  it('replays the same animation when the sequence advances', () => {
    const { rerender } = render(<PetAvatar mood="alert" seq={1} onEnd={vi.fn()} />);
    tick(200);
    expect(position()).toBe('-48px 0px');

    rerender(<PetAvatar mood="alert" seq={2} onEnd={vi.fn()} />);

    expect(position()).toBe('0px 0px');
  });

  it('reports the end immediately for a single-frame animation', () => {
    const onEnd = renderPet('celebrate');

    expect(onEnd).toHaveBeenCalled();
  });

  it('stays on frame 0 under reduced motion and ends the mood', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList);

    const onEnd = renderPet('alert');
    tick(500);

    expect(position()).toBe('0px 0px');
    expect(onEnd).toHaveBeenCalled();
  });

  it('still applies the facing flip under reduced motion', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList);

    renderPet('alert');

    expect(face().style.transform).toBe('scaleX(-1)');
  });
});
