import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from '@/ui/components/ui/button';

import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders status title, description, and action', () => {
    render(
      <EmptyState
        title="NO TRANSACTIONS"
        description="No transactions have been recorded for this period."
        action={<Button>+ ADD TRANSACTION</Button>}
      />,
    );

    expect(screen.getByText('NO TRANSACTIONS')).toBeInTheDocument();
    expect(
      screen.getByText('No transactions have been recorded for this period.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ ADD TRANSACTION' })).toBeInTheDocument();
  });

  it('renders without an action', () => {
    render(<EmptyState title="NO DATA" description="Nothing here yet." />);

    expect(screen.getByText('NO DATA')).toBeInTheDocument();
  });
});
