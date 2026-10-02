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
    render(<FinancialNumber value="+12.42%" size="hero" tone="positive" />);

    const number = screen.getByText('+12.42%');
    expect(number.className).toContain('text-4xl');
    expect(number.className).toContain('text-positive');
  });

  it('renders an optional change line with its own tone', () => {
    render(
      <FinancialNumber
        value="NT$4,812,430"
        size="hero"
        change="+8.42% YTD"
        changeTone="positive"
      />,
    );

    const change = screen.getByText('+8.42% YTD');
    expect(change.className).toContain('text-positive');
    expect(change.className).toContain('font-mono');
  });

  it('omits the change line when no change is provided', () => {
    const { container } = render(<FinancialNumber value="NT$4,812,430" />);

    expect(container.querySelectorAll('span')).toHaveLength(2);
  });
});
