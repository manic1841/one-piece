import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ChartTooltip } from './ChartTooltip';

const hero = {
  mode: 'hero' as const,
  primary: { id: 'netWorth', label: 'NET WORTH', value: '$4,812,430' },
  secondary: [{ id: 'change', value: '+8.42% YTD' }],
};

describe('ChartTooltip', () => {
  it('renders the title, hero datum, and secondary line', () => {
    render(<ChartTooltip title="SEP 2026" content={hero} />);

    expect(screen.getByText('SEP 2026')).toBeDefined();
    expect(screen.getByText(/NET WORTH/)).toBeDefined();
    expect(screen.getByText('$4,812,430')).toBeDefined();
    expect(screen.getByText('+8.42% YTD')).toBeDefined();
  });

  it('keeps list rows on one level, each with its label and value', () => {
    const { container } = render(
      <ChartTooltip
        title="SEP 2026"
        content={{
          mode: 'list',
          items: [
            { id: 'cash', label: 'CASH', value: '$200', detail: '20.0%', color: '#111' },
            { id: 'property', label: 'PROPERTY', value: '$800', detail: '80.0%' },
          ],
        }}
      />,
    );

    const rows = container.querySelectorAll('li');
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.querySelector('p')?.className).toContain('text-muted-foreground');
      expect(row.querySelectorAll('p')).toHaveLength(2);
    }
    expect(screen.getByText('$200').className).not.toContain('text-primary');
    expect(screen.getByText('$800').className).not.toContain('text-primary');
  });

  it('shows a dash when the hero datum is hidden', () => {
    const { container } = render(
      <ChartTooltip title="SEP 2026" content={{ mode: 'hero', secondary: [] }} />,
    );

    expect(container.textContent).toContain('—');
  });

  it('omits the secondary line when there is none', () => {
    const { container } = render(
      <ChartTooltip
        title="SEP 2026"
        content={{ mode: 'hero', primary: { id: 'value', value: '$4,812,430' } }}
      />,
    );

    expect(container.querySelectorAll('p')).toHaveLength(2);
  });

  it('renders the hint as a separated footer', () => {
    render(<ChartTooltip title="SEP 2026" content={hero} hint="點選選取期間" />);

    const hint = screen.getByText('點選選取期間');
    expect(hint.className).toContain('border-t');
  });

  it('is a floating surface: bordered card with a shadow', () => {
    const { container } = render(<ChartTooltip title="SEP 2026" content={hero} />);

    const card = container.firstElementChild as HTMLElement;
    expect(card.className).toContain('border-border-strong');
    expect(card.className).toContain('shadow-lg');
  });
});
