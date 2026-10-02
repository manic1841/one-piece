import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FinancialNumber } from './FinancialNumber';

describe('FinancialNumber', () => {
  it('renders the preformatted value in mono tabular numerals', () => {
    render(<FinancialNumber value="$4,812,430" />);

    expect(screen.getByText('$4,812,430')).toBeInTheDocument();
  });

  it('renders the missing-data form when value is nullish', () => {
    render(<FinancialNumber value={null} />);

    expect(screen.getByText('$ —')).toBeInTheDocument();
  });

  it('applies the hero size and tone classes', () => {
    const { container } = render(
      <FinancialNumber value="+12.42%" size="hero" tone="positive" />,
    );

    const number = container.firstElementChild as HTMLElement;
    expect(number.className).toContain('text-4xl');
    expect(number.className).toContain('text-positive');
  });
});
