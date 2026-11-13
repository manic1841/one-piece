import { describe, expect, it } from 'vitest';

import { flippedFacing, parsePetManifest, pickAnimation } from './petManifest';

const SHEETS = {
  'clips/idle.png': 'url-idle',
  'clips/turn.png': 'url-turn',
};

const raw = (overrides: Record<string, unknown> = {}) => ({
  formatVersion: '1.2.0',
  target: 'pixel-pet',
  character: 'kirby',
  authoredFacing: 'right',
  canvas: { width: 60, height: 84, anchor: { x: 30, y: 76 } },
  animations: {
    idle: { sheet: 'clips/idle.png', frameCount: 4, delaysMs: [80, 120, 120, 200], loop: true },
    turn: {
      sheet: 'clips/turn.png',
      frameCount: 2,
      delaysMs: [50],
      loop: false,
      flipsFacing: true,
    },
  },
  bindings: { rest: ['idle'], celebrate: ['idle', 'turn'] },
  lock: { spriteForgeVersion: '0.1.0', exportedAt: '2026-11-13T00:00:00Z' },
  ...overrides,
});

describe('parsePetManifest', () => {
  it('reads canvas, animations and bindings from a valid manifest', () => {
    const manifest = parsePetManifest(raw(), SHEETS);

    expect(manifest?.canvas).toEqual({ width: 60, height: 84, anchor: { x: 30, y: 76 } });
    expect(manifest?.animations.get('turn')?.flipsFacing).toBe(true);
    expect(manifest?.bindings.celebrate).toEqual(['idle', 'turn']);
  });

  it('ignores fields it does not own', () => {
    expect(parsePetManifest(raw({ extra: true }), SHEETS)).not.toBeNull();
  });

  it('rejects a manifest from another major version', () => {
    expect(parsePetManifest(raw({ formatVersion: '2.0.0' }), SHEETS)).toBeNull();
  });

  it('rejects an unreadable facing or canvas', () => {
    expect(parsePetManifest(raw({ authoredFacing: 'up' }), SHEETS)).toBeNull();
    expect(parsePetManifest(raw({ canvas: { width: 0, height: 84 } }), SHEETS)).toBeNull();
  });

  it('drops animations whose sheet did not ship', () => {
    const manifest = parsePetManifest(raw(), { 'clips/idle.png': 'url-idle' });

    expect(manifest?.animations.has('turn')).toBe(false);
  });

  it('fails when no animation survives', () => {
    expect(parsePetManifest(raw(), {})).toBeNull();
  });

  it('rejects a malformed animation or binding', () => {
    expect(
      parsePetManifest(
        raw({
          animations: {
            idle: { sheet: 'clips/idle.png', frameCount: 0, delaysMs: [1], loop: true },
          },
        }),
        SHEETS,
      ),
    ).toBeNull();
    expect(
      parsePetManifest(
        raw({
          animations: {
            idle: { sheet: 'clips/idle.png', frameCount: 1, delaysMs: [], loop: true },
          },
        }),
        SHEETS,
      ),
    ).toBeNull();
    expect(parsePetManifest(raw({ bindings: { rest: [] } }), SHEETS)).toBeNull();
    expect(parsePetManifest(raw({ bindings: { rest: 'idle' } }), SHEETS)).toBeNull();
  });

  it('rejects a binding key the app has no behaviour for', () => {
    expect(parsePetManifest(raw({ bindings: { idle: ['idle'] } }), SHEETS)).toBeNull();
  });
});

describe('pickAnimation', () => {
  const manifest = parsePetManifest(raw(), SHEETS);

  it('returns null for an unbound Situation', () => {
    expect(pickAnimation(manifest, 'alert')).toBeNull();
  });

  it('returns null without a manifest', () => {
    expect(pickAnimation(null, 'rest')).toBeNull();
  });

  it('picks among the bound animations by the supplied random', () => {
    expect(pickAnimation(manifest, 'celebrate', () => 0)?.id).toBe('idle');
    expect(pickAnimation(manifest, 'celebrate', () => 0.99)?.id).toBe('turn');
  });

  it('skips bindings that point at a dropped animation', () => {
    const partial = parsePetManifest(raw({ bindings: { celebrate: ['turn', 'idle'] } }), {
      'clips/idle.png': 'url-idle',
    });

    expect(pickAnimation(partial, 'celebrate')?.id).toBe('idle');
  });
});

describe('flippedFacing', () => {
  it('toggles the facing', () => {
    expect(flippedFacing('right')).toBe('left');
    expect(flippedFacing('left')).toBe('right');
  });
});
