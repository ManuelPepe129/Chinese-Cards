import { useEffect, useState } from 'react';
import { loadStrokeData } from '../lib/strokeData';

const isHan = (c: string) => /\p{Script=Han}/u.test(c);

/** Fewest lines of at most `perLine`, nearly equal length (7 → 4 + 3, not 6 + 1). */
export function splitLines<T>(items: T[], perLine = 6): T[][] {
  if (items.length === 0) return [];
  const lines = Math.ceil(items.length / perLine);
  const size = Math.ceil(items.length / lines);
  return Array.from({ length: lines }, (_, i) => items.slice(i * size, (i + 1) * size));
}

export function BrushText({ text }: { text: string }) {
  const chars = [...text];
  const [paths, setPaths] = useState<Record<string, string[] | null>>({});

  useEffect(() => {
    let cancelled = false;
    for (const c of new Set(chars.filter(isHan))) {
      void loadStrokeData(c).then((d) => {
        if (!cancelled) setPaths((p) => ({ ...p, [c]: d ? d.strokes : null }));
      });
    }
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const ready = chars.every((c) => !isHan(c) || paths[c] !== undefined); // hide until loaded: no font flash
  return (
    <span className="hanzi brush" role="img" aria-label={text} lang="zh-Hans" data-ready={ready}>
      {splitLines(chars).map((line, li) => (
        <span key={li} className="brush-line" aria-hidden="true">
          {line.map((c, i) =>
            paths[c] ? (
              <svg key={i} className="brush-ch" viewBox="0 0 1024 1024" focusable="false">
                <g transform="scale(1,-1) translate(0,-900)">
                  {paths[c]!.map((d, k) => <path key={k} d={d} />)}
                </g>
              </svg>
            ) : (
              <span key={i} className="brush-ch brush-fallback">{c}</span>
            ),
          )}
        </span>
      ))}
    </span>
  );
}