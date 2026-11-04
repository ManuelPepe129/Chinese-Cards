import type { MatchMode } from '../filter/filter';

export const MODES = ['study', 'browse'] as const;
export type Mode = (typeof MODES)[number];

export const ENTRY_TYPES = ['characters', 'sentences'] as const;
export type EntryType = (typeof ENTRY_TYPES)[number];

export interface UrlState {
  tags: string[];
  match: MatchMode;
  mode: Mode;
  /** Which kinds of entry are shown. Never empty; both by default. */
  types: EntryType[];
}

export const DEFAULT_STATE: UrlState = { tags: [], match: 'all', mode: 'study', types: [...ENTRY_TYPES] };

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
  // Old links: mode=cards / mode=sentences meant "study only that kind".
  const legacy: EntryType | undefined = modeParam === 'cards' ? 'characters' : modeParam === 'sentences' ? 'sentences' : undefined;
  const mode: Mode = MODES.find((m) => m === modeParam) ?? DEFAULT_STATE.mode;
  const asked = (p.get('types') ?? '').split(',').map((t) => t.trim().toLowerCase());
  const picked = ENTRY_TYPES.filter((t) => asked.includes(t));
  const types = picked.length > 0 ? picked : legacy ? [legacy] : [...ENTRY_TYPES];
  return { tags, match, mode, types };
}

/** Returns "" for the default state, otherwise "?tags=…&match=…&mode=…&types=…" (tags and types omitted when default). */
export function serializeUrlState(s: UrlState): string {
  const allTypes = ENTRY_TYPES.every((t) => s.types.includes(t));
  const isDefault = s.tags.length === 0 && s.match === DEFAULT_STATE.match && s.mode === DEFAULT_STATE.mode && allTypes;
  if (isDefault) return '';
  const parts: string[] = [];
  if (s.tags.length > 0) parts.push(`tags=${s.tags.map(encodeURIComponent).join(',')}`);
  parts.push(`match=${s.match}`, `mode=${s.mode}`);
  if (!allTypes) parts.push(`types=${s.types.join(',')}`);
  return `?${parts.join('&')}`;
}
