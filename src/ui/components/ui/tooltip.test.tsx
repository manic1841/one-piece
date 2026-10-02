import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

describe('Tooltip', () => {
  it('renders the trigger and shows content on open', () => {
    render(
      <Tooltip defaultOpen>
        <TooltipTrigger>?</TooltipTrigger>
        <TooltipContent>Calculated from Jan 1 to Sep 18, 2026</TooltipContent>
      </Tooltip>,
    );

    expect(screen.getByText('?')).toBeInTheDocument();
    expect(screen.getByText('Calculated from Jan 1 to Sep 18, 2026')).toBeInTheDocument();
  });
});
