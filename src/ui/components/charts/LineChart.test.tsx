import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LineChart } from './LineChart';

describe('LineChart', () => {
  it('exposes the chart as a labelled image when an aria label is given', () => {
    render(<LineChart ariaLabel="12M net worth" values={[1, 2, 3]} />);

    expect(screen.getByRole('img', { name: '12M net worth' })).toBeDefined();
  });

  it('draws one gridline per scale step and a single series path', () => {
    const { container } = render(<LineChart values={[10, 20, 30]} />);

    expect(container.querySelectorAll('line')).toHaveLength(4);
    expect(container.querySelectorAll('path')).toHaveLength(1);
  });

  it('adds an area path and a last-point marker on request', () => {
    const { container } = render(<LineChart values={[10, 20, 30]} showArea markLastPoint />);

    expect(container.querySelectorAll('path')).toHaveLength(2);
    expect(container.querySelectorAll('circle')).toHaveLength(1);
  });

  it('renders axis labels beneath the plot, not inside the svg', () => {
    const { container } = render(<LineChart values={[1, 2, 3]} labels={['JAN', 'FEB', 'MAR']} />);

    expect(screen.getByText('JAN')).toBeDefined();
    expect(screen.getByText('MAR')).toBeDefined();
    expect(container.querySelector('svg')?.textContent).toBe('');
  });

  it('gives the overlay renderer the computed geometry', () => {
    render(
      <LineChart values={[1, 2, 3]}>
        {(geometry) => <span data-testid="overlay">{geometry.points.length}</span>}
      </LineChart>,
    );

    expect(screen.getByTestId('overlay').textContent).toBe('3');
  });
});
