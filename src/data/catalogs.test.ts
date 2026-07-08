import { describe, expect, it } from 'vitest';
import {
  getWpbTierOptionsForCategory,
  wpbCategoryOptions,
} from './catalogs';

describe('WPB category tier mapping', () => {
  it('includes requested WPB top-level categories', () => {
    expect(wpbCategoryOptions).toEqual([
      'Fundamentals',
      'Aiming & Shotmaking',
      'Cue Ball Control',
      'Position Play & Runouts',
      'Defense',
      'Jump Shots',
    ]);
  });

  it('returns stable tier options independent from drill name', () => {
    const options = getWpbTierOptionsForCategory('Position Play & Runouts');
    expect(options).toEqual(['Beginner', 'Novice', 'Intermediate', 'Advanced', 'Shortstop', 'Pro']);
  });
});
