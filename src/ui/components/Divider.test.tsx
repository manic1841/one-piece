import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Divider } from './Divider';

describe('Divider', () => {
  it('renders a horizontal rule', () => {
    render(<Divider />);

    expect(screen.getByRole('separator')).toBeInTheDocument();
  });
});
