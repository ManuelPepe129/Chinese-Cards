import { describe, expect, it } from 'vitest';
import { groupTags, matchEntries, tagPrefix } from './filter';

const e = (hanzi: string, ...tags: string[]) => ({ hanzi, tags });
const data = [
  e('a', 'hsk1', 'lesson-01', 'pronouns'),
  e('b', 'hsk1', 'lesson-02'),
  e('c', 'hsk2', 'lesson-01', 'verbs'),
  e('d'),
];
const hanzi = (xs: { hanzi: string }[]) => xs.map((x) => x.hanzi);

describe('matchEntries', () => {
  it('returns everything (same array) when nothing is selected', () => {
    expect(matchEntries(data, [], 'all')).toBe(data);
    expect(matchEntries(data, [], 'any')).toBe(data);
  });
  it('AND requires every selected tag', () => {
    expect(hanzi(matchEntries(data, ['hsk1', 'lesson-01'], 'all'))).toEqual(['a']);
    expect(hanzi(matchEntries(data, ['hsk1', 'verbs'], 'all'))).toEqual([]);
  });
  it('OR requires at least one selected tag', () => {
    expect(hanzi(matchEntries(data, ['hsk2', 'lesson-02'], 'any'))).toEqual(['b', 'c']);
  });
  it('single tag behaves the same in both modes', () => {
    expect(hanzi(matchEntries(data, ['hsk1'], 'all'))).toEqual(['a', 'b']);
    expect(hanzi(matchEntries(data, ['hsk1'], 'any'))).toEqual(['a', 'b']);
  });
  it('unknown tags: AND matches nothing, OR ignores them', () => {
    expect(matchEntries(data, ['hsk1', 'nope'], 'all')).toEqual([]);
    expect(hanzi(matchEntries(data, ['hsk2', 'nope'], 'any'))).toEqual(['c']);
  });
  it('is case-insensitive on the selection', () => {
    expect(hanzi(matchEntries(data, ['HSK2'], 'all'))).toEqual(['c']);
  });
});

describe('tagPrefix', () => {
  it('uses the leading letters before a digit or dash', () => {
    expect(tagPrefix('hsk1')).toBe('hsk');
    expect(tagPrefix('lesson-01')).toBe('lesson');
    expect(tagPrefix('pronouns')).toBe('other');
    expect(tagPrefix('tema-cibo')).toBe('tema');
  });
});

describe('groupTags', () => {
  it('groups by prefix, sorts naturally, puts Other last, and counts', () => {
    const groups = groupTags([
      e('1', 'lesson-10', 'hsk1', 'verbs'),
      e('2', 'lesson-2', 'hsk1'),
      e('3', 'hsk2', 'food'),
    ]);
    expect(groups.map((g) => g.label)).toEqual(['HSK', 'Lesson', 'Other']);
    expect(groups[0].tags).toEqual([
      { tag: 'hsk1', count: 2 },
      { tag: 'hsk2', count: 1 },
    ]);
    expect(groups[1].tags.map((t) => t.tag)).toEqual(['lesson-2', 'lesson-10']);
    expect(groups[2].tags.map((t) => t.tag)).toEqual(['food', 'verbs']);
  });
  it('lists tags from the universe with count 0 when absent from the current view', () => {
    const view = [e('1', 'hsk1')];
    const universe = [...view, e('2', 'hsk1', 'greetings')];
    const groups = groupTags(view, [], universe);
    expect(groups.find((g) => g.key === 'other')?.tags).toEqual([{ tag: 'greetings', count: 0 }]);
    expect(groups.find((g) => g.key === 'hsk')?.tags).toEqual([{ tag: 'hsk1', count: 1 }]);
  });
  it('keeps selected tags that are missing from the data, with count 0', () => {
    const groups = groupTags([e('1', 'hsk1')], ['hsk9']);
    expect(groups[0].tags).toEqual([
      { tag: 'hsk1', count: 1 },
      { tag: 'hsk9', count: 0 },
    ]);
  });
});
