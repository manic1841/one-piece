import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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

  it('renders pressed toggle buttons when a toggle handler is supplied', () => {
    const onToggle = vi.fn();
    render(
      <ChartLegend
        items={[
          { label: 'NET WORTH', tone: 'asset' },
          { label: 'ASSETS', tone: 'neutral' },
        ]}
        active={['NET WORTH']}
        onToggle={onToggle}
      />,
    );

    const on = screen.getByRole('button', { name: 'NET WORTH' });
    const off = screen.getByRole('button', { name: 'ASSETS' });
    expect(on.getAttribute('aria-pressed')).toBe('true');
    expect(off.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(off);
    expect(onToggle).toHaveBeenCalledWith('ASSETS');
  });

  it('toggles by key so duplicate labels stay independent', () => {
    const onToggle = vi.fn();
    render(
      <ChartLegend
        items={[
          { label: '負債', key: 'liabilities', tone: 'negative' },
          { label: '負債', key: 'liabilitiesRatio', tone: 'neutral' },
        ]}
        active={['liabilities']}
        onToggle={onToggle}
      />,
    );

    const buttons = screen.getAllByRole('button', { name: '負債' });
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
    expect(buttons[1].getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(buttons[1]);
    expect(onToggle).toHaveBeenCalledWith('liabilitiesRatio');
  });
});
