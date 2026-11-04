import { describe, expect, it } from 'vitest';
import { glyphCell, splitLines } from './strokeLayout';

describe('splitLines', () => {
  it('balances lines instead of leaving an orphan', () => {
    expect(splitLines([1, 2, 3]).map((l) => l.length)).toEqual([3]);
    expect(splitLines([1, 2, 3, 4, 5, 6, 7]).map((l) => l.length)).toEqual([4, 3]);
    expect(splitLines([])).toEqual([]);
  });
});

describe('glyphCell', () => {
  const phone = { width: 304, height: 235, maxCell: 260 };
  it('is 0 until the area is measured', () => {
    expect(glyphCell({ ...phone, count: 1, width: 0, height: 0 })).toBe(0);
  });
  it('lets a single character grow up to the maximum', () => {
    expect(glyphCell({ count: 1, width: 616, height: 380, maxCell: 260 })).toBe(260);
    expect(glyphCell({ ...phone, count: 1 })).toBe(235);
  });
  it('shrinks as characters are added', () => {
    const cells = [1, 2, 4, 6].map((count) => glyphCell({ ...phone, count }));
    expect(cells).toEqual([...cells].sort((a, b) => b - a));
  });
  it('fits the width and the height', () => {
    for (let count = 1; count <= 14; count++) {
      const cell = glyphCell({ ...phone, count });
      const lines = Math.ceil(count / 6);
      const perLine = Math.ceil(count / lines);
      if (cell > 28) {
        expect(cell * perLine).toBeLessThanOrEqual(phone.width);
        expect(cell * lines).toBeLessThanOrEqual(phone.height);
      }
    }
  });
});
