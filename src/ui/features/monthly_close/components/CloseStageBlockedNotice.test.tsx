import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CloseStageBlockedNotice } from './CloseStageBlockedNotice';

describe('CloseStageBlockedNotice', () => {
  it('renders the stage refusal reason as an alert', () => {
    render(<CloseStageBlockedNotice reason="尚有未結算的專案，請先完成專案結算" />);

    expect(screen.getByRole('alert')).toHaveTextContent('尚有未結算的專案，請先完成專案結算');
  });

  it('renders nothing while no stage is blocked', () => {
    const { container } = render(<CloseStageBlockedNotice reason={null} />);

    expect(container).toBeEmptyDOMElement();
  });
});
