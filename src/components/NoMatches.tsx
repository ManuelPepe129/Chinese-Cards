import type { MatchMode } from '../filter/filter';

interface Props {
  tagCount: number;
  match: MatchMode;
  onMatchAny: () => void;
  onClear: () => void;
}

/** Shown when the tag filter leaves nothing to display. */
export function NoMatches({ tagCount, match, onMatchAny, onClear }: Props) {
  const canWiden = match === 'all' && tagCount > 1;
  return (
    <div className="message">
      <p>
        <strong>No cards match these tags.</strong>{' '}
        {canWiden ? 'Try “Match any”, or remove a tag.' : 'Remove a tag to see more.'}
      </p>
      <div className="group">
        {canWiden && (
          <button type="button" className="btn" onClick={onMatchAny}>
            Match any
          </button>
        )}
        <button type="button" className="btn" onClick={onClear}>
          Clear filters
        </button>
      </div>
    </div>
  );
}
