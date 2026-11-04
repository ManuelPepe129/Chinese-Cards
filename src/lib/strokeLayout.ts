export interface Box {
  w: number;
  h: number;
}

/** Text longer than this wraps onto another line. */
export const MAX_PER_LINE = 6;
const MIN_CELL = 28;

/** Fewest lines of at most `perLine`, nearly equal length (7 → 4 + 3, not 6 + 1). */
export function splitLines<T>(items: T[], perLine = MAX_PER_LINE): T[][] {
  if (items.length === 0) return [];
  const lines = Math.ceil(items.length / perLine);
  const size = Math.ceil(items.length / lines);
  return Array.from({ length: lines }, (_, i) => items.slice(i * size, (i + 1) * size));
}

/**
 * Side (px) of the square each character is drawn in, so that all the lines fit in `width` × `height`.
 * Returns 0 while the area is not measured yet.
 */
export function glyphCell(input: { count: number; width: number; height: number; maxCell: number }): number {
  const { count, width, height, maxCell } = input;
  if (count < 1 || width <= 0 || height <= 0) return 0;
  const lines = Math.ceil(count / MAX_PER_LINE);
  const perLine = Math.ceil(count / lines);
  return Math.max(MIN_CELL, Math.floor(Math.min(maxCell, width / perLine, height / lines)));
}
