import { z } from 'zod';

const text = z.string().trim().min(1, 'must not be empty');
// The comma separates tags in the URL (?tags=a,b), so it can't appear inside one.
const tag = text.refine((t) => !t.includes(','), { message: 'tags can’t contain commas' });

export function normalizeTags(tags: string[]): string[] {
  return [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))];
}

/** One flashcard entry. Strict, so typos in optional keys (e.g. "note") are reported. */
export const entrySchema = z.strictObject({
  hanzi: text,
  pinyin: text.refine((s) => !/\d/.test(s), {
    message: 'use tone marks (nǐ), not numbers (ni3)',
  }),
  italian: z.array(text).min(1, 'needs at least one meaning'),
  tags: z
    .array(tag)
    .optional()
    .transform((t) => normalizeTags(t ?? [])),
  notes: z.string().trim().optional(),
  traditional: text.optional(),
});

export type Entry = z.output<typeof entrySchema>;
