import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatementPanel } from './StatementPanel';
import { incomeMetrics } from './statementMetrics';

const metrics = incomeMetrics({
  income: { value: 'NT$50,000' },
  expense: { value: 'NT$20,000' },
  netIncome: { value: 'NT$30,000' },
});

describe('StatementPanel', () => {
  it('renders the metrics row above the body', () => {
    render(
      <StatementPanel metrics={metrics}>
        <p>body</p>
      </StatementPanel>,
    );

    expect(screen.getByTestId('statement-metric-income')).toHaveTextContent('收入');
    expect(screen.getByTestId('statement-metric-income')).toHaveTextContent('NT$50,000');
    expect(screen.getByTestId('statement-metric-net-income')).toHaveTextContent('本期淨利');
    expect(screen.getByText('body')).toBeInTheDocument();
  });

  it('renders the title with the shared mobile-only surface', () => {
    render(
      <StatementPanel title="損益表" metrics={metrics}>
        <p>body</p>
      </StatementPanel>,
    );

    expect(screen.getByText('損益表')).toHaveClass('md:hidden');
  });

  it('omits the metrics row but keeps the title and body when metrics is absent', () => {
    render(
      <StatementPanel title="損益表">
        <p>body</p>
      </StatementPanel>,
    );

    expect(screen.getByText('損益表')).toBeInTheDocument();
    expect(screen.queryByTestId('statement-metric-income')).not.toBeInTheDocument();
    expect(screen.getByText('body')).toBeInTheDocument();
  });

  it('renders no title when title is omitted', () => {
    render(
      <StatementPanel metrics={metrics}>
        <p>body</p>
      </StatementPanel>,
    );

    expect(screen.queryByText('損益表')).not.toBeInTheDocument();
  });
});
