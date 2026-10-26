import { describe, expect, it } from 'vitest';
import { searchEntries } from './search';

const a = { hanzi: '你好', traditional: undefined, pinyin: 'nǐ hǎo', italian: ['ciao', 'buongiorno'], tags: ['greetings'] };
const b = { hanzi: '为什么', traditional: '為什麼', pinyin: 'wèishénme', italian: ['perché'], tags: ['questions'] };
const c = { hanzi: '你', pinyin: 'nǐ', italian: ['tu'], tags: ['pronouns'] };
const all = [a, b, c];

describe('searchEntries', () => {
  it('returns the same array for an empty query', () => {
    expect(searchEntries(all, '')).toBe(all);
    expect(searchEntries(all, '   ')).toBe(all);
  });
  it('ignores tone marks in both query and data', () => {
    expect(searchEntries(all, 'ni')).toEqual([a, c]);
    expect(searchEntries(all, 'nǐ')).toEqual([a, c]);
  });
  it('ignores accents and case in Italian', () => {
    expect(searchEntries(all, 'PERCHE')).toEqual([b]);
  });
  it('finds pinyin typed without spaces', () => {
    expect(searchEntries(all, 'nihao')).toEqual([a]);
  });
  it('matches hanzi and traditional forms', () => {
    expect(searchEntries(all, '你')).toEqual([a, c]);
    expect(searchEntries(all, '為什麼')).toEqual([b]);
  });
  it('requires every term (AND) across fields, including tags', () => {
    expect(searchEntries(all, 'tu pronouns')).toEqual([c]);
    expect(searchEntries(all, 'tu greetings')).toEqual([]);
  });
});
