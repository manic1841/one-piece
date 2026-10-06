import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AccessDenied, DEFAULT_ACCESS_DENIED_DESCRIPTION } from './AccessDenied';

const renderAccessDenied = (props: Partial<React.ComponentProps<typeof AccessDenied>> = {}) =>
  render(<AccessDenied onLogout={vi.fn()} {...props} />);

describe('AccessDenied', () => {
  it('renders the denial title as the unique H1', () => {
    renderAccessDenied();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Access Denied');
  });

  it('falls back to the site-wide description', () => {
    renderAccessDenied();

    expect(screen.getByText(DEFAULT_ACCESS_DENIED_DESCRIPTION)).toBeInTheDocument();
  });

  it('lets the caller replace the description', () => {
    renderAccessDenied({ description: 'Only owners can open Settings.' });

    expect(screen.getByText('Only owners can open Settings.')).toBeInTheDocument();
    expect(screen.queryByText(DEFAULT_ACCESS_DENIED_DESCRIPTION)).not.toBeInTheDocument();
  });

  it('reports the leave action to the caller', () => {
    const onLogout = vi.fn();
    renderAccessDenied({ onLogout });

    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));

    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
