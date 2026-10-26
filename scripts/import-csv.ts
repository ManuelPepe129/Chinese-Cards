/**
 * Usage: npm run import:csv -- path/to/file.csv [--dry-run] [--data public/data/data.json]
 * Columns: type,hanzi,pinyin,italian,tags   (type = character | sentence; ";" separates several meanings/tags)
 */
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { CsvError, formatDataset, mergeEntries, parseCsv } from '../src/data/csv';

function fail(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    'dry-run': { type: 'boolean', default: false },
    data: { type: 'string', default: 'public/data/data.json' },
  },
});

const csvPath = positionals[0];
if (!csvPath) fail('missing CSV file.\nUsage: npm run import:csv -- path/to/file.csv [--dry-run]');
if (!existsSync(csvPath)) fail(`file not found: ${csvPath}`);
if (!existsSync(values.data!)) fail(`data file not found: ${values.data}`);

let root: Record<string, unknown>;
try {
  const raw: unknown = JSON.parse(readFileSync(values.data!, 'utf8'));
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new Error('root must be an object');
  root = raw as Record<string, unknown>;
} catch (e) {
  fail(`${values.data} is not valid: ${(e as Error).message}`);
}

try {
  const parsed = parseCsv(readFileSync(csvPath, 'utf8'));
  const { root: merged, added, duplicates } = mergeEntries(root, parsed);
  const n = added.characters.length + added.sentences.length;

  console.log(`${values['dry-run'] ? '[dry run] Would add' : 'Added'} ${added.characters.length} character(s) and ${added.sentences.length} sentence(s).`);
  if (duplicates.length) {
    console.log(`Skipped ${duplicates.length} duplicate(s):`);
    for (const d of duplicates) console.log(`  ${d.section}: ${d.hanzi} (${d.reason})`);
  }
  if (parsed.issues.length) {
    console.log(`Skipped ${parsed.issues.length} invalid row problem(s):`);
    for (const i of parsed.issues) console.log(`  line ${i.row}: ${i.message}`);
  }
  if (n > 0 && !values['dry-run']) {
    // Write to a temp file and rename, so an interrupted run can never leave a half-written data.json.
    const tmp = `${values.data}.tmp`;
    writeFileSync(tmp, formatDataset(merged));
    renameSync(tmp, values.data!);
    console.log(`Updated ${values.data}. Run \`npm run strokes\` (or start the dev server) to fetch stroke data for new characters.`);
  } else if (n === 0) {
    console.log('Nothing to add.');
  }
} catch (e) {
  if (e instanceof CsvError) fail(e.message);
  throw e;
}
