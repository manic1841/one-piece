import { type ComponentProps } from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmDialogProvider } from '@/ui/components/confirm/ConfirmDialog';
import {
  type RetirementOneTimeEvent,
  mapRetirementEventToVM,
} from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';

import { LifeEventsSection } from './LifeEventsSection';

vi.mock('@/ui/components/Toast', () => ({ showToast: vi.fn() }));

const event: RetirementOneTimeEvent = {
  id: 'e1',
  name: '購屋',
  type: 'expense',
  phases: [{ name: '頭期款', startYear: 2028, endYear: 2030, amount: 500000 }],
};

type Props = ComponentProps<typeof LifeEventsSection>;

function renderSection(overrides: Partial<Props> = {}) {
  const props: Props = {
    currentYear: 2026,
    loading: false,
    error: null,
    onRetry: vi.fn(),
    range: { startYear: 2026, endYear: 2076 },
    eventItems: [{ domain: event, vm: mapRetirementEventToVM(event, 2) }],
    handleAddEvent: vi.fn().mockResolvedValue(undefined),
    handleUpdateEvent: vi.fn().mockResolvedValue(undefined),
    handleDeleteEvent: vi.fn().mockResolvedValue(undefined),
    handleAddPhase: vi.fn().mockResolvedValue(undefined),
    handleUpdatePhase: vi.fn().mockResolvedValue(undefined),
    handleDeletePhase: vi.fn().mockResolvedValue(undefined),
    handleTimelineUpdatePhase: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  render(
    <ConfirmDialogProvider>
      <LifeEventsSection {...props} />
    </ConfirmDialogProvider>,
  );
  return props;
}

describe('LifeEventsSection', () => {
  it('shows the Data Table view by default (no window controls)', () => {
    renderSection();
    expect(screen.getByText('終身費用總和')).toBeInTheDocument();
    expect(screen.queryByText('WINDOW')).not.toBeInTheDocument();
  });

  it('switches to the Timeline view exclusively', () => {
    renderSection();
    const timelineTab = screen.getByRole('button', { name: 'Timeline' });
    expect(timelineTab).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(timelineTab);

    expect(timelineTab).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('WINDOW')).toBeInTheDocument();
    // The Data Table column is gone — the two views never render together.
    expect(screen.queryByText('終身費用總和')).not.toBeInTheDocument();
  });

  it('switches back to the Data Table', () => {
    renderSection();
    fireEvent.click(screen.getByRole('button', { name: 'Timeline' }));
    fireEvent.click(screen.getByRole('button', { name: 'Data Table' }));
    expect(screen.queryByText('WINDOW')).not.toBeInTheDocument();
    expect(screen.getByText('終身費用總和')).toBeInTheDocument();
  });
});
