import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './accordion';

describe('Accordion primitive', () => {
  it('renders collapsed by default and expands on trigger click', () => {
    render(
      <Accordion>
        <AccordionItem value="details">
          <AccordionTrigger>ACCOUNT DETAILS</AccordionTrigger>
          <AccordionContent>
            <div>ACCOUNT TYPE: BROKERAGE</div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    const trigger = screen.getByRole('button', { name: 'ACCOUNT DETAILS' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('ACCOUNT TYPE: BROKERAGE')).toBeNull();

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('ACCOUNT TYPE: BROKERAGE')).toBeVisible();
  });

  it('collapses the open item when its trigger is clicked again', () => {
    render(
      <Accordion type="single" collapsible defaultValue="open-item">
        <AccordionItem value="open-item">
          <AccordionTrigger>OPEN SECTION</AccordionTrigger>
          <AccordionContent>body</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    const trigger = screen.getByRole('button', { name: 'OPEN SECTION' });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('body')).toBeNull();
  });
});
