import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CliProgress } from './CliProgress';

describe('CliProgress', () => {
  it('renders the command, bar, and percent', () => {
    render(<CliProgress command="generate-reports --period SEP-2026" value={62} />);

    expect(screen.getByText('generate-reports --period SEP-2026')).toBeInTheDocument();
    expect(screen.getByText(/62%/)).toBeInTheDocument();
  });

  it('exposes the progressbar role with aria-value attributes', () => {
    render(<CliProgress command="generate-reports" value={62} statusText="Generating..." />);

    const bar = screen.getByRole('progressbar', { name: 'generate-reports' });
    expect(bar).toHaveAttribute('aria-valuenow', '62');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(screen.getByText('→ Generating...')).toBeInTheDocument();
  });

  it('clamps out-of-range values', () => {
    render(<CliProgress command="task" value={140} />);

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });
});
