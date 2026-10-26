/** At most this many characters get a stroke-order writer (a long sentence would not fit on a card). */
export const MAX_STROKE_CHARS = 8;
/** Height of the one-line "no stroke data" notice. */
export const NOTICE_HEIGHT = 28;

const GAP = 8;
const BUTTON_H = 48;
const STATUS_H = 20;
const SIDE_W = 132; // width of the Replay/Quiz column when it sits beside the writers
const SIDE_TOP = 64; // keeps clear of the speaker button in the card's top-right corner
const SIDE_BOTTOM = 12;
const SIDE_MIN_H = 2 * BUTTON_H + STATUS_H + 2 * GAP;
const MAX_CELL = 200;
const MAX_PANEL_H = 340; // panel height cap on big cards
const MIN_CELL = 40;
const ROW_TOLERANCE = 8; // px a wrapped layout must gain to be preferred

export interface Box {
  w: number;
  h: number;
}

/** Short, wide cards (a phone in landscape) put the buttons beside the writers instead of below. */
export const isSideLayout = (box: Box): boolean => box.h > 0 && box.h < 320 && box.w >= 1.6 * box.h;

export interface WriterLayout {
  cols: number;
  rows: number;
  /** Side length of each square writer, in px. */
  cell: number;
  panelWidth: number;
  panelHeight: number;
}

/**
 * Chooses the writer grid (columns × rows, cell size) that gives the biggest cells while the
 * whole panel (writers + status + buttons) stays within about half of the card's height.
 * `width` is the room available to the panel; `height` is the card's height.
 */
export function layoutWriters(input: { count: number; width: number; height: number; side: boolean }): WriterLayout {
  const { width, height, side } = input;
  const n = Math.max(1, input.count);
  const chrome = side ? 0 : GAP + STATUS_H + GAP + BUTTON_H;
  const heightBudget = side
    ? height - SIDE_TOP - SIDE_BOTTOM
    : Math.min(MAX_PANEL_H, Math.floor(height * 0.5)) - chrome;
  const widthBudget = side ? Math.floor(width * 0.62) - SIDE_W - GAP : width;

  let best = { cols: 1, rows: n, cell: -1 };
  for (let cols = n; cols >= 1; cols--) {
    // Descending, so fewer rows come first; a layout with more rows must win by a clear margin,
    // because a word reads best on one row.
    const rows = Math.ceil(n / cols);
    const byWidth = Math.floor((widthBudget - (cols - 1) * GAP) / cols);
    const byHeight = Math.floor((heightBudget - (rows - 1) * GAP) / rows);
    const cell = Math.min(MAX_CELL, byWidth, byHeight);
    if (cell > best.cell + ROW_TOLERANCE) best = { cols, rows, cell };
  }
  const cell = Math.max(MIN_CELL, best.cell);
  const gridW = best.cols * cell + (best.cols - 1) * GAP;
  const gridH = best.rows * cell + (best.rows - 1) * GAP;
  return {
    cols: best.cols,
    rows: best.rows,
    cell,
    panelWidth: side ? gridW + GAP + SIDE_W : width,
    panelHeight: side ? Math.max(gridH, SIDE_MIN_H) : gridH + chrome,
  };
}
