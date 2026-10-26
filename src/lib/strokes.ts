/** Han characters in `text` (punctuation, Latin letters and digits are dropped). */
export function hanChars(text: string): string[] {
  return [...text].filter((c) => /\p{Script=Han}/u.test(c));
}

/** Unique Han characters across many strings, in first-seen order. */
export function uniqueHanChars(texts: Iterable<string>): string[] {
  const seen = new Set<string>();
  for (const t of texts) for (const c of hanChars(t)) seen.add(c);
  return [...seen];
}

/** Stroke files are named by code point (e.g. 你 → 4f60.json) to avoid Unicode file names on hosts. */
export function strokeFileName(char: string): string {
  return `${char.codePointAt(0)!.toString(16)}.json`;
}
