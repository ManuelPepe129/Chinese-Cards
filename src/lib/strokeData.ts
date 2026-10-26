import type { CharacterJson } from 'hanzi-writer';
import { strokeFileName } from './strokes';

const cache = new Map<string, Promise<CharacterJson | null>>();

/** Loads bundled stroke data (public/strokes, copied at build time). Resolves to null when unavailable. */
export function loadStrokeData(char: string): Promise<CharacterJson | null> {
  let p = cache.get(char);
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}strokes/${strokeFileName(char)}`)
      .then((r) => (r.ok ? (r.json() as Promise<CharacterJson>) : null))
      .catch(() => null);
    cache.set(char, p);
    void p.then((d) => d === null && cache.delete(char)); // allow a retry later (e.g. after reconnecting)
  }
  return p;
}
