export type MatchMode = 'all' | 'any';

export const OTHER_GROUP = 'other';

/** Entries must already have lowercase tags (the schema guarantees it). */
export function matchEntries<T extends { tags: readonly string[] }>(
  entries: T[],
  selected: readonly string[],
  match: MatchMode,
): T[] {
  if (selected.length === 0) return entries;
  const wanted = selected.map((t) => t.toLowerCase());
  return entries.filter((e) => {
    const have = new Set(e.tags);
    return match === 'all' ? wanted.every((t) => have.has(t)) : wanted.some((t) => have.has(t));
  });
}

/** "hsk1" → "hsk", "lesson-01" → "lesson", "pronouns" → "other". */
export function tagPrefix(tag: string): string {
  const m = /^(\p{L}+)(?=[\d-])/u.exec(tag);
  return m ? m[1] : OTHER_GROUP;
}

const ACRONYMS: Record<string, string> = { hsk: 'HSK' };

export function groupLabel(key: string): string {
  return ACRONYMS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

export interface TagInfo {
  tag: string;
  count: number;
}
export interface TagGroup {
  key: string;
  label: string;
  tags: TagInfo[];
}

const natural = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

/**
 * Builds the chip groups. Counts come from `entries` (the current view); tag names also come from
 * `universe` (the whole dataset) and from `selected` (e.g. an old bookmark), with count 0 if absent from `entries`.
 */
export function groupTags(
  entries: readonly { tags: readonly string[] }[],
  selected: readonly string[] = [],
  universe: readonly { tags: readonly string[] }[] = entries,
): TagGroup[] {
  const counts = new Map<string, number>();
  for (const e of entries) for (const t of e.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  // Tags that exist elsewhere in the data (or only in the URL) stay listed, with count 0 in this view.
  for (const e of universe) for (const t of e.tags) if (!counts.has(t)) counts.set(t, 0);
  for (const t of selected) if (!counts.has(t)) counts.set(t, 0);

  const byKey = new Map<string, TagInfo[]>();
  for (const [tag, count] of counts) {
    const key = tagPrefix(tag);
    const list = byKey.get(key) ?? [];
    list.push({ tag, count });
    byKey.set(key, list);
  }
  return [...byKey.entries()]
    .map(([key, tags]) => ({
      key,
      label: key === OTHER_GROUP ? 'Other' : groupLabel(key),
      tags: tags.sort((a, b) => natural(a.tag, b.tag)),
    }))
    .sort((a, b) => {
      if (a.key === OTHER_GROUP) return 1;
      if (b.key === OTHER_GROUP) return -1;
      return natural(a.label, b.label);
    });
}
