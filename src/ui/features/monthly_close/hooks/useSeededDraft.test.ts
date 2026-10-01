import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useSeededDraft } from './useSeededDraft';

const renderDraft = (key: string, source: string[] | null) =>
  renderHook(({ k, s }: { k: string; s: string[] | null }) => useSeededDraft(k, s), {
    initialProps: { k: key, s: source },
  });

describe('useSeededDraft', () => {
  it('seeds from a known source', () => {
    const { result } = renderDraft('2026-08', ['a']);

    expect(result.current[0]).toEqual(['a']);
  });

  it('does not seed while the source is unknown', () => {
    const { result } = renderDraft('2026-08', null);

    expect(result.current[0]).toBeNull();
  });

  it('treats an empty array source as a known empty draft', () => {
    const { result } = renderDraft('2026-08', []);

    expect(result.current[0]).toEqual([]);
  });

  it('treats an empty object source as a known empty draft', () => {
    const { result } = renderHook(
      ({ k, s }: { k: string; s: Record<string, number> | null }) => useSeededDraft(k, s),
      { initialProps: { k: '2026-08', s: {} } },
    );

    expect(result.current[0]).toEqual({});
  });

  it('follows the latest source while the draft is not owned', () => {
    const { result, rerender } = renderDraft('2026-08', ['a']);

    rerender({ k: '2026-08', s: ['b'] });

    expect(result.current[0]).toEqual(['b']);
  });

  it('freezes the draft once set, ignoring same-key reloads', () => {
    const { result, rerender } = renderDraft('2026-08', ['a']);

    act(() => result.current[1](['edited']));
    rerender({ k: '2026-08', s: ['b'] });

    expect(result.current[0]).toEqual(['edited']);
  });

  it('retires the owned draft on a key change and seeds the new key', () => {
    const { result, rerender } = renderDraft('2026-08', ['a']);
    act(() => result.current[1](['edited']));

    rerender({ k: '2026-09', s: ['c'] });

    expect(result.current[0]).toEqual(['c']);
  });

  it('shows the new key as unknown until its source arrives', () => {
    const { result, rerender } = renderDraft('2026-08', ['a']);
    act(() => result.current[1](['edited']));

    rerender({ k: '2026-09', s: null });

    expect(result.current[0]).toBeNull();
  });

  it('composes two sequential updates made in one action', () => {
    const { result } = renderDraft('2026-08', ['a', 'b']);

    act(() => {
      result.current[1]((previous) => previous.filter((item) => item !== 'b'));
      result.current[1]((previous) => [...previous, 'c']);
    });

    expect(result.current[0]).toEqual(['a', 'c']);
  });
});
