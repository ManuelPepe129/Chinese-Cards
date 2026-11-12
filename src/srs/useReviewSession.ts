import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildSession, type DailyMeta, type QueueItem, type Session } from './queue';
import { dayStart, previewLabels, schedule, type CardState, type Grade } from './scheduler';
import { createMemoryStore, openProgressStore, requestPersistentStorage, type ProgressStore } from './store';

export interface ReviewSession<T> {
  loaded: boolean;
  /** False when progress can't be kept after the page closes. */
  durable: boolean;
  /** True when the last save to the device failed. */
  saveError: boolean;
  session: Session<T>;
  /** What each button would do for the current card, e.g. { again: '1m', good: '1d', … }. */
  labels: Record<Grade, string> | null;
  grade: (g: Grade) => void;
}

/** Loads the saved progress, decides which card comes next and saves every answer on this device. */
export function useReviewSession<T>(items: readonly QueueItem<T>[]): ReviewSession<T> {
  const [loaded, setLoaded] = useState(false);
  const [durable, setDurable] = useState(true);
  const [saveError, setSaveError] = useState(false);
  const [states, setStates] = useState<ReadonlyMap<string, CardState>>(() => new Map());
  const [meta, setMeta] = useState<DailyMeta | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const storeRef = useRef<ProgressStore | null>(null);
  const saves = useRef<Promise<void>>(Promise.resolve()); // saves run in order
  const askedPersist = useRef(false);

  useEffect(() => {
    let cancelled = false;
    openProgressStore()
      .then(async ({ store, durable: isDurable }) => {
        const data = await store.loadAll();
        if (cancelled) return;
        storeRef.current = store;
        setDurable(isDurable);
        setStates(new Map(data.states.map((s) => [s.key, s])));
        setMeta(data.meta);
        setNow(Date.now());
        setLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        storeRef.current = createMemoryStore();
        setDurable(false);
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Coming back to the tab (possibly the next day) refreshes what is due.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') setNow(Date.now());
    };
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const session = useMemo(() => buildSession(items, states, now, meta), [items, states, now, meta]);
  const current = session.next;
  const labels = useMemo(
    () => (current ? previewLabels(current.state, current.item.key, Date.now()) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [current],
  );

  const grade = useCallback(
    (g: Grade) => {
      if (!current) return;
      const at = Date.now();
      const key = current.item.key;
      const next = schedule(current.state, key, g, at);
      const today = dayStart(at);
      const introduced = (meta && meta.day === today ? meta.newIntroduced : 0) + (current.state ? 0 : 1);
      const nextMeta: DailyMeta = { day: today, newIntroduced: introduced };

      setStates((prev) => new Map(prev).set(key, next));
      setMeta(nextMeta);
      setNow(at);
      saves.current = saves.current
        .then(() => storeRef.current?.save(next, { key, at, grade: g }, nextMeta))
        .then(
          () => setSaveError(false),
          () => setSaveError(true),
        );
      if (!askedPersist.current) {
        askedPersist.current = true;
        void requestPersistentStorage();
      }
    },
    [current, meta],
  );

  return { loaded, durable, saveError, session, labels, grade };
}
