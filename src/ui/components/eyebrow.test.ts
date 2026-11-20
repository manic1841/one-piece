import { describe, expect, it } from 'vitest';

import { eyebrowClass, sectionTitleClass, subSectionTitleClass } from './eyebrow';

/** The three heading layers must stay ordered by weight, not just by name. */
describe('heading layers', () => {
  it('keeps the label layer at the 11px floor', () => {
    expect(eyebrowClass).toContain('text-[11px]');
  });

  it('puts the sub-section layer one step above the label layer', () => {
    expect(subSectionTitleClass).toContain('text-[13px]');
    expect(subSectionTitleClass).toContain('text-foreground');
  });

  it('keeps the page-section layer the heaviest and above the sub-section layer', () => {
    expect(sectionTitleClass).toContain('text-sm');
    expect(sectionTitleClass).toContain('text-foreground');
  });
});
