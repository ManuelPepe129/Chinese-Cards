export interface SearchableEntry {
  hanzi: string;
  traditional?: string;
  pinyin: string;
  italian: readonly string[];
  tags: readonly string[];
}

/** Lowercase and strip diacritics, so "nǐ" ≈ "ni" and "perché" ≈ "perche". */
export function normalizeForSearch(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

function haystack(e: SearchableEntry): string {
  const pinyin = normalizeForSearch(e.pinyin);
  return [
    normalizeForSearch(e.hanzi),
    e.traditional ? normalizeForSearch(e.traditional) : '',
    pinyin,
    pinyin.replace(/[\s'’.,?!]/g, ''), // "nihao" finds "nǐ hǎo"
    ...e.italian.map(normalizeForSearch),
    ...e.tags,
  ].join(' ');
}

/** Every whitespace-separated term must appear somewhere in the entry (AND). Empty query = no filtering. */
export function searchEntries<T extends SearchableEntry>(entries: T[], query: string): T[] {
  const terms = normalizeForSearch(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return entries;
  return entries.filter((e) => {
    const hay = haystack(e);
    return terms.every((t) => hay.includes(t));
  });
}
