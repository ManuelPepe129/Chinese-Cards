import { useMemo, useState, type ReactNode } from 'react';
import type { Entry } from '../data/schema';
import { searchEntries } from '../filter/search';

function EntryList({ title, entries }: { title: string; entries: Entry[] }) {
  if (entries.length === 0) return null;
  return (
    <section className="entry-group" aria-label={title}>
      <h2>
        {title} <span className="n">{entries.length}</span>
      </h2>
      <ul className="entries">
        {entries.map((e) => (
          <li key={e.hanzi} className="entry">
            <span className="entry-hanzi" lang="zh-Hans">
              {e.hanzi}
            </span>
            <span className="entry-pinyin" lang="zh-Latn-pinyin">
              {e.pinyin}
            </span>
            <span className="entry-it" lang="it">
              {e.italian.join(', ')}
            </span>
            {e.tags.length > 0 && (
              <ul className="tags" aria-label="Tags">
                {e.tags.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

interface Props {
  /** Already narrowed by the tag filter. */
  characters: Entry[];
  sentences: Entry[];
  /** Message shown when the tag filter alone leaves nothing (undefined when no tags are selected). */
  filterEmpty?: ReactNode;
}

export function BrowseView({ characters, sentences, filterEmpty }: Props) {
  const [query, setQuery] = useState('');
  const chars = useMemo(() => searchEntries(characters, query), [characters, query]);
  const sents = useMemo(() => searchEntries(sentences, query), [sentences, query]);
  const total = chars.length + sents.length;
  const searching = query.trim() !== '';

  let body: ReactNode;
  if (total > 0) {
    body = (
      <>
        <EntryList title="Characters" entries={chars} />
        <EntryList title="Sentences" entries={sents} />
      </>
    );
  } else if (searching) {
    body = (
      <div className="message">
        <p>
          <strong>No entries match “{query.trim()}”.</strong> Tag filters are applied too.
        </p>
        <div className="group">
          <button type="button" className="btn" onClick={() => setQuery('')}>
            Clear search
          </button>
        </div>
      </div>
    );
  } else {
    body = filterEmpty ?? (
      <p className="message">
        No entries yet. Add some to <code>public/data/data.json</code>.
      </p>
    );
  }

  return (
    <div className="study browse">
      <div className="search">
        <input
          type="search"
          aria-label="Search entries"
          placeholder="Search hanzi, pinyin or Italian"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
        />
        <p className="count" aria-live="polite">
          {total} {total === 1 ? 'entry' : 'entries'}
        </p>
      </div>
      <div className="browse-scroll">{body}</div>
    </div>
  );
}
