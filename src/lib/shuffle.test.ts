import { describe, expect, it } from 'vitest';
import { shuffledIndices } from './shuffle';

describe('shuffledIndices', () => {
  it('returns a permutation of 0..n-1', () => {
    const r = shuffledIndices(50);
    expect([...r].sort((a, b) => a - b)).toEqual(Array.from({ length: 50 }, (_, i) => i));
  });
  it('is deterministic for a given rng', () => {
    const seq = [0.1, 0.9, 0.5, 0.3];
    const make = () => { let i = 0; return () => seq[i++ % seq.length]; };
    expect(shuffledIndices(6, make())).toEqual(shuffledIndices(6, make()));
  });
  it('handles empty and single', () => {
    expect(shuffledIndices(0)).toEqual([]);
    expect(shuffledIndices(1)).toEqual([0]);
  });
});
