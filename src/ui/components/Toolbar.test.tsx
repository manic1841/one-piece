import { Button } from '@/ui/components/ui/button';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Toolbar } from './Toolbar';

describe('Toolbar', () => {
  it('renders leading content and trailing actions', () => {
    render(
      <Toolbar actions={<Button variant="primary">+ ADD TRANSACTION</Button>}>
        <span>5 SELECTED</span>
      </Toolbar>,
    );

    expect(screen.getByText('5 SELECTED')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ ADD TRANSACTION' })).toBeInTheDocument();
  });

  it('renders without actions', () => {
    render(<Toolbar>EXPORT READY</Toolbar>);

    expect(screen.getByText('EXPORT READY')).toBeInTheDocument();
  });
});
