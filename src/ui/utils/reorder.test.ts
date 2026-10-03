import { describe, expect, it } from 'vitest';

import { mergeReorderedIds } from './reorder';

describe('mergeReorderedIds', () => {
  it('places reordered visible ids back into their original slots', () => {
    // a2 is hidden by a filter, so its slot must stay where it is.
    expect(mergeReorderedIds(['a1', 'a2', 'a3', 'a4'], ['a4', 'a1', 'a3'])).toEqual([
      'a4',
      'a2',
      'a1',
      'a3',
    ]);
  });

  it('returns the base order unchanged when nothing moved', () => {
    expect(mergeReorderedIds(['a1', 'a2'], ['a1', 'a2'])).toEqual(['a1', 'a2']);
  });

  it('handles an empty visible subset', () => {
    expect(mergeReorderedIds(['a1', 'a2'], [])).toEqual(['a1', 'a2']);
  });

  it('ignores ids that are not in the base list', () => {
    expect(mergeReorderedIds(['a1', 'a2'], ['ghost', 'a2', 'a1'])).toEqual(['a2', 'a1']);
  });
});
