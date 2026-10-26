/**
 * Copies Hanzi Writer stroke data for exactly the characters used in data.json into
 * public/strokes/<codepoint>.json, so stroke order works offline without bundling the whole dataset.
 * Runs automatically before `npm run dev` and `npm run build`.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { strokeFileName, uniqueHanChars } from '../src/lib/strokes';

const dataPath = join('public', 'data', 'data.json');
const outDir = join('public', 'strokes');
const pkgDir = join('node_modules', 'hanzi-writer-data');

function hanziInData(): string[] {
  const raw = JSON.parse(readFileSync(dataPath, 'utf8')) as Record<string, unknown>;
  const texts: string[] = [];
  for (const section of ['characters', 'sentences']) {
    const list = raw[section];
    if (!Array.isArray(list)) continue;
    for (const e of list) {
      const h = (e as { hanzi?: unknown } | null)?.hanzi;
      if (typeof h === 'string') texts.push(h);
    }
  }
  return uniqueHanChars(texts);
}

function main() {
  if (!existsSync(pkgDir)) {
    console.error('hanzi-writer-data is not installed. Run `npm install` first.');
    process.exit(1);
  }
  const chars = hanziInData();
  mkdirSync(outDir, { recursive: true });

  const wanted = new Set<string>();
  const missing: string[] = [];
  for (const c of chars) {
    const src = join(pkgDir, `${c}.json`);
    if (!existsSync(src)) {
      missing.push(c);
      continue;
    }
    wanted.add(strokeFileName(c));
    copyFileSync(src, join(outDir, strokeFileName(c)));
  }
  for (const f of readdirSync(outDir)) if (!wanted.has(f)) rmSync(join(outDir, f)); // drop stale files

  console.log(`Stroke data: ${wanted.size} character(s) copied to ${outDir}.`);
  if (missing.length) console.warn(`No stroke data available for: ${missing.join(' ')} (the card will show a small notice).`);
}

main();
