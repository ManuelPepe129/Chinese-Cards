import { describe, expect, it } from 'vitest';
import {
  addDays,
  dayStart,
  formatDays,
  previewLabels,
  schedule,
  SETTINGS,
  type CardState,
} from './scheduler';

const at = (h: number, day = 4) => new Date(2026, 10, day, h, 0, 0).getTime();
const NOW = at(12);
const MIN = 60_000;

const review = (over: Partial<CardState> = {}): CardState => ({
  key: 'k',
  phase: 'review',
  step: 0,
  interval: 10,
  ease: 2.5,
  reps: 5,
  lapses: 0,
  due: NOW,
  lastReviewed: NOW - 10 * 86_400_000,
  ...over,
});

describe('study days', () => {
  it('start at 04:00, so a late-night session belongs to the previous day', () => {
    expect(dayStart(at(10))).toBe(at(4));
    expect(dayStart(at(2))).toBe(at(4, 3));
    expect(dayStart(at(4))).toBe(at(4));
  });
  it('addDays moves to the rollover of a later day', () => {
    expect(addDays(at(12), 1)).toBe(at(4, 5));
    expect(addDays(at(2), 1)).toBe(at(4, 4));
    expect(addDays(at(12), 0)).toBe(at(4));
  });
});

describe('a new card', () => {
  it('Again goes back to the first step (1 min)', () => {
    const s = schedule(undefined, 'k', 'again', NOW);
    expect(s).toMatchObject({ phase: 'learning', step: 0, due: NOW + MIN, reps: 1 });
  });
  it('Hard waits halfway between the first two steps', () => {
    const s = schedule(undefined, 'k', 'hard', NOW);
    expect(s).toMatchObject({ phase: 'learning', step: 0 });
    expect(s.due).toBe(NOW + 5.5 * MIN);
  });
  it('Good moves to the next step (10 min)', () => {
    expect(schedule(undefined, 'k', 'good', NOW)).toMatchObject({ phase: 'learning', step: 1, due: NOW + 10 * MIN });
  });
  it('Easy graduates straight away with a 4-day interval', () => {
    expect(schedule(undefined, 'k', 'easy', NOW)).toMatchObject({
      phase: 'review',
      interval: 4,
      ease: SETTINGS.startEase,
      due: addDays(NOW, 4),
    });
  });
  it('Good twice graduates with a 1-day interval, due at the next rollover', () => {
    const first = schedule(undefined, 'k', 'good', NOW);
    const second = schedule(first, 'k', 'good', NOW + 10 * MIN);
    expect(second).toMatchObject({ phase: 'review', interval: 1, reps: 2 });
    expect(second.due).toBe(addDays(NOW, 1));
  });
  it('Again in the second step starts over', () => {
    const first = schedule(undefined, 'k', 'good', NOW);
    expect(schedule(first, 'k', 'again', NOW + 10 * MIN)).toMatchObject({ phase: 'learning', step: 0 });
  });
});

describe('a review card', () => {
  it('Hard / Good / Easy grow the interval, each longer than the last', () => {
    const hard = schedule(review(), 'k', 'hard', NOW);
    const good = schedule(review(), 'k', 'good', NOW);
    const easy = schedule(review(), 'k', 'easy', NOW);
    expect([hard.interval, good.interval, easy.interval]).toEqual([12, 25, 33]);
    expect([hard.ease, good.ease, easy.ease]).toEqual([2.35, 2.5, 2.65]);
    expect(good.due).toBe(addDays(NOW, 25));
  });
  it('even a 1-day card moves forward with every non-failing answer', () => {
    const r = review({ interval: 1 });
    const [h, g, e] = (['hard', 'good', 'easy'] as const).map((x) => schedule(r, 'k', x, NOW).interval);
    expect([h, g, e]).toEqual([2, 3, 4]);
  });
  it('Again is a lapse: relearn after 10 min, lower ease, interval reset to 1 day', () => {
    const s = schedule(review(), 'k', 'again', NOW);
    expect(s).toMatchObject({ phase: 'relearning', step: 0, interval: 1, ease: 2.3, lapses: 1, due: NOW + 10 * MIN });
    const back = schedule(s, 'k', 'good', NOW + 10 * MIN);
    expect(back).toMatchObject({ phase: 'review', interval: 1, lapses: 1 });
    expect(back.due).toBe(addDays(NOW + 10 * MIN, 1));
  });
  it('never lets the ease fall below the floor', () => {
    expect(schedule(review({ ease: 1.35 }), 'k', 'again', NOW).ease).toBe(SETTINGS.minEase);
    expect(schedule(review({ ease: SETTINGS.minEase }), 'k', 'hard', NOW).ease).toBe(SETTINGS.minEase);
  });
  it('never exceeds the maximum interval', () => {
    const s = schedule(review({ interval: SETTINGS.maxInterval }), 'k', 'easy', NOW);
    expect(s.interval).toBe(SETTINGS.maxInterval);
  });
  it('does not modify the previous state', () => {
    const before = review();
    const copy = { ...before };
    schedule(before, 'k', 'good', NOW);
    expect(before).toEqual(copy);
  });
  it('records the answer time and counts the repetition', () => {
    expect(schedule(review(), 'k', 'good', NOW)).toMatchObject({ reps: 6, lastReviewed: NOW });
  });
});

describe('labels', () => {
  it('previews what each button does for a new card', () => {
    expect(previewLabels(undefined, 'k', NOW)).toEqual({ again: '1m', hard: '6m', good: '10m', easy: '4d' });
  });
  it('previews review intervals in days, switching to months from 30 days', () => {
    expect(previewLabels(review(), 'k', NOW)).toEqual({ again: '10m', hard: '12d', good: '25d', easy: '1.1mo' });
  });
  it('formats long intervals as months and years', () => {
    expect(formatDays(5)).toBe('5d');
    expect(formatDays(45)).toBe('1.5mo');
    expect(formatDays(400)).toBe('1.1y');
  });
});
