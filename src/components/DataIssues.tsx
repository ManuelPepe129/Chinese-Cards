import type { DataIssue } from '../data/validate';

/** Non-blocking report of entries that were skipped while loading data.json. */
export function DataIssues({ issues }: { issues: DataIssue[] }) {
  if (issues.length === 0) return null;
  return (
    <details className="issues" role="status">
      <summary>
        {issues.length} {issues.length === 1 ? 'problem' : 'problems'} in data.json (affected entries are skipped)
      </summary>
      <ul>
        {issues.map((i, k) => (
          <li key={k}>
            <code>{i.path}</code>
            {i.hanzi ? <span lang="zh-Hans"> {i.hanzi}</span> : null}: {i.message}
          </li>
        ))}
      </ul>
    </details>
  );
}
