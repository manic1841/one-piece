import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AdvancedDisclosure } from './AdvancedDisclosure';

describe('AdvancedDisclosure', () => {
  it('hides children while closed and reports toggle intent', () => {
    const onOpenChange = vi.fn();
    render(
      <AdvancedDisclosure label="Advanced" open={false} onOpenChange={onOpenChange}>
        <span>Growth Rate</span>
      </AdvancedDisclosure>,
    );

    expect(screen.queryByText('Growth Rate')).not.toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: 'Advanced' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });
});
