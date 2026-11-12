import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { useDataset } from './data/useDataset';
import type { DataIssue, Dataset } from './data/validate';
import { BrowseView } from './components/BrowseView';
import { DataIssues } from './components/DataIssues';
import { FilterPanel } from './components/FilterPanel';
import { ModeNav } from './components/ModeNav';
import { NoMatches } from './components/NoMatches';
import { ReviewView, type ReviewItem } from './components/ReviewView';
import { DEFAULT_OPTIONS, StudyView, type StudyOptions } from './components/StudyView';
import { groupTags, matchEntries } from './filter/filter';
import { cardKey } from './srs/keys';
import { ENTRY_TYPES, type EntryType } from './url/urlState';
import { useUrlState } from './url/useUrlState';

function Header({ center, right }: { center?: ReactNode; right?: ReactNode }) {
  return (
    <header className="topbar">
      <h1>Mandarin cards</h1>
      {center}
      <div className="topbar-right">
        <p className="keys">Space flips, ← → move</p>
        {right}
      </div>
    </header>
  );
}

/** Desktop starts with the filters open; phones and tablets start collapsed. */
const startsOpen = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1100px)').matches;

function Workspace({ data, issues }: { data: Dataset; issues: DataIssue[] }) {
  const [url, updateUrl] = useUrlState();
  const [filtersOpen, setFiltersOpen] = useState(startsOpen);
  const [options, setOptions] = useState<StudyOptions>(DEFAULT_OPTIONS);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const patchOptions = useCallback((p: Partial<StudyOptions>) => setOptions((o) => ({ ...o, ...p })), []);

  const { characters, sentences } = data;
  const filteredChars = useMemo(
    () => matchEntries(characters, url.tags, url.match),
    [characters, url.tags, url.match],
  );
  const filteredSents = useMemo(
    () => matchEntries(sentences, url.tags, url.match),
    [sentences, url.tags, url.match],
  );
  const showChars = url.types.includes('characters');
  const showSents = url.types.includes('sentences');
  // What is shown after the type and tag filters.
  const shownChars = useMemo(() => (showChars ? filteredChars : []), [showChars, filteredChars]);
  const shownSents = useMemo(() => (showSents ? filteredSents : []), [showSents, filteredSents]);
  const studyEntries = useMemo(() => [...shownChars, ...shownSents], [shownChars, shownSents]);
  // Review keeps progress per card, so each item carries its stable key.
  const reviewItems = useMemo<ReviewItem[]>(
    () => [
      ...shownChars.map((entry) => ({ key: cardKey('character', entry.hanzi), entry })),
      ...shownSents.map((entry) => ({ key: cardKey('sentence', entry.hanzi), entry })),
    ],
    [shownChars, shownSents],
  );

  // What the type filter lets through (before the tag filter), for chip counts and the "x of y" total.
  const scope = useMemo(
    () => [...(showChars ? characters : []), ...(showSents ? sentences : [])],
    [showChars, showSents, characters, sentences],
  );
  const universe = useMemo(() => [...characters, ...sentences], [characters, sentences]);
  const groups = useMemo(() => groupTags(scope, url.tags, universe), [scope, url.tags, universe]);
  const matchedCount = studyEntries.length;
  const typeCounts = { characters: filteredChars.length, sentences: filteredSents.length };

  const toggleType = useCallback(
    (t: EntryType) => {
      const next = url.types.includes(t) ? url.types.filter((x) => x !== t) : [...url.types, t];
      if (next.length > 0) updateUrl({ types: ENTRY_TYPES.filter((x) => next.includes(x)) }); // never none
    },
    [url.types, updateUrl],
  );
  const toggleTag = useCallback(
    (tag: string) =>
      updateUrl({ tags: url.tags.includes(tag) ? url.tags.filter((t) => t !== tag) : [...url.tags, tag] }),
    [url.tags, updateUrl],
  );
  const clear = useCallback(() => updateUrl({ tags: [] }), [updateUrl]);
  const closeFilters = useCallback(() => {
    setFiltersOpen(false);
    toggleRef.current?.focus();
  }, []);

  const empty =
    url.tags.length > 0 ? (
      <NoMatches
        tagCount={url.tags.length}
        match={url.match}
        onMatchAny={() => updateUrl({ match: 'any' })}
        onClear={clear}
      />
    ) : undefined;

  return (
    <>
      <Header
        center={<ModeNav mode={url.mode} onChange={(mode) => updateUrl({ mode })} />}
        right={
          <button
            ref={toggleRef}
            type="button"
            className="btn filters-toggle"
            aria-expanded={filtersOpen}
            aria-controls="filters"
            onClick={() => setFiltersOpen((o) => !o)}
          >
            Filters
            {url.tags.length > 0 && <span className="badge">{url.tags.length}</span>}
          </button>
        }
      />
      <DataIssues issues={issues} />
      <div className="layout">
        <div className="backdrop" data-open={filtersOpen} onClick={closeFilters} aria-hidden="true" />
        <FilterPanel
          groups={groups}
          selected={url.tags}
          match={url.match}
          types={url.types}
          typeCounts={typeCounts}
          matched={matchedCount}
          total={scope.length}
          open={filtersOpen}
          onToggleType={toggleType}
          onToggleTag={toggleTag}
          onMatch={(match) => updateUrl({ match })}
          onClear={clear}
          onClose={closeFilters}
        />
        {url.mode === 'browse' ? (
          <BrowseView characters={shownChars} sentences={shownSents} filterEmpty={empty} />
        ) : url.mode === 'review' ? (
          <ReviewView items={reviewItems} empty={empty} />
        ) : (
          <StudyView
            entries={studyEntries}
            options={options}
            onOptionsChange={patchOptions}
            empty={empty}
          />
        )}
      </div>
    </>
  );
}

export default function App() {
  const state = useDataset();
  return (
    <div className="app">
      {state.status === 'ready' ? (
        <Workspace data={state.data} issues={state.issues} />
      ) : (
        <>
          <Header />
          {state.status === 'loading' && (
            <p className="message" role="status">
              Loading…
            </p>
          )}
          {state.status === 'error' && (
            <p className="message" role="alert">
              <strong>Can’t load the data.</strong> {state.message}
            </p>
          )}
        </>
      )}
    </div>
  );
}
