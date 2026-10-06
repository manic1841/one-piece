import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { InteractiveLineChart } from './InteractiveLineChart';

const VALUES = [4120000, 4180000, 4160000, 4812430];
const POINTS = [
  { title: 'OCT 2025', value: '$4,120,000', meta: '—' },
  { title: 'NOV 2025', value: '$4,180,000', meta: '+1.5%' },
  { title: 'DEC 2025', value: '$4,160,000', meta: '+1.0%' },
  { title: 'SEP 2026', value: '$4,812,430', meta: '+8.42% YTD' },
];

describe('InteractiveLineChart', () => {
  it('exposes the series as a keyboard-reachable slider', () => {
    render(<InteractiveLineChart values={VALUES} points={POINTS} ariaLabel="12M net worth" />);

    const slider = screen.getByRole('slider', { name: '12M net worth' });
    expect(slider.getAttribute('aria-valuemin')).toBe('0');
    expect(slider.getAttribute('aria-valuemax')).toBe('3');
    expect(slider.getAttribute('tabindex')).toBe('0');
  });

  it('anchors the guide, dot, and tooltip to the point on the line, not the data-space ratio', () => {
    render(
      <InteractiveLineChart
        values={VALUES}
        points={POINTS}
        height={170}
        ariaLabel="12M net worth"
      />,
    );
    const slider = screen.getByRole('slider', { name: '12M net worth' });

    // Index 3 is the maximum value, so it renders near the TOP of the plot.
    for (let index = 0; index < 4; index += 1) fireEvent.keyDown(slider, { key: 'ArrowRight' });

    const dot = Array.from(slider.querySelectorAll('span')).find((el) =>
      el.className.includes('h-2.5'),
    ) as HTMLElement;
    expect(parseFloat(dot.style.top)).toBeLessThan(20);

    // The card needs ~84px of vertical room, so the anchor is clamped down and stays inside the plot.
    const card = slider.querySelector('div.border-border-strong') as HTMLElement;
    const anchor = parseFloat(card.style.top);
    expect(anchor).toBeGreaterThan(45);
    expect(anchor * 1.7).toBeLessThanOrEqual(170);
  });

  it('lets a low point keep its own, unclamped anchor', () => {
    render(
      <InteractiveLineChart
        values={VALUES}
        points={POINTS}
        height={170}
        ariaLabel="12M net worth"
      />,
    );
    const slider = screen.getByRole('slider', { name: '12M net worth' });

    // Index 0 is the minimum value, so it renders near the BOTTOM of the plot.
    fireEvent.keyDown(slider, { key: 'ArrowRight' });

    const dot = Array.from(slider.querySelectorAll('span')).find((el) =>
      el.className.includes('h-2.5'),
    ) as HTMLElement;
    expect(parseFloat(dot.style.top)).toBeGreaterThan(80);
  });

  it('reveals the tooltip when arrowing through the series', () => {
    render(<InteractiveLineChart values={VALUES} points={POINTS} ariaLabel="12M net worth" />);
    const slider = screen.getByRole('slider', { name: '12M net worth' });

    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(screen.getByText('OCT 2025')).toBeDefined();

    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(screen.getByText('SEP 2026')).toBeDefined();
    expect(screen.getByText('+8.42% YTD')).toBeDefined();
    expect(slider.getAttribute('aria-valuenow')).toBe('3');
    expect(slider.getAttribute('aria-valuetext')).toBe('SEP 2026, $4,812,430, +8.42% YTD');
  });

  it('clamps keyboard movement to the end of the series', () => {
    render(<InteractiveLineChart values={VALUES} points={POINTS} ariaLabel="12M net worth" />);
    const slider = screen.getByRole('slider', { name: '12M net worth' });

    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(slider.getAttribute('aria-valuenow')).toBe('0');

    for (let index = 0; index < 10; index += 1) {
      fireEvent.keyDown(slider, { key: 'ArrowRight' });
    }
    expect(slider.getAttribute('aria-valuenow')).toBe('3');
  });

  it('selects the nearest point on hover and clears it on leave', () => {
    render(<InteractiveLineChart values={VALUES} points={POINTS} ariaLabel="12M net worth" />);
    const slider = screen.getByRole('slider', { name: '12M net worth' });
    slider.getBoundingClientRect = () => ({ left: 0, width: 300 }) as DOMRect;

    fireEvent.mouseMove(slider, { clientX: 300 });
    expect(screen.getByText('SEP 2026')).toBeDefined();

    fireEvent.mouseLeave(slider);
    expect(screen.queryByText('SEP 2026')).toBeNull();
  });

  it('clears the tooltip with Escape', () => {
    render(<InteractiveLineChart values={VALUES} points={POINTS} ariaLabel="12M net worth" />);
    const slider = screen.getByRole('slider', { name: '12M net worth' });

    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(screen.getByText('OCT 2025')).toBeDefined();

    fireEvent.keyDown(slider, { key: 'Escape' });
    expect(screen.queryByText('OCT 2025')).toBeNull();
  });
});
