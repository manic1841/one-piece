import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Alert, AlertDescription } from './alert';
import { Badge } from './badge';
import { Button } from './button';
import { Progress } from './progress';

describe('Badge', () => {
  it('renders a 4px-radius mono chip with a visible border', () => {
    render(<Badge data-testid="badge">ETF</Badge>);

    const badge = screen.getByTestId('badge');
    expect(badge.className).toContain('rounded');
    expect(badge.className).not.toContain('rounded-full');
    expect(badge.className).toContain('font-mono');
    expect(badge.className).toContain('border');
  });
});

describe('Alert', () => {
  it('renders glyph, message, and text action slots in one row', () => {
    render(
      <Alert data-testid="alert">
        <span data-testid="status">! REVIEW</span>
        <AlertDescription>Brokerage balance differs from ledger.</AlertDescription>
        <Button variant="text">Review</Button>
      </Alert>,
    );

    const alert = screen.getByTestId('alert');
    expect(alert.className).toContain('flex');
    expect(alert.className).toContain('items-center');
    expect(screen.getByTestId('status')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review' })).toBeInTheDocument();
  });
});

describe('Button', () => {
  it('supports the transparent text variant', () => {
    render(<Button variant="text">View details</Button>);

    const button = screen.getByRole('button', { name: 'View details' });
    expect(button.className).toContain('border-transparent');
  });
});

describe('Progress', () => {
  it('uses a surface-colored track with an accent indicator fill', () => {
    render(<Progress value={40} data-testid="progress" />);

    const root = screen.getByTestId('progress');
    expect(root.className).toContain('bg-muted');
    const indicator = root.firstElementChild as HTMLElement;
    expect(indicator.className).toContain('bg-accent');
  });
});
