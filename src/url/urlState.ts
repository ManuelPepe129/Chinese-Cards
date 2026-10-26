import type { MatchMode } from '../filter/filter';

export const MODES = ['cards', 'sentences', 'browse'] as const;
export type Mode = (typeof MODES)[number];

export interface UrlState {
  tags: string[];
  match: MatchMode;
  mode: Mode;
}

export const DEFAULT_STATE: UrlState = { tags: [], match: 'all', mode: 'cards' };

export function parseUrlState(search: string): UrlState {
  const p = new URLSearchParams(search);
  const tags = [
    ...new Set(
      (p.get('tags') ?? '')
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
  const match: MatchMode = p.get('match') === 'any' ? 'any' : 'all';
  const modeParam = p.get('mode');
  const mode = MODES.find((m) => m === modeParam) ?? DEFAULT_STATE.mode;
  return { tags, match, mode };
}

/** Returns "" for the default state, otherwise "?tags=…&match=…&mode=…" (tags omitted when empty). */
export function serializeUrlState(s: UrlState): string {
  const isDefault = s.tags.length === 0 && s.match === DEFAULT_STATE.match && s.mode === DEFAULT_STATE.mode;
  if (isDefault) return '';
  const parts: string[] = [];
  if (s.tags.length > 0) parts.push(`tags=${s.tags.map(encodeURIComponent).join(',')}`);
  parts.push(`match=${s.match}`, `mode=${s.mode}`);
  return `?${parts.join('&')}`;
}
