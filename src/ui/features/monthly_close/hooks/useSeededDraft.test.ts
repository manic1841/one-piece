import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useSeededDraft } from './useSeededDraft';

const renderDraft = (source: string[] | null) =>
  renderHook(({ s }: { s: string[] | null }) => useSeededDraft(s), { initialProps: { s: source } });

describe('useSeededDraft', () => {
  it('seeds from a known source', () => {
    const { result } = renderDraft(['a']);

    expect(result.current[0]).toEqual(['a']);
  });

  it('does not seed while the source is unknown', () => {
    const { result } = renderDraft(null);

    expect(result.current[0]).toBeNull();
  });

  it('treats an empty array source as a known empty draft', () => {
    const { result } = renderDraft([]);

    expect(result.current[0]).toEqual([]);
  });

  it('treats an empty object source as a known empty draft', () => {
    const { result } = renderHook(
      ({ s }: { s: Record<string, number> | null }) => useSeededDraft(s),
      { initialProps: { s: {} } },
    );

    expect(result.current[0]).toEqual({});
  });

  it('follows the latest source while the draft is not owned', () => {
    const { result, rerender } = renderDraft(['a']);

    rerender({ s: ['b'] });

    expect(result.current[0]).toEqual(['b']);
  });

  it('seeds the draft when an unknown source resolves', () => {
    const { result, rerender } = renderDraft(null);

    rerender({ s: ['a'] });

    expect(result.current[0]).toEqual(['a']);
  });

  it('freezes the draft once set, ignoring same-source reloads', () => {
    const { result, rerender } = renderDraft(['a']);

    act(() => result.current[1](['edited']));
    rerender({ s: ['b'] });

    expect(result.current[0]).toEqual(['edited']);
  });

  it('composes two sequential updates made in one action', () => {
    const { result } = renderDraft(['a', 'b']);

    act(() => {
      result.current[1]((previous) => previous.filter((item) => item !== 'b'));
      result.current[1]((previous) => [...previous, 'c']);
    });

    expect(result.current[0]).toEqual(['a', 'c']);
  });

  it('seeds a fresh draft when remounted with a new source', () => {
    const first = renderDraft(['a']);
    act(() => first.result.current[1](['edited']));
    expect(first.result.current[0]).toEqual(['edited']);
    first.unmount();

    const { result } = renderDraft(['c']);

    expect(result.current[0]).toEqual(['c']);
  });
});
