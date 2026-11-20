import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PetAvatar from './PetAvatar';
import type { PetManifest } from './petManifest';

/**
 * Pixel Pet art seam: the mood picks an animation, and the manifest alone says
 * how it is drawn and timed. These tests pin the drawing half — frame 0 on
 * entry, one step per frame delay, `loop` honoured, Facing mirrored and flipped,
 * `onEnd` reported for event moods, a continuous mood cycling to the next
 * binding, and that an unbound mood falls back to the placeholder.
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
          timing: { frameMs: 100, overrideMs: {} },
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
          timing: { frameMs: 100, overrideMs: {} },
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
          timing: { frameMs: 100, overrideMs: {} },
          loop: false,
          flipsFacing: false,
        },
      ],
      [
        'cycle-a',
        {
          id: 'cycle-a',
          sheet: 'clips/idle.png',
          frameCount: 3,
          timing: { frameMs: 100, overrideMs: {} },
          loop: false,
          flipsFacing: false,
        },
      ],
      [
        'cycle-b',
        {
          id: 'cycle-b',
          sheet: 'clips/happy.png',
          frameCount: 2,
          timing: { frameMs: 100, overrideMs: {} },
          loop: false,
          flipsFacing: false,
        },
      ],
      [
        'pinned',
        {
          id: 'pinned',
          sheet: 'clips/happy.png',
          frameCount: 2,
          timing: { frameMs: 100, overrideMs: {} },
          loop: true,
          flipsFacing: false,
        },
      ],
      [
        'flip',
        {
          id: 'flip',
          sheet: 'clips/idle.png',
          frameCount: 2,
          timing: { frameMs: 100, overrideMs: {} },
          loop: false,
          flipsFacing: true,
        },
      ],
      [
        'wide',
        {
          id: 'wide',
          sheet: 'clips/idle.png',
          frameCount: 400,
          timing: { frameMs: 100, overrideMs: {} },
          loop: false,
          flipsFacing: false,
        },
      ],
    ]),
    bindings: {
      rest: ['cycle-a', 'cycle-b', 'flip'],
      sleep: ['loop'],
      move: ['wide'],
      nod: ['one-shot', 'pinned'],
      celebrate: ['still'],
    },
  } satisfies PetManifest,
}));

vi.mock('./petManifest', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./petManifest')>();
  return { ...actual, petManifest: FIXTURE, petSheetUrl: () => 'fixture-sheet.png' };
});

const face = () => screen.getByTestId('pet-face');

/** The anchored box: canvas sized, clipped, and the one that carries the facing. */
const box = () => face().parentElement as HTMLElement;

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

  it('still advances when `onEnd` is an inline callback', () => {
    // The gallery passes an inline no-op; a fresh closure per render used to
    // restart the playback effect and pin the strip on frame 1.
    render(<PetAvatar mood="rest" seq={0} onEnd={() => undefined} />);

    tick(100);
    expect(position()).toBe('-48px 0px');
    tick(100);
    expect(position()).toBe('-96px 0px');
  });

  it('draws a strip wider than one raster as slices', () => {
    renderPet('move');

    // 48px frames: the slice holds 341 of them and stops at the raster limit.
    expect(face().style.width).toBe(`${341 * 48}px`);
    expect(face().style.backgroundSize).toBe(`${400 * 48}px 48px`);
    expect(position()).toBe('0px 0px');

    tick(341 * 100);

    expect(face().style.width).toBe(`${(400 - 341) * 48}px`);
    expect(position()).toBe(`-${341 * 48}px 0px`);
  });

  it('falls back to the emoji placeholder when a mood is unbound', () => {
    renderPet('alert');

    expect(face().style.backgroundImage).toBe('');
    expect(face()).toHaveTextContent('⊙');
  });

  it('labels the art with the mood it shows', () => {
    renderPet('celebrate');

    expect(screen.getByRole('img', { name: 'Pixel Pet 領獎' })).toBeInTheDocument();
  });

  it('draws the sheet at canvas size and anchors it by the feet', () => {
    renderPet('celebrate');
    const anchored = box().style;

    expect(anchored.width).toBe('48px');
    expect(anchored.height).toBe('48px');
    expect(anchored.left).toBe('calc(50% - 24px)');
    expect(anchored.bottom).toBe('0px');
    expect(face().style.height).toBe('48px');
    expect(face().style.backgroundSize).toBe('48px 48px');
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
    const onEnd = renderPet('sleep');

    tick(300);

    expect(position()).toBe('0px 0px');
    expect(onEnd).not.toHaveBeenCalled();
  });

  it('reports the end of a one-shot and holds its last frame', () => {
    const onEnd = renderPet('nod');

    tick(200);
    expect(position()).toBe('-48px 0px');

    tick(400);
    expect(position()).toBe('-48px 0px');
    expect(onEnd).toHaveBeenCalledOnce();
  });

  it('cycles to another binding when a continuous mood finishes one', () => {
    const onEnd = renderPet('rest');
    expect(face().style.backgroundSize).toBe('144px 48px');

    tick(300);

    expect(face().style.backgroundSize).toBe('96px 48px');
    expect(position()).toBe('0px 0px');
    expect(onEnd).not.toHaveBeenCalled();
  });

  it('never replays the animation it just finished while another is bound', () => {
    renderPet('rest');

    tick(300);
    tick(200);

    expect(face().style.backgroundSize).toBe('144px 48px');
  });

  it('ends an event mood even when its animation loops', () => {
    // 0.99 picks `pinned`, the looping second binding of `nod`.
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const onEnd = renderPet('nod');

    tick(200);

    expect(onEnd).toHaveBeenCalledOnce();
    expect(position()).toBe('-48px 0px');
  });

  it('does not cycle a continuous mood under reduced motion', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList);

    renderPet('rest');
    tick(500);

    expect(position()).toBe('0px 0px');
    expect(face().style.backgroundSize).toBe('144px 48px');
  });

  it('faces left by default, opposite to the authored direction', () => {
    renderPet('celebrate');

    expect(box().style.transform).toBe('scaleX(-1)');
  });

  it('holds the turned side for one animation and then faces left again', () => {
    // 0.9 selects the last binding: `flip` on entry, then `cycle-b` after it.
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    renderPet('rest');
    expect(box().style.transform).toBe('scaleX(-1)');

    tick(200);
    expect(box().style.transform).toBe('');

    tick(200);
    expect(box().style.transform).toBe('scaleX(-1)');
  });

  it('releases the turned side on the next entry', () => {
    const { rerender } = render(<PetAvatar mood="nod" seq={1} onEnd={vi.fn()} />);
    tick(200);
    expect(box().style.transform).toBe('');

    rerender(<PetAvatar mood="nod" seq={2} onEnd={vi.fn()} />);

    expect(box().style.transform).toBe('scaleX(-1)');
  });

  it('replays the same animation when the sequence advances', () => {
    const { rerender } = render(<PetAvatar mood="nod" seq={1} onEnd={vi.fn()} />);
    tick(200);
    expect(position()).toBe('-48px 0px');

    rerender(<PetAvatar mood="nod" seq={2} onEnd={vi.fn()} />);

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

    const onEnd = renderPet('nod');
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

    renderPet('nod');

    expect(box().style.transform).toBe('');
  });
});
