import { describe, expect, it } from 'vitest';
import {
  getGhostTargetFromProgressiveRotationRuns,
  isWpbProgressiveRotationRunsModule,
} from './catalogs';

describe('WPB ghost target mapping', () => {
  it('matches only the Progressive Rotation Runs module path', () => {
    expect(
      isWpbProgressiveRotationRunsModule('Position Play & Runouts > Progressive Rotation Runs > Progressive Rotation Runs'),
    ).toBe(true);
    expect(
      isWpbProgressiveRotationRunsModule('Aiming & Shot Making > Aim Training > Aim Training - Level II'),
    ).toBe(false);
  });

  it('maps progressive rotation level from 3-15 to ascending ghost targets', () => {
    const low = getGhostTargetFromProgressiveRotationRuns(3);
    const mid = getGhostTargetFromProgressiveRotationRuns(9);
    const high = getGhostTargetFromProgressiveRotationRuns(15);

    expect(low).toBeLessThan(mid);
    expect(mid).toBeLessThan(high);
  });
});
