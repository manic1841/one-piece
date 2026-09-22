import { fireEvent, render, screen } from '@testing-library/react';

import { CLOSE_STAGE_ORDER } from '@/ui/constants/monthlyClose';
import type { CloseStageItemVM } from '../viewmodels/monthlyClose.vm';
import { ClosePipeline } from './ClosePipeline';

const stage = (stageId: string, overrides: Partial<CloseStageItemVM> = {}): CloseStageItemVM => ({
  stageId: stageId as CloseStageItemVM['stageId'],
  label: stageId,
  status: 'PENDING',
  isCompleted: false,
  isReviewSource: false,
  isStale: false,
  confirmedByText: null,
  confirmedAtText: null,
  ...overrides,
});

const renderPipeline = (
  overrides: {
    stages?: CloseStageItemVM[];
    isClosed?: boolean;
    isPaused?: boolean;
    onSelectStage?: (stageId: string) => void;
  } = {},
) => {
  const stages = overrides.stages ?? CLOSE_STAGE_ORDER.map((stageId) => stage(stageId));
  const onSelectStage = overrides.onSelectStage ?? (() => {});
  render(
    <ClosePipeline
      stages={stages}
      currentStageId="TRANSACTION_VALIDATION"
      viewingStageId={null}
      isClosed={overrides.isClosed ?? false}
      isPaused={overrides.isPaused ?? false}
      statusText="IN PROGRESS"
      positionText="02 / 09"
      onSelectStage={onSelectStage}
    />,
  );
};

describe('ClosePipeline', () => {
  it('is collapsed by default and shows the position progress header', () => {
    renderPipeline();

    expect(screen.queryByRole('list', { name: 'Close workflow pipeline' })).toBeNull();
    expect(screen.getByTestId('close-pipeline-toggle')).toHaveTextContent('SHOW WORKFLOW');
    expect(screen.getByText('02 / 09')).toBeInTheDocument();
  });

  it('expands the stage list on toggle and keeps the interaction model', () => {
    const onSelectStage = vi.fn<(stageId: string) => void>();
    const stages = CLOSE_STAGE_ORDER.map((stageId, index) =>
      stage(stageId, index === 0 ? { isCompleted: true, status: 'COMPLETED' } : {}),
    );

    renderPipeline({ stages, onSelectStage });

    fireEvent.click(screen.getByTestId('close-pipeline-toggle'));

    const list = screen.getByRole('list', { name: 'Close workflow pipeline' });
    expect(list).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(CLOSE_STAGE_ORDER.length + 1);
    expect(screen.getByRole('button', { name: /銀行帳戶餘額/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /交易驗證/ })).toHaveAttribute(
      'aria-current',
      'step',
    );
    expect(screen.getByRole('button', { name: /證券買入／賣出/ })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /銀行帳戶餘額/ }));
    expect(onSelectStage).toHaveBeenCalledWith('ACCOUNT_BALANCE');

    fireEvent.click(screen.getByTestId('close-pipeline-toggle'));
    expect(screen.queryByRole('list', { name: 'Close workflow pipeline' })).toBeNull();
    expect(screen.getByTestId('close-pipeline-toggle')).toHaveTextContent('SHOW WORKFLOW');
  });
});
