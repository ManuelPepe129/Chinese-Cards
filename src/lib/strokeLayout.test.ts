import { describe, expect, it } from 'vitest';
import { isSideLayout, layoutWriters } from './strokeLayout';

describe('isSideLayout', () => {
  it('is for short, wide cards only', () => {
    expect(isSideLayout({ w: 560, h: 228 })).toBe(true); // phone landscape
    expect(isSideLayout({ w: 328, h: 470 })).toBe(false); // phone portrait
    expect(isSideLayout({ w: 640, h: 560 })).toBe(false); // tablet landscape
    expect(isSideLayout({ w: 0, h: 0 })).toBe(false); // not measured yet
  });
});

describe('layoutWriters (stacked)', () => {
  const phone = { width: 304, height: 470, side: false };

  it('gives a single character a large cell', () => {
    const l = layoutWriters({ ...phone, count: 1 });
    expect(l).toMatchObject({ cols: 1, rows: 1 });
    expect(l.cell).toBeGreaterThanOrEqual(120);
    expect(l.cell).toBeLessThanOrEqual(200);
  });
  it('keeps up to four characters on one row and wraps longer text', () => {
    expect(layoutWriters({ ...phone, count: 2 }).rows).toBe(1);
    expect(layoutWriters({ ...phone, count: 4 }).rows).toBe(1);
    expect(layoutWriters({ ...phone, count: 8 }).rows).toBe(2);
  });
  it('lets a single character grow on a big card (tablet / desktop)', () => {
    expect(layoutWriters({ count: 1, width: 616, height: 760, side: false }).cell).toBe(200);
  });
  it('shrinks the cells as characters are added', () => {
    const cells = [1, 2, 3, 4, 8].map((count) => layoutWriters({ ...phone, count }).cell);
    expect(cells).toEqual([...cells].sort((a, b) => b - a));
  });
  it('never exceeds the width or the height budget (unless the 40px minimum cell forces it)', () => {
    for (let h = 300; h <= 900; h += 50) {
      for (let w = 280; w <= 640; w += 40) {
        for (let count = 1; count <= 8; count++) {
          const l = layoutWriters({ count, width: w - 24, height: h, side: false });
          if (l.cell > 40) {
            expect(l.cols * l.cell + (l.cols - 1) * 8, `${w}x${h} n=${count}`).toBeLessThanOrEqual(w - 24);
            expect(l.panelHeight, `${w}x${h} n=${count}`).toBeLessThanOrEqual(Math.min(340, Math.floor(h * 0.5)));
          }
          expect(l.cols * l.rows).toBeGreaterThanOrEqual(count);
        }
      }
    }
  });
});

describe('layoutWriters (side)', () => {
  const landscape = { width: 536, height: 228, side: true };

  it('fits the writers and the button column beside each other, below the speaker button', () => {
    for (const count of [1, 2, 4, 8]) {
      const l = layoutWriters({ ...landscape, count });
      expect(l.panelWidth, `n=${count}`).toBeLessThanOrEqual(536 * 0.62 + 8 + 132 + 1);
      expect(l.panelHeight, `n=${count}`).toBeLessThanOrEqual(228 - 64 - 12);
    }
  });
  it('reserves room for the button column even when the writers are small', () => {
    expect(layoutWriters({ ...landscape, count: 1 }).panelHeight).toBeGreaterThanOrEqual(132);
  });
});
