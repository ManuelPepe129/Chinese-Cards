import { describe, expect, it } from 'vitest';
import { hanChars, strokeFileName, uniqueHanChars } from './strokes';

describe('strokes helpers', () => {
  it('keeps only Han characters', () => {
    expect(hanChars('你好吗？ ok 123,')).toEqual(['你', '好', '吗']);
  });
  it('collects unique characters in first-seen order', () => {
    expect(uniqueHanChars(['你好', '好人', 'abc'])).toEqual(['你', '好', '人']);
  });
  it('names files by code point', () => {
    expect(strokeFileName('你')).toBe('4f60.json');
    expect(strokeFileName('一')).toBe('4e00.json');
  });
});
