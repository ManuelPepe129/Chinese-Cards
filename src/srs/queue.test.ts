import { describe, expect, it } from 'vitest';
import { buildSession, newCardsLeft, type DailyMeta, type QueueItem } from './queue';
import { addDays, dayStart, SETTINGS, type CardState } from './scheduler';

const at = (h: number, day = 4) => new Date(2026, 10, day, h, 0, 0).getTime();
const NOW = at(12);
const MIN = 60_000;

const items = (n: number): QueueItem<string>[] =>
  Array.from({ length: n }, (_, i) => ({ key: `c${i}`, entry: `entry ${i}` }));

const state = (key: string, over: Partial<CardState>): CardState => ({
  key,
  phase: 'review',
  step: 0,
  interval: 3,
  ease: 2.5,
  reps: 3,
  lapses: 0,
  due: NOW - 1,
  lastReviewed: NOW - 3 * 86_400_000,
  ...over,
});

const states = (...list: CardState[]) => new Map(list.map((s) => [s.key, s]));

describe('daily limit of new cards', () => {
  it('offers at most the daily limit and holds the rest back', () => {
    const s = buildSession(items(15), new Map(), NOW, null);
    expect(s.counts).toEqual({ new: SETTINGS.newPerDay, learning: 0, review: 0 });
    expect(s.unseenLeft).toBe(15 - SETTINGS.newPerDay);
    expect(s.next).toMatchObject({ kind: 'new', item: { key: 'c0' } });
  });
  it('counts the new cards already introduced today', () => {
    const meta: DailyMeta = { day: dayStart(NOW), newIntroduced: 7 };
    expect(newCardsLeft(meta, NOW)).toBe(3);
    expect(buildSession(items(15), new Map(), NOW, meta).counts.new).toBe(3);
  });
  it('stops offering new cards once the limit is reached', () => {
    const meta: DailyMeta = { day: dayStart(NOW), newIntroduced: SETTINGS.newPerDay };
    const s = buildSession(items(5), new Map(), NOW, meta);
    expect(s.next).toBeNull();
    expect(s.unseenLeft).toBe(5);
  });
  it('starts a fresh allowance on a new study day', () => {
    const meta: DailyMeta = { day: dayStart(at(12, 3)), newIntroduced: SETTINGS.newPerDay };
    expect(newCardsLeft(meta, NOW)).toBe(SETTINGS.newPerDay);
  });
});

describe('what comes next', () => {
  it('shows due learning cards first, then due reviews, then new cards', () => {
    const list = items(4);
    const map = states(
      state('c0', { phase: 'learning', step: 1, due: NOW - 5 * MIN }),
      state('c1', { phase: 'review', due: addDays(NOW, 0) - 1 }),
    );
    const s = buildSession(list, map, NOW, null);
    expect(s.next).toMatchObject({ kind: 'learning', item: { key: 'c0' } });
    const afterLearning = buildSession(list, states(state('c1', { due: NOW - 1 })), NOW, null);
    expect(afterLearning.next).toMatchObject({ kind: 'review', item: { key: 'c1' } });
    expect(buildSession(list, new Map(), NOW, null).next).toMatchObject({ kind: 'new' });
  });
  it('orders reviews by how long they have been due', () => {
    const map = states(state('c0', { due: NOW - 1000 }), state('c1', { due: NOW - 9000 }));
    expect(buildSession(items(2), map, NOW, null).next?.item.key).toBe('c1');
  });
  it('does not show reviews due on a later day, but counts tomorrow’s', () => {
    const map = states(state('c0', { due: addDays(NOW, 1) }), state('c1', { due: addDays(NOW, 2) }));
    const s = buildSession(items(2), map, NOW, { day: dayStart(NOW), newIntroduced: SETTINGS.newPerDay });
    expect(s.next).toBeNull();
    expect(s.tomorrow).toBe(1);
    expect(s.counts.review).toBe(0);
  });
  it('shows a learning card that is almost due only when nothing else is left', () => {
    const soon = state('c0', { phase: 'learning', step: 1, due: NOW + 5 * MIN });
    const done: DailyMeta = { day: dayStart(NOW), newIntroduced: SETTINGS.newPerDay };
    expect(buildSession(items(1), states(soon), NOW, done).next).toMatchObject({ kind: 'learning' });
    // with a new card available, that one goes first
    expect(buildSession(items(2), states(soon), NOW, null).next).toMatchObject({ kind: 'new', item: { key: 'c1' } });
  });
  it('does not show a learning card that is far from due', () => {
    const far = state('c0', { phase: 'learning', step: 1, due: NOW + 60 * MIN });
    const done: DailyMeta = { day: dayStart(NOW), newIntroduced: SETTINGS.newPerDay };
    const s = buildSession(items(1), states(far), NOW, done);
    expect(s.next).toBeNull();
    expect(s.counts.learning).toBe(1);
  });
  it('only considers the cards it is given (filters)', () => {
    const map = states(state('other', { due: NOW - 1 }));
    expect(buildSession(items(1), map, NOW, null).counts.review).toBe(0);
  });
});
