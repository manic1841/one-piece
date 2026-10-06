import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ChartTooltip } from './ChartTooltip';

describe('ChartTooltip', () => {
  it('renders the title, value, and meta lines', () => {
    render(<ChartTooltip title="SEP 2026" value="$4,812,430" meta="+8.42% YTD" />);

    expect(screen.getByText('SEP 2026')).toBeDefined();
    expect(screen.getByText('$4,812,430')).toBeDefined();
    expect(screen.getByText('+8.42% YTD')).toBeDefined();
  });

  it('omits the meta line when there is none', () => {
    const { container } = render(<ChartTooltip title="SEP 2026" value="$4,812,430" />);

    expect(container.querySelectorAll('p')).toHaveLength(2);
  });

  it('is a floating surface: bordered card with a shadow', () => {
    const { container } = render(<ChartTooltip title="SEP 2026" value="$4,812,430" />);

    const card = container.firstElementChild as HTMLElement;
    expect(card.className).toContain('border-border-strong');
    expect(card.className).toContain('shadow-lg');
  });
});
