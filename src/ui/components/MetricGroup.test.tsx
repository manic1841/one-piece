import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Metric, MetricGroup } from './MetricGroup';

describe('MetricGroup', () => {
  it('renders metrics in a divided row', () => {
    render(
      <MetricGroup>
        <Metric label="TOTAL ASSETS" value="$5,420,000" />
        <Metric label="TOTAL LIABILITIES" value="$598,680" />
      </MetricGroup>,
    );

    expect(screen.getByText('TOTAL ASSETS')).toBeInTheDocument();
    expect(screen.getByText('$5,420,000')).toBeInTheDocument();
    expect(screen.getByText('TOTAL LIABILITIES')).toBeInTheDocument();
  });

  it('renders the change line with its tone', () => {
    render(
      <MetricGroup>
        <Metric label="MONTHLY CASH FLOW" value="+$36,000" tone="positive" change="+22.4% MoM" />
      </MetricGroup>,
    );

    expect(screen.getByText('+$36,000')).toBeInTheDocument();
    expect(screen.getByText('+22.4% MoM')).toBeInTheDocument();
  });

  it('renders a caption as a muted line, separate from the change', () => {
    const { container } = render(
      <Metric label="TOTAL ASSETS" value="NT$5,420,000" captionLabel="錨定：2026-08" />,
    );

    const caption = screen.getByText('錨定：2026-08');
    expect(caption.className).toContain('text-muted-foreground');
    // The caption comes after the figure, so it annotates rather than labels it.
    expect(container.firstElementChild?.lastElementChild).toBe(caption);
  });

  describe('stacked layout', () => {
    it('puts the label and the figure on one row, and the change under the figure', () => {
      const { container } = render(
        <Metric layout="stacked" label="NET INCOME" value="NT$30,000" change="+6.8% MoM" />,
      );

      const root = container.firstElementChild as HTMLElement;
      const row = root.firstElementChild as HTMLElement;
      expect(row.className).toContain('justify-between');
      expect(row.textContent).toContain('NET INCOME');
      expect(row.textContent).toContain('NT$30,000');
      // The change line is a sibling of the row, right-aligned under the figure.
      expect(root.lastElementChild?.textContent).toBe('+6.8% MoM');
      expect(root.lastElementChild?.className).toContain('text-right');
    });
  });

  describe('column ramp', () => {
    const groupClass = (columns: 2 | 3 | 4 | 5, lastSpansFull = false): string => {
      const { container } = render(
        <MetricGroup columns={columns} lastSpansFull={lastSpansFull} className="probe">
          {Array.from({ length: 5 }, (_, index) => (
            <Metric key={index} label={`M${index}`} value="1" />
          ))}
        </MetricGroup>,
      );
      return container.querySelector('.probe')?.className ?? '';
    };

    it('holds five metrics at tablet width instead of squeezing them', () => {
      const className = groupClass(5);

      expect(className).toContain('md:grid-cols-3');
      expect(className).toContain('lg:grid-cols-5');
      expect(className).not.toContain('md:grid-cols-5');
    });

    it('clears the divider on the first cell of every row, at each breakpoint', () => {
      const className = groupClass(5);

      expect(className).toContain('[&>*:nth-child(2n+1)]:border-l-0');
      expect(className).toContain('md:max-lg:[&>*:nth-child(3n+1)]:border-l-0');
      expect(className).toContain('lg:[&>*:nth-child(5n+1)]:border-l-0');
    });

    it('fills the ragged tablet row from the second-to-last cell', () => {
      const className = groupClass(5, true);

      // Mobile still gets the full-width last cell.
      expect(className).toContain('[&>*:last-child]:col-span-2');
      // On the three-column tablet row the pair is 2 + 1, widest on the left.
      expect(className).toContain('md:max-lg:[&>*:nth-last-child(2)]:col-span-2');
      expect(className).toContain('md:[&>*:last-child]:col-span-1');
    });

    it('keeps the last cell single-column when the tablet row already holds every metric', () => {
      const className = groupClass(3, true);

      expect(className).toContain('md:[&>*:last-child]:col-span-1');
      expect(className).not.toContain('nth-last-child(2)');
    });
  });
});
