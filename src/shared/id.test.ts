import { afterEach, describe, expect, it, vi } from 'vitest';

import { newId } from './id';

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('newId', () => {
  it('prefers crypto.randomUUID when the context exposes it', () => {
    const randomUUID = vi.fn(() => 'from-random-uuid');
    vi.stubGlobal('crypto', { randomUUID });

    expect(newId()).toBe('from-random-uuid');
    expect(randomUUID).toHaveBeenCalledTimes(1);
  });

  it('falls back to a v4 UUID built from getRandomValues in non-secure contexts', () => {
    const getRandomValues = vi.fn((bytes: Uint8Array) => bytes.fill(0xab));
    vi.stubGlobal('crypto', { getRandomValues });

    const id = newId();
    expect(getRandomValues).toHaveBeenCalledTimes(1);
    expect(id).toMatch(UUID_V4_PATTERN);
  });

  it('falls back to a timestamp id when no WebCrypto is available', () => {
    vi.stubGlobal('crypto', undefined);

    expect(newId()).toMatch(/^id-[a-z0-9]+-[a-z0-9]+$/);
  });
});
