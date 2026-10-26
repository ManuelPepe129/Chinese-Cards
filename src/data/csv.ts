import Papa from 'papaparse';
import { entrySchema, type Entry } from './schema';
import { formatIssue } from './validate';

export type Section = 'characters' | 'sentences';

export interface CsvIssue {
  /**
   * Line in the file (the header is line 1). Blank lines are counted; it can be off by a few
   * after a quoted cell that itself contains a line break.
   */
  row: number;
  message: string;
}
export interface ParsedCsv {
  characters: Entry[];
  sentences: Entry[];
  issues: CsvIssue[];
}

export class CsvError extends Error {}

const HEADER = 'type,hanzi,pinyin,italian,tags';
const REQUIRED = ['type', 'hanzi', 'pinyin', 'italian'];
const KINDS: Record<string, Section> = {
  character: 'characters',
  characters: 'characters',
  sentence: 'sentences',
  sentences: 'sentences',
};

const split = (v: string | undefined) =>
  (v ?? '')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * Parses CSV text with columns type,hanzi,pinyin,italian,tags (";" separates several meanings or tags).
 * Optional extra columns: notes, traditional. The trailing optional cells of a row may be left out entirely.
 * Bad rows are reported and skipped; structural problems (wrong encoding, missing columns) throw CsvError.
 */
export function parseCsv(text: string): ParsedCsv {
  const clean = text.replace(/^\uFEFF/, '');
  if (clean.includes('\uFFFD')) {
    throw new CsvError(
      'The file is not valid UTF-8 (accented letters or hanzi came out as "�"). ' +
        'Save it as UTF-8: Excel "CSV UTF-8 (Comma delimited)", LibreOffice character set "Unicode (UTF-8)".',
    );
  }

  // Parse as plain records (no header mode) so blank lines still count towards line numbers.
  const res = Papa.parse<string[]>(clean, { delimiter: ',', skipEmptyLines: false });
  const rows = res.data;
  const isBlank = (cells: string[]) => cells.every((c) => c.trim() === '');
  const headerAt = rows.findIndex((r) => !isBlank(r));
  const fields = headerAt === -1 ? [] : rows[headerAt].map((h) => h.trim().toLowerCase());

  const missing = REQUIRED.filter((c) => !fields.includes(c));
  if (missing.length > 0) {
    const semicolons = fields.length === 1 && fields[0].includes(';');
    throw new CsvError(
      `Missing column(s): ${missing.join(', ')}. Expected the header "${HEADER}".` +
        (semicolons ? ' This file looks semicolon-delimited; export it as comma-separated CSV.' : ''),
    );
  }
  const col = (name: string) => fields.indexOf(name);
  const needed = Math.max(...REQUIRED.map(col)) + 1; // cells that must exist; later columns are optional

  const quoteProblems = new Set<number>();
  for (const e of res.errors) if (e.type === 'Quotes' && e.row !== undefined) quoteProblems.add(e.row);

  const out: ParsedCsv = { characters: [], sentences: [], issues: [] };
  for (let i = headerAt + 1; i < rows.length; i++) {
    const cells = rows[i];
    if (isBlank(cells)) continue;
    const line = i + 1;
    const fail = (message: string) => out.issues.push({ row: line, message });

    if (quoteProblems.has(i)) {
      fail('unbalanced quote (a field starts with " but never closes); check the rows that follow too');
      continue;
    }
    if (cells.length > fields.length) {
      fail('too many columns (quote fields that contain commas)');
      continue;
    }
    if (cells.length < needed) {
      fail('too few columns');
      continue;
    }
    const cell = (name: string) => (col(name) >= 0 ? cells[col(name)] : undefined);

    const type = (cell('type') ?? '').trim();
    const kind = KINDS[type.toLowerCase()];
    if (!kind) {
      fail(`type must be "character" or "sentence" (got "${type}")`);
      continue;
    }
    const candidate: Record<string, unknown> = {
      hanzi: cell('hanzi'),
      pinyin: cell('pinyin'),
      italian: split(cell('italian')),
      tags: split(cell('tags')),
    };
    if (cell('notes')?.trim()) candidate.notes = cell('notes');
    if (cell('traditional')?.trim()) candidate.traditional = cell('traditional');

    const parsed = entrySchema.safeParse(candidate);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) fail(formatIssue(issue));
      continue;
    }
    out[kind].push(parsed.data);
  }
  return out;
}

export interface Duplicate {
  section: Section;
  hanzi: string;
  reason: 'already in data.json' | 'repeated in the CSV';
}
export interface MergeResult {
  root: Record<string, unknown>;
  added: Record<Section, Entry[]>;
  duplicates: Duplicate[];
}

const key = (hanzi: string) => hanzi.trim().normalize('NFC');

/** Appends new entries to the dataset, skipping duplicates by hanzi (per section). Existing entries are left untouched. */
export function mergeEntries(root: Record<string, unknown>, parsed: ParsedCsv): MergeResult {
  const next: Record<string, unknown> = { ...root };
  const added: Record<Section, Entry[]> = { characters: [], sentences: [] };
  const duplicates: Duplicate[] = [];

  for (const section of ['characters', 'sentences'] as const) {
    const existing = Array.isArray(root[section]) ? (root[section] as unknown[]) : [];
    const known = new Set<string>();
    for (const e of existing) {
      const h = (e as { hanzi?: unknown } | null)?.hanzi;
      if (typeof h === 'string') known.add(key(h));
    }
    const fromFile = new Set<string>();
    for (const entry of parsed[section]) {
      const k = key(entry.hanzi);
      if (known.has(k)) {
        duplicates.push({ section, hanzi: entry.hanzi, reason: fromFile.has(k) ? 'repeated in the CSV' : 'already in data.json' });
        continue;
      }
      known.add(k);
      fromFile.add(k);
      added[section].push(entry);
    }
    next[section] = [...existing, ...added[section]];
  }
  return { root: next, added, duplicates };
}

const inline = (v: unknown): string => (Array.isArray(v) ? `[${v.map(inline).join(', ')}]` : JSON.stringify(v));
const inlineObject = (o: object): string =>
  `{ ${Object.entries(o)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${JSON.stringify(k)}: ${inline(v)}`)
    .join(', ')} }`;

/** data.json layout: one entry per line, so diffs stay readable. */
export function formatDataset(root: Record<string, unknown>): string {
  const keys = Object.keys(root);
  const lines = ['{'];
  keys.forEach((k, i) => {
    const v = root[k];
    const comma = i < keys.length - 1 ? ',' : '';
    const head = `  ${JSON.stringify(k)}: `;
    if (Array.isArray(v) && v.every((x) => typeof x === 'object' && x !== null && !Array.isArray(x))) {
      if (v.length === 0) lines.push(`${head}[]${comma}`);
      else {
        lines.push(`${head}[`);
        v.forEach((e, j) => lines.push(`    ${inlineObject(e as object)}${j < v.length - 1 ? ',' : ''}`));
        lines.push(`  ]${comma}`);
      }
    } else {
      lines.push(`${head}${JSON.stringify(v)}${comma}`);
    }
  });
  lines.push('}');
  return lines.join('\n') + '\n';
}
