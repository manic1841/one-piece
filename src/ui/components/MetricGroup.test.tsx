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
});
