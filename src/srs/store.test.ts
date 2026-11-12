import { describe, expect, it } from 'vitest';
import { createMemoryStore } from './store';
import type { CardState } from './scheduler';

const card = (key: string): CardState => ({
  key,
  phase: 'review',
  step: 0,
  interval: 2,
  ease: 2.5,
  reps: 2,
  lapses: 0,
  due: 1000,
  lastReviewed: 0,
});

describe('memory store', () => {
  it('starts empty', async () => {
    expect(await createMemoryStore().loadAll()).toEqual({ states: [], meta: null });
  });
  it('keeps the latest state per card and the daily counter', async () => {
    const store = createMemoryStore();
    await store.save(card('a'), { key: 'a', at: 1, grade: 'good' }, { day: 10, newIntroduced: 1 });
    await store.save({ ...card('a'), interval: 5 }, { key: 'a', at: 2, grade: 'good' }, { day: 10, newIntroduced: 1 });
    await store.save(card('b'), { key: 'b', at: 3, grade: 'again' }, { day: 10, newIntroduced: 2 });
    const { states, meta } = await store.loadAll();
    expect(states.map((s) => [s.key, s.interval]).sort()).toEqual([
      ['a', 5],
      ['b', 2],
    ]);
    expect(meta).toEqual({ day: 10, newIntroduced: 2 });
  });
  it('can be seeded with saved progress', async () => {
    const store = createMemoryStore({ states: [card('a')], meta: { day: 1, newIntroduced: 3 } });
    expect((await store.loadAll()).states).toHaveLength(1);
  });
  it('hands out copies, so callers cannot change what is stored', async () => {
    const store = createMemoryStore({ states: [card('a')], meta: null });
    (await store.loadAll()).states[0].interval = 99;
    expect((await store.loadAll()).states[0].interval).toBe(2);
  });
});
