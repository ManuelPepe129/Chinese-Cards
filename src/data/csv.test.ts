import { describe, expect, it } from 'vitest';
import { CsvError, formatDataset, mergeEntries, parseCsv } from './csv';
import { validateDataset } from './validate';

const HEADER = 'type,hanzi,pinyin,italian,tags\n';

describe('parseCsv', () => {
  it('parses characters and sentences, splitting ";" lists and normalizing tags', () => {
    const r = parseCsv(
      HEADER + 'character,你,nǐ,tu;voi,HSK1; lesson-01\nsentence,你好,nǐ hǎo,ciao,hsk1\n',
    );
    expect(r.issues).toEqual([]);
    expect(r.characters[0]).toMatchObject({ hanzi: '你', italian: ['tu', 'voi'], tags: ['hsk1', 'lesson-01'] });
    expect(r.sentences).toHaveLength(1);
  });
  it('handles quoted fields with commas, a BOM and CRLF line endings', () => {
    const r = parseCsv('\uFEFF' + HEADER.replace('\n', '\r\n') + 'sentence,好,hǎo,"bene, bravo",t\r\n');
    expect(r.issues).toEqual([]);
    expect(r.sentences[0].italian).toEqual(['bene, bravo']);
  });
  it('supports optional notes and traditional columns', () => {
    const r = parseCsv('type,hanzi,pinyin,italian,tags,notes,traditional\ncharacter,们,men,plurale,hsk1,suffisso,們\n');
    expect(r.characters[0]).toMatchObject({ notes: 'suffisso', traditional: '們' });
  });
  it('allows an empty tags cell', () => {
    expect(parseCsv(HEADER + 'character,你,nǐ,tu,\n').characters[0].tags).toEqual([]);
  });
  it('reports bad rows with file line numbers and keeps the good ones', () => {
    const r = parseCsv(
      HEADER + 'character,你,ni3,tu,a\nword,好,hǎo,bene,a\ncharacter,我,wǒ,io,a\ncharacter,他,tā\n',
    );
    expect(r.characters.map((e) => e.hanzi)).toEqual(['我']);
    expect(r.issues.map((i) => i.row)).toEqual([2, 3, 5]);
    expect(r.issues[0].message).toContain('tone marks');
    expect(r.issues[1].message).toContain('type must be');
    expect(r.issues[2].message).toContain('too few');
  });
  it('flags unquoted commas as too many columns', () => {
    const r = parseCsv(HEADER + 'character,你,nǐ,bene, bravo,a\n');
    expect(r.characters).toHaveLength(0);
    expect(r.issues[0].message).toContain('too many');
  });
  it('throws on missing columns, hinting at semicolon-delimited files', () => {
    expect(() => parseCsv('hanzi,pinyin\n你,nǐ\n')).toThrow(CsvError);
    expect(() => parseCsv('type;hanzi;pinyin;italian;tags\ncharacter;你;nǐ;tu;a\n')).toThrow(/semicolon/);
  });
});

describe('parseCsv robustness', () => {
  it('reports file line numbers even when blank lines are present', () => {
    const r = parseCsv(HEADER + 'character,我,wǒ,io,a\n\ncharacter,你,ni3,tu,a\n');
    expect(r.characters.map((e) => e.hanzi)).toEqual(['我']);
    expect(r.issues.map((i) => i.row)).toEqual([4]);
  });
  it('ignores leading and trailing blank lines', () => {
    const r = parseCsv('\n\n' + HEADER + 'character,我,wǒ,io,a\n\n\n');
    expect(r.issues).toEqual([]);
    expect(r.characters).toHaveLength(1);
  });
  it('accepts a header with different case and spacing', () => {
    const r = parseCsv('Type, Hanzi ,PINYIN,Italian,Tags\ncharacter,我,wǒ,io,a\n');
    expect(r.issues).toEqual([]);
    expect(r.characters).toHaveLength(1);
  });
  it('accepts rows that leave out the trailing tags cell, but not required ones', () => {
    const r = parseCsv(HEADER + 'character,我,wǒ,io\ncharacter,你,nǐ\n');
    expect(r.characters.map((e) => [e.hanzi, e.tags])).toEqual([['我', []]]);
    expect(r.issues).toEqual([expect.objectContaining({ row: 3, message: expect.stringContaining('too few') })]);
  });
  it('reports an unbalanced quote instead of silently dropping or mangling the row', () => {
    const r = parseCsv(HEADER + 'character,你,nǐ,"tu,a\ncharacter,我,wǒ,io,a\n');
    expect(r.characters.map((e) => e.hanzi)).not.toContain('你');
    expect(r.issues.some((i) => i.row === 2 && i.message.includes('unbalanced'))).toBe(true);
  });
  it('rejects files that are not valid UTF-8 instead of importing garbled text', () => {
    expect(() => parseCsv(HEADER + 'character,好,hǎo,caff\uFFFD,a\n')).toThrow(/UTF-8/);
  });
  it('reports an empty hanzi cell', () => {
    const r = parseCsv(HEADER + 'character,,wǒ,io,a\n');
    expect(r.characters).toHaveLength(0);
    expect(r.issues[0].message).toContain('hanzi');
  });
});

describe('mergeEntries', () => {
  const root = {
    $schema: './data.schema.json',
    characters: [{ hanzi: '你', pinyin: 'nǐ', italian: ['tu'], tags: [], custom: 1 }],
    sentences: [],
  };
  it('skips duplicates already present and repeated in the file, keeping existing entries untouched', () => {
    const parsed = parseCsv(
      HEADER + 'character,你,nǐ,altro,a\ncharacter,好,hǎo,bene,a\ncharacter,好,hǎo,buono,a\nsentence,你,nǐ,tu,a\n',
    );
    const r = mergeEntries(root, parsed);
    expect(r.added.characters.map((e) => e.hanzi)).toEqual(['好']);
    expect(r.added.sentences.map((e) => e.hanzi)).toEqual(['你']); // other section: not a duplicate
    expect(r.duplicates).toEqual([
      { section: 'characters', hanzi: '你', reason: 'already in data.json' },
      { section: 'characters', hanzi: '好', reason: 'repeated in the CSV' },
    ]);
    expect((r.root.characters as unknown[])[0]).toBe(root.characters[0]);
    expect(r.root.$schema).toBe('./data.schema.json');
  });
});

describe('formatDataset', () => {
  it('writes one entry per line and round-trips through the validator', () => {
    const root = { $schema: './s.json', characters: [{ hanzi: '你', pinyin: 'nǐ', italian: ['tu', 'voi'], tags: ['a'] }], sentences: [] };
    const text = formatDataset(root);
    expect(text).toBe(
      '{\n  "$schema": "./s.json",\n  "characters": [\n    { "hanzi": "你", "pinyin": "nǐ", "italian": ["tu", "voi"], "tags": ["a"] }\n  ],\n  "sentences": []\n}\n',
    );
    expect(JSON.parse(text)).toEqual(root);
    expect(validateDataset(JSON.parse(text)).issues).toEqual([]);
  });
});

describe('mergeEntries edge cases', () => {
  it('creates missing sections and treats canonically equivalent hanzi as duplicates', () => {
    const composed = '\u00e9';
    const decomposed = 'e\u0301';
    const parsed = parseCsv(HEADER + `character,${composed},x,a,\ncharacter,${decomposed},x,b,\n`);
    const r = mergeEntries({}, parsed);
    expect(r.added.characters).toHaveLength(1);
    expect(r.duplicates).toHaveLength(1);
    expect(r.root.sentences).toEqual([]);
  });
});
