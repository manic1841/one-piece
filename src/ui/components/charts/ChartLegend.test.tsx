import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ChartLegend } from './ChartLegend';

describe('ChartLegend', () => {
  it('renders a swatch and label per item', () => {
    const { container } = render(
      <ChartLegend
        items={[
          { label: 'INCOME', tone: 'positive' },
          { label: 'EXPENSE', tone: 'negative' },
        ]}
      />,
    );

    expect(screen.getByText('INCOME')).toBeDefined();
    expect(screen.getByText('EXPENSE')).toBeDefined();
    const swatches = Array.from(container.querySelectorAll('span[aria-hidden="true"]'));
    expect(swatches[0].style.background).toBe('hsl(var(--positive))');
    expect(swatches[1].style.background).toBe('hsl(var(--negative))');
  });

  it('lets a caller override the swatch color and append a value', () => {
    const { container } = render(
      <ChartLegend
        orientation="vertical"
        items={[{ label: 'Equities', color: 'hsl(var(--primary))', value: '42%' }]}
      />,
    );

    expect(screen.getByText('Equities')).toBeDefined();
    expect(screen.getByText('42%')).toBeDefined();
    expect(container.querySelector('span[aria-hidden="true"]')?.getAttribute('style')).toContain(
      'hsl(var(--primary))',
    );
  });
});
