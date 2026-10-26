import { describe, expect, it } from 'vitest';
import { DatasetError, validateDataset } from './validate';

const ok = { hanzi: '你', pinyin: 'nǐ', italian: ['tu'], tags: ['HSK1', ' lesson-01 ', 'hsk1'] };

describe('validateDataset', () => {
  it('accepts valid entries and normalizes tags (lowercase, trimmed, deduped)', () => {
    const r = validateDataset({ characters: [ok], sentences: [] });
    expect(r.issues).toEqual([]);
    expect(r.data.characters[0].tags).toEqual(['hsk1', 'lesson-01']);
  });

  it('defaults missing tags to an empty array', () => {
    const { tags: _t, ...noTags } = ok;
    const r = validateDataset({ characters: [noTags], sentences: [] });
    expect(r.data.characters[0].tags).toEqual([]);
  });

  it('rejects numeric pinyin and skips the entry', () => {
    const r = validateDataset({ characters: [{ ...ok, pinyin: 'ni3' }], sentences: [] });
    expect(r.data.characters).toHaveLength(0);
    expect(r.issues).toHaveLength(1);
    expect(r.issues[0]).toMatchObject({ path: 'characters[0]', kind: 'invalid' });
    expect(r.issues[0].message).toContain('tone marks');
  });

  it('rejects commas inside tags (they separate tags in the URL)', () => {
    const r = validateDataset({ characters: [{ ...ok, tags: ['a,b'] }], sentences: [] });
    expect(r.issues[0].message).toContain('commas');
  });

  it('requires at least one Italian meaning', () => {
    const r = validateDataset({ characters: [{ ...ok, italian: [] }], sentences: [] });
    expect(r.issues[0].message).toContain('italian');
  });

  it('reports unknown keys (typos)', () => {
    const r = validateDataset({ characters: [{ ...ok, note: 'x' }], sentences: [] });
    expect(r.issues).toHaveLength(1);
    expect(r.data.characters).toHaveLength(0);
  });

  it('flags duplicates by hanzi only and keeps the first', () => {
    const r = validateDataset({
      characters: [ok, { ...ok, pinyin: 'nī', italian: ['altro'] }],
      sentences: [],
    });
    expect(r.data.characters).toHaveLength(1);
    expect(r.data.characters[0].pinyin).toBe('nǐ');
    expect(r.issues).toEqual([
      expect.objectContaining({ path: 'characters[1]', kind: 'duplicate', hanzi: '你' }),
    ]);
  });

  it('does not treat the same hanzi in different sections as duplicates', () => {
    const r = validateDataset({ characters: [ok], sentences: [ok] });
    expect(r.issues).toEqual([]);
  });

  it('keeps valid entries when others are invalid', () => {
    const r = validateDataset({ characters: [{ hanzi: '好' }, ok], sentences: [] });
    expect(r.data.characters.map((e) => e.hanzi)).toEqual(['你']);
    expect(r.issues.length).toBeGreaterThan(0);
  });

  it('reports a section that is not an array', () => {
    const r = validateDataset({ characters: [ok] });
    expect(r.issues).toEqual([expect.objectContaining({ path: 'sentences' })]);
  });

  it('throws DatasetError when the root is not an object', () => {
    expect(() => validateDataset([])).toThrow(DatasetError);
    expect(() => validateDataset(null)).toThrow(DatasetError);
  });
});
