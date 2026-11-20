import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AdvancedDisclosure } from './AdvancedDisclosure';

describe('AdvancedDisclosure', () => {
  it('keeps children mounted but inert while closed, and reports toggle intent', () => {
    const onOpenChange = vi.fn();
    render(
      <AdvancedDisclosure label="Advanced" open={false} onOpenChange={onOpenChange}>
        <span>Growth Rate</span>
      </AdvancedDisclosure>,
    );

    // Mounted so it can animate out; inert keeps it out of the tab order.
    const body = screen.getByText('Growth Rate').closest('[data-state]');
    expect(body).toHaveAttribute('data-state', 'closed');
    expect(body).toHaveAttribute('inert');

    fireEvent.click(screen.getByRole('button', { name: 'Advanced' }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it('reveals children and marks expanded when open', () => {
    render(
      <AdvancedDisclosure label="Advanced" open onOpenChange={() => undefined}>
        <span>Growth Rate</span>
      </AdvancedDisclosure>,
    );

    expect(screen.getByText('Growth Rate')).toBeInTheDocument();
    expect(screen.getByText('Growth Rate').closest('[data-state]')).toHaveAttribute(
      'data-state',
      'open',
    );
    expect(screen.getByRole('button', { name: 'Advanced' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });
});
