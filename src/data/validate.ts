import { entrySchema, type Entry } from './schema';

export interface Dataset {
  characters: Entry[];
  sentences: Entry[];
}

export interface DataIssue {
  /** JSON path of the offending entry, e.g. "characters[3]". */
  path: string;
  hanzi?: string;
  kind: 'invalid' | 'duplicate';
  message: string;
}

export interface ValidationResult {
  data: Dataset;
  issues: DataIssue[];
}

export function formatIssue(issue: { path: readonly PropertyKey[]; message: string }): string {
  const where = issue.path.length ? `${issue.path.map(String).join('.')}: ` : '';
  return `${where}${issue.message}`;
}

/** Unrecoverable problem (network, bad JSON, wrong root shape). */
export class DatasetError extends Error {}

const SECTIONS = ['characters', 'sentences'] as const;

/**
 * Validates raw data.json content. Invalid and duplicate entries are skipped
 * and reported in `issues`; everything else is kept, so one typo never blocks study.
 * Duplicates are detected by hanzi only (first occurrence wins), per section.
 */
export function validateDataset(raw: unknown): ValidationResult {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new DatasetError('data.json must be an object with "characters" and "sentences" arrays.');
  }
  const root = raw as Record<string, unknown>;
  const data: Dataset = { characters: [], sentences: [] };
  const issues: DataIssue[] = [];

  for (const section of SECTIONS) {
    const list = root[section];
    if (!Array.isArray(list)) {
      issues.push({ path: section, kind: 'invalid', message: `"${section}" must be an array.` });
      continue;
    }
    const firstSeen = new Map<string, number>();
    list.forEach((item, index) => {
      const path = `${section}[${index}]`;
      const parsed = entrySchema.safeParse(item);
      if (!parsed.success) {
        const hanzi = typeof (item as { hanzi?: unknown })?.hanzi === 'string' ? (item as { hanzi: string }).hanzi : undefined;
        for (const issue of parsed.error.issues) {
          issues.push({ path, hanzi, kind: 'invalid', message: formatIssue(issue) });
        }
        return;
      }
      const key = parsed.data.hanzi.normalize('NFC');
      const first = firstSeen.get(key);
      if (first !== undefined) {
        issues.push({
          path,
          hanzi: parsed.data.hanzi,
          kind: 'duplicate',
          message: `duplicate of ${section}[${first}]; skipped.`,
        });
        return;
      }
      firstSeen.set(key, index);
      data[section].push(parsed.data);
    });
  }
  return { data, issues };
}
