import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('renders the crumb above the title when provided', () => {
    render(<PageHeader title="BROKERAGE" crumb="ACCOUNTS / BROKERAGE" />);

    expect(screen.getByText('ACCOUNTS / BROKERAGE')).toBeInTheDocument();
    expect(screen.getByText('BROKERAGE')).toBeInTheDocument();
  });

  it('applies the bottom border to the header container', () => {
    const { container } = render(<PageHeader title="TRANSACTIONS" />);

    const header = container.firstElementChild as HTMLElement;
    expect(header.className).toContain('border-b');
  });

  it('does not render the crumb when omitted', () => {
    render(<PageHeader title="ACCOUNTS" />);

    expect(screen.queryByText('ACCOUNTS /')).toBeNull();
  });

  it('renders the back button and fires onBack', () => {
    const onBack = vi.fn();
    render(<PageHeader title="DETAIL" onBack={onBack} />);

    fireEvent.click(screen.getByRole('button'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
