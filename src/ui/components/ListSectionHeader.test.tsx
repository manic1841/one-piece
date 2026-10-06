import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ListSectionHeader } from './ListSectionHeader';

describe('ListSectionHeader', () => {
  it('renders the title with the count and the trailing actions', () => {
    render(
      <ListSectionHeader
        title="Income Streams"
        count={3}
        actions={<button type="button">IMPORT</button>}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Income Streams (3)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'IMPORT' })).toBeInTheDocument();
  });

  it('omits the count and the actions row when not provided', () => {
    render(<ListSectionHeader title="Assumptions" />);

    expect(screen.getByRole('heading', { name: 'Assumptions' })).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
