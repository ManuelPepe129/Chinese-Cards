import { describe, expect, it } from 'vitest';
import { DEFAULT_STATE, parseUrlState, serializeUrlState } from './urlState';

describe('parseUrlState', () => {
  it('returns defaults for an empty query', () => {
    expect(parseUrlState('')).toEqual(DEFAULT_STATE);
  });
  it('parses the documented format', () => {
    expect(parseUrlState('?tags=hsk1,lesson-01&match=any&mode=browse&types=sentences')).toEqual({
      tags: ['hsk1', 'lesson-01'],
      match: 'any',
      mode: 'browse',
      types: ['sentences'],
    });
  });
  it('lowercases, trims and dedupes tags, dropping empties', () => {
    expect(parseUrlState('?tags=HSK1,,hsk1, b').tags).toEqual(['hsk1', 'b']);
  });
  it('accepts every mode', () => {
    expect(parseUrlState('?mode=study').mode).toBe('study');
    expect(parseUrlState('?mode=browse').mode).toBe('browse');
    expect(parseUrlState('?mode=review').mode).toBe('review');
  });
  it('shows characters and sentences together by default', () => {
    expect(parseUrlState('').types).toEqual(['characters', 'sentences']);
    expect(parseUrlState('?types=nope').types).toEqual(['characters', 'sentences']);
    expect(parseUrlState('?types=sentences,characters').types).toEqual(['characters', 'sentences']);
  });
  it('keeps old links working: mode=cards / mode=sentences study only that kind', () => {
    expect(parseUrlState('?mode=cards')).toMatchObject({ mode: 'study', types: ['characters'] });
    expect(parseUrlState('?mode=sentences')).toMatchObject({ mode: 'study', types: ['sentences'] });
    expect(parseUrlState('?mode=sentences&types=characters').types).toEqual(['characters']);
  });
  it('falls back to defaults for invalid match/mode', () => {
    const s = parseUrlState('?match=nope&mode=nope');
    expect(s.match).toBe('all');
    expect(s.mode).toBe('study');
  });
});

describe('serializeUrlState', () => {
  it('is empty for the default state', () => {
    expect(serializeUrlState(DEFAULT_STATE)).toBe('');
  });
  it('matches the documented format', () => {
    expect(serializeUrlState({ ...DEFAULT_STATE, tags: ['hsk1', 'lesson-01'] })).toBe(
      '?tags=hsk1,lesson-01&match=all&mode=study',
    );
  });
  it('omits tags when empty but keeps a non-default match', () => {
    expect(serializeUrlState({ ...DEFAULT_STATE, match: 'any' })).toBe('?match=any&mode=study');
  });
  it('keeps a non-default mode even without tags', () => {
    expect(serializeUrlState({ ...DEFAULT_STATE, mode: 'browse' })).toBe('?match=all&mode=browse');
  });
  it('writes the types only when one kind is hidden', () => {
    expect(serializeUrlState({ ...DEFAULT_STATE, types: ['sentences'] })).toBe('?match=all&mode=study&types=sentences');
  });
  it('round-trips tags that need encoding', () => {
    const s = { tags: ['café', 'a b', 'x&y'], match: 'any' as const, mode: 'study' as const, types: ['characters' as const] };
    expect(parseUrlState(serializeUrlState(s))).toEqual(s);
  });
});
