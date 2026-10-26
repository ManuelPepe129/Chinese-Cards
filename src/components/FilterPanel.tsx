import { useEffect, useRef } from 'react';
import type { MatchMode, TagGroup } from '../filter/filter';

interface Props {
  groups: TagGroup[];
  selected: string[];
  match: MatchMode;
  matched: number;
  total: number;
  open: boolean;
  onToggleTag: (tag: string) => void;
  onMatch: (m: MatchMode) => void;
  onClear: () => void;
  onClose: () => void;
}

/**
 * Phone: bottom sheet. Tablet and desktop: side panel. Collapsible everywhere via `open`
 * (the parent starts it open on desktop and closed on smaller screens).
 */
export function FilterPanel({ groups, selected, match, matched, total, open, onToggleTag, onMatch, onClear, onClose }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const wasOpen = useRef(open);
  useEffect(() => {
    // Move focus into the panel only when the user opens it, not on first render (desktop starts open).
    if (open && !wasOpen.current) headingRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  return (
    <aside
      id="filters"
      className="filters"
      aria-label="Filters"
      data-open={open}
      data-no-shortcuts
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="filters-head">
        <div>
          <h2 ref={headingRef} tabIndex={-1}>
            Filters
          </h2>
          <p className="count" aria-live="polite">
            {matched} of {total} {total === 1 ? 'card' : 'cards'}
          </p>
        </div>
        <div className="group">
          <button type="button" className="btn" disabled={selected.length === 0} onClick={onClear}>
            Clear
          </button>
          <button type="button" className="btn close" onClick={onClose}>
            Done
          </button>
        </div>
      </div>

      <div className="seg" role="group" aria-label="How to combine tags">
        <button type="button" aria-pressed={match === 'all'} onClick={() => onMatch('all')}>
          Match all
        </button>
        <button type="button" aria-pressed={match === 'any'} onClick={() => onMatch('any')}>
          Match any
        </button>
      </div>
      <p className="help">
        {match === 'all' ? 'Cards must have every selected tag.' : 'Cards need at least one selected tag.'}
      </p>

      {groups.length === 0 && <p className="help">No tags in the data yet.</p>}
      {groups.map((g) => (
        <section key={g.key} className="tag-group" aria-label={g.label}>
          <h3>{g.label}</h3>
          <div className="chips">
            {g.tags.map(({ tag, count }) => (
              <button
                key={tag}
                type="button"
                className="chip"
                aria-pressed={selected.includes(tag)}
                data-missing={count === 0}
                aria-label={`${tag}, ${count} ${count === 1 ? 'card' : 'cards'}`}
                onClick={() => onToggleTag(tag)}
              >
                {tag}
                <span className="n" aria-hidden="true">
                  {count}
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </aside>
  );
}
