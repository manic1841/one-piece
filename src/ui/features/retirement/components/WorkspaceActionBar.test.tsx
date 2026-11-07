import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WorkspaceActionBar } from './WorkspaceActionBar';

const renderBar = (calculating: boolean) =>
  render(
    <WorkspaceActionBar
      preview={false}
      readiness={{ ready: true, blockers: [] }}
      calculating={calculating}
      canSave
      onCalculate={() => {}}
      onBack={() => {}}
      onSave={() => {}}
    />,
  );

describe('WorkspaceActionBar calculate pending', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('names the running task for assistive tech', () => {
    renderBar(true);

    expect(screen.getByRole('status')).toHaveTextContent('CALCULATING');
  });

  it('waits before drawing the ring, and drops it when the wait ends', () => {
    const { rerender } = renderBar(true);
    expect(screen.queryByTestId('orbit-loader')).toBeNull();

    act(() => void vi.advanceTimersByTime(300));
    expect(screen.queryByTestId('orbit-loader')).not.toBeNull();

    rerender(
      <WorkspaceActionBar
        preview
        readiness={{ ready: true, blockers: [] }}
        calculating={false}
        canSave
        onCalculate={() => {}}
        onBack={() => {}}
        onSave={() => {}}
      />,
    );
    expect(screen.queryByTestId('orbit-loader')).toBeNull();
  });

  it('shows no ring when idle', () => {
    renderBar(false);

    expect(screen.getByRole('status')).toHaveTextContent('CALCULATE');
    expect(screen.queryByTestId('orbit-loader')).toBeNull();
  });
});
