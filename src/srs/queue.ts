import { addDays, dayStart, SETTINGS, type CardState } from './scheduler';

export interface QueueItem<T> {
  key: string;
  entry: T;
}

/** How many new cards were introduced on a given study day (saved with the progress). */
export interface DailyMeta {
  /** `dayStart()` of that study day. */
  day: number;
  newIntroduced: number;
}

export interface Counts {
  new: number;
  learning: number;
  review: number;
}

export type CardKindInQueue = 'new' | 'learning' | 'review';

export interface Session<T> {
  counts: Counts;
  next: { item: QueueItem<T>; state: CardState | undefined; kind: CardKindInQueue } | null;
  /** Review cards due on the next study day. */
  tomorrow: number;
  /** New cards held back by the daily limit. */
  unseenLeft: number;
}

export function newCardsLeft(meta: DailyMeta | null, now: number): number {
  const used = meta && meta.day === dayStart(now) ? meta.newIntroduced : 0;
  return Math.max(0, SETTINGS.newPerDay - used);
}

/**
 * Works out what to show next. Order: learning cards that are due, then reviews due today,
 * then new cards (up to the daily limit), then learning cards due within the learn-ahead window.
 * `items` is the filtered set; `states` holds every saved card.
 */
export function buildSession<T>(
  items: readonly QueueItem<T>[],
  states: ReadonlyMap<string, CardState>,
  now: number,
  meta: DailyMeta | null,
): Session<T> {
  const tomorrowStart = addDays(now, 1);
  const dayAfter = addDays(now, 2);
  const learning: { item: QueueItem<T>; state: CardState }[] = [];
  const reviews: { item: QueueItem<T>; state: CardState }[] = [];
  const unseen: QueueItem<T>[] = [];
  let tomorrow = 0;

  for (const item of items) {
    const state = states.get(item.key);
    if (!state) unseen.push(item);
    else if (state.phase === 'review') {
      if (state.due < tomorrowStart) reviews.push({ item, state });
      else if (state.due < dayAfter) tomorrow++;
    } else learning.push({ item, state });
  }

  const byDue = (a: { state: CardState }, b: { state: CardState }) => a.state.due - b.state.due;
  learning.sort(byDue);
  reviews.sort(byDue);
  const newShown = unseen.slice(0, newCardsLeft(meta, now));

  const counts: Counts = { new: newShown.length, learning: learning.length, review: reviews.length };
  const base = { counts, tomorrow, unseenLeft: unseen.length - newShown.length };

  const dueLearning = learning.find((c) => c.state.due <= now);
  if (dueLearning) return { ...base, next: { ...dueLearning, kind: 'learning' } };
  if (reviews[0]) return { ...base, next: { ...reviews[0], kind: 'review' } };
  if (newShown[0]) return { ...base, next: { item: newShown[0], state: undefined, kind: 'new' } };
  const ahead = learning[0]; // earliest not-yet-due learning card
  if (ahead && ahead.state.due <= now + SETTINGS.learnAheadMinutes * 60_000) {
    return { ...base, next: { ...ahead, kind: 'learning' } };
  }
  return { ...base, next: null };
}
