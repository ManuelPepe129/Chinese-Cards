import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatDataset } from './csv';
import { validateDataset } from './validate';

/** Runs scripts/import-csv.ts the same way `npm run import:csv` does. */
describe('import:csv script', () => {
  it('supports --dry-run, merges once, is idempotent, and fails cleanly on bad input', () => {
    const dir = mkdtempSync(join(tmpdir(), 'import-csv-'));
    try {
      const data = join(dir, 'data.json');
      const csv = join(dir, 'in.csv');
      writeFileSync(
        data,
        formatDataset({
          $schema: './data.schema.json',
          characters: [{ hanzi: '你', pinyin: 'nǐ', italian: ['tu'], tags: [] }],
          sentences: [],
        }),
      );
      writeFileSync(csv, 'type,hanzi,pinyin,italian,tags\ncharacter,你,nǐ,tu,a\ncharacter,好,hǎo,bene;buono,hsk1\n');
      const run = (file: string, ...args: string[]) =>
        execFileSync(process.execPath, ['--import', 'tsx', 'scripts/import-csv.ts', file, '--data', data, ...args], {
          encoding: 'utf8',
          stdio: 'pipe',
        });

      const original = readFileSync(data, 'utf8');
      expect(run(csv, '--dry-run')).toContain('Would add 1 character');
      expect(readFileSync(data, 'utf8')).toBe(original); // dry run writes nothing

      const out = run(csv);
      expect(out).toContain('Added 1 character');
      expect(out).toContain('Skipped 1 duplicate');
      const merged = readFileSync(data, 'utf8');
      const json = JSON.parse(merged);
      expect(json.$schema).toBe('./data.schema.json');
      expect(json.characters.map((e: { hanzi: string }) => e.hanzi)).toEqual(['你', '好']);
      expect(json.characters[1].italian).toEqual(['bene', 'buono']);
      expect(validateDataset(json).issues).toEqual([]);

      expect(run(csv)).toContain('Nothing to add');
      expect(readFileSync(data, 'utf8')).toBe(merged); // second run changes nothing
      expect(existsSync(`${data}.tmp`)).toBe(false);

      expect(() => run(join(dir, 'missing.csv'))).toThrow(/file not found/);
      writeFileSync(join(dir, 'bad.csv'), 'hanzi,pinyin\n你,nǐ\n');
      expect(() => run(join(dir, 'bad.csv'))).toThrow(/Missing column/);
      expect(readFileSync(data, 'utf8')).toBe(merged); // failures leave the data untouched
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);
});
