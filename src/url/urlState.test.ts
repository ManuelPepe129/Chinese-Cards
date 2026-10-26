import { describe, expect, it } from 'vitest';
import { DEFAULT_STATE, parseUrlState, serializeUrlState } from './urlState';

describe('parseUrlState', () => {
  it('returns defaults for an empty query', () => {
    expect(parseUrlState('')).toEqual(DEFAULT_STATE);
  });
  it('parses the documented format', () => {
    expect(parseUrlState('?tags=hsk1,lesson-01&match=any&mode=cards')).toEqual({
      tags: ['hsk1', 'lesson-01'],
      match: 'any',
      mode: 'cards',
    });
  });
  it('lowercases, trims and dedupes tags, dropping empties', () => {
    expect(parseUrlState('?tags=HSK1,,hsk1, b').tags).toEqual(['hsk1', 'b']);
  });
  it('accepts every mode', () => {
    expect(parseUrlState('?mode=sentences').mode).toBe('sentences');
    expect(parseUrlState('?mode=browse').mode).toBe('browse');
  });
  it('falls back to defaults for invalid match/mode', () => {
    const s = parseUrlState('?match=nope&mode=nope');
    expect(s.match).toBe('all');
    expect(s.mode).toBe('cards');
  });
});

describe('serializeUrlState', () => {
  it('is empty for the default state', () => {
    expect(serializeUrlState(DEFAULT_STATE)).toBe('');
  });
  it('matches the documented format', () => {
    expect(serializeUrlState({ tags: ['hsk1', 'lesson-01'], match: 'all', mode: 'cards' })).toBe(
      '?tags=hsk1,lesson-01&match=all&mode=cards',
    );
  });
  it('omits tags when empty but keeps a non-default match', () => {
    expect(serializeUrlState({ tags: [], match: 'any', mode: 'cards' })).toBe('?match=any&mode=cards');
  });
  it('keeps a non-default mode even without tags', () => {
    expect(serializeUrlState({ tags: [], match: 'all', mode: 'browse' })).toBe('?match=all&mode=browse');
  });
  it('round-trips tags that need encoding', () => {
    const s = { tags: ['café', 'a b', 'x&y'], match: 'any' as const, mode: 'cards' as const };
    expect(parseUrlState(serializeUrlState(s))).toEqual(s);
  });
});
