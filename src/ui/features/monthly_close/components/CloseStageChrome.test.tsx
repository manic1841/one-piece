import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CloseStageChrome } from './CloseStageChrome';

describe('CloseStageChrome', () => {
  it('renders the step header, progress, and evidence slot', () => {
    render(
      <CloseStageChrome
        stepText="05 債務還款"
        progressText="05 / 09"
        confirmedAtText="2026-09-27 10:00 由 user@test.com 確認"
        confirming={false}
        isConfirmable
        showActions
        onConfirm={() => undefined}
      >
        <p>evidence slot</p>
      </CloseStageChrome>,
    );

    expect(screen.getByText('當前步驟')).toBeInTheDocument();
    expect(screen.getByText('05 債務還款')).toBeInTheDocument();
    expect(screen.getByText('05 / 09')).toBeInTheDocument();
    expect(screen.getByText('2026-09-27 10:00 由 user@test.com 確認')).toBeInTheDocument();
    expect(screen.getByText('evidence slot')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CONTINUE →' })).toBeEnabled();
  });

  it('shows the loading label while confirming and disables the action', () => {
    render(
      <CloseStageChrome
        stepText="05 債務還款"
        progressText="05 / 09"
        confirming
        isConfirmable
        showActions
        onConfirm={() => undefined}
      >
        <p>evidence slot</p>
      </CloseStageChrome>,
    );

    expect(screen.getByRole('button', { name: '載入中...' })).toBeDisabled();
  });

  it('disables the confirm button when the stage is not confirmable', () => {
    render(
      <CloseStageChrome
        stepText="05 債務還款"
        progressText="05 / 09"
        confirming={false}
        isConfirmable={false}
        showActions
        onConfirm={() => undefined}
      >
        <p>evidence slot</p>
      </CloseStageChrome>,
    );

    expect(screen.getByRole('button', { name: 'CONTINUE →' })).toBeDisabled();
  });

  it('shows the reconfirm label and back button while reviewing and wires both actions', () => {
    const onConfirm = vi.fn();
    const onBackToCurrent = vi.fn();
    render(
      <CloseStageChrome
        stepText="05 債務還款"
        progressText="05 / 09"
        confirming={false}
        isReviewing
        isConfirmable
        showActions
        onConfirm={onConfirm}
        onBackToCurrent={onBackToCurrent}
      >
        <p>evidence slot</p>
      </CloseStageChrome>,
    );

    expect(screen.getByRole('button', { name: '重新確認，繼續關帳' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '返回當前步驟' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '重新確認，繼續關帳' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: '返回當前步驟' }));
    expect(onBackToCurrent).toHaveBeenCalledTimes(1);
  });

  it('hides the action bar when actions are hidden', () => {
    render(
      <CloseStageChrome
        stepText="05 債務還款"
        progressText="05 / 09"
        confirming={false}
        isConfirmable
        showActions={false}
        isReadOnly={false}
        onConfirm={() => undefined}
      >
        <p>evidence slot</p>
      </CloseStageChrome>,
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('hides the action bar in a read-only period even when actions are shown', () => {
    render(
      <CloseStageChrome
        stepText="05 債務還款"
        progressText="05 / 09"
        confirming={false}
        isConfirmable
        showActions
        isReadOnly
        onConfirm={() => undefined}
      >
        <p>evidence slot</p>
      </CloseStageChrome>,
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
