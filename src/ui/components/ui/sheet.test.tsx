import React from 'react';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Sheet, SheetContent, SheetDescription, SheetTitle } from './sheet';

const renderSheet = (side?: 'bottom' | 'right' | 'left' | 'top', draggable?: boolean) =>
  render(
    <Sheet open>
      <SheetContent side={side} draggable={draggable}>
        <SheetTitle>Trade</SheetTitle>
        <SheetDescription>Draft</SheetDescription>
      </SheetContent>
    </Sheet>,
  );

describe('SheetContent drag handle', () => {
  it('marks the handle band as decoration so it stays out of the tab order', () => {
    renderSheet();

    const handle = document.querySelector('[data-sheet-handle]');
    expect(handle).not.toBeNull();
    expect(handle?.getAttribute('aria-hidden')).toBe('true');
    expect(handle?.hasAttribute('tabindex')).toBe(false);
    expect(handle?.querySelector('span')).not.toBeNull();
  });

  it('keeps the scroll area separate from the handle band', () => {
    renderSheet();

    const body = document.querySelector('[data-sheet-body]');
    expect(body).not.toBeNull();
    expect(body?.contains(document.querySelector('[data-sheet-handle]'))).toBe(false);
    expect(body?.className).toContain('overflow-y-auto');
  });

  it('only offers the handle on bottom sheets', () => {
    const side = renderSheet('right');
    expect(document.querySelector('[data-sheet-handle]')).toBeNull();
    side.unmount();

    renderSheet('bottom');
    expect(screen.getByText('Trade')).toBeInTheDocument();
  });

  it('can be opted out per call site', () => {
    renderSheet('bottom', false);
    expect(document.querySelector('[data-sheet-handle]')).toBeNull();
  });

  it('leaves the exit transform to the gesture', () => {
    renderSheet('bottom');
    const content = document.querySelector('[data-sheet-content]');
    expect(content?.className).toContain('data-[state=closed]:animate-none');
  });
});
