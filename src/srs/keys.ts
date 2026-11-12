export type CardKind = 'character' | 'sentence';

/**
 * Stable id of one reviewable card. The direction is part of the key so that other directions
 * (Italian → hanzi, audio → meaning) can be added later without touching saved progress.
 */
export function cardKey(kind: CardKind, hanzi: string, direction = 'hanzi-italian'): string {
  return `${kind}:${hanzi}:${direction}`;
}
