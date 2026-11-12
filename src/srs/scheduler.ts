/**
 * Spaced-repetition scheduler (SM-2 flavour with Anki-style learning steps).
 * Pure functions only: no clock, no storage. `now` is always passed in, so everything is testable.
 */

export const GRADES = ['again', 'hard', 'good', 'easy'] as const;
export type Grade = (typeof GRADES)[number];

/** learning = first time seen, relearning = lapsed after a review, review = graduated. */
export type Phase = 'learning' | 'relearning' | 'review';

export interface CardState {
  key: string;
  phase: Phase;
  /** Index into the learning / relearning steps (unused in review). */
  step: number;
  /** Days. In review it is the current interval; after a lapse it is the interval used on graduation. */
  interval: number;
  ease: number;
  reps: number;
  lapses: number;
  /** Epoch ms when the card is due. Review cards are due at the day rollover of their due day. */
  due: number;
  lastReviewed: number;
}

export const SETTINGS = {
  /** New cards introduced per day. The single place to change it. */
  newPerDay: 10,
  /** Minutes. */
  learningSteps: [1, 10] as readonly number[],
  relearningSteps: [10] as readonly number[],
  /** Days, when a new card graduates with Good / Easy. */
  graduatingInterval: 1,
  easyInterval: 4,
  startEase: 2.5,
  minEase: 1.3,
  hardFactor: 1.2,
  easyBonus: 1.3,
  maxInterval: 3650,
  /** A learning card that is not due yet is still shown when nothing else is left and it is due within this time. */
  learnAheadMinutes: 20,
  /** A "day" starts at 04:00 local time, so a late-night session still counts as the same day. */
  rolloverHour: 4,
} as const;

const MINUTE = 60_000;
const HOUR = 3_600_000;

/** Start (04:00 local) of the study day that contains `ms`. */
export function dayStart(ms: number): number {
  const d = new Date(ms - SETTINGS.rolloverHour * HOUR);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), SETTINGS.rolloverHour).getTime();
}

/** Start of the study day `n` days after the one containing `ms`. */
export function addDays(ms: number, n: number): number {
  const s = new Date(dayStart(ms));
  return new Date(s.getFullYear(), s.getMonth(), s.getDate() + n, SETTINGS.rolloverHour).getTime();
}

const round2 = (x: number) => Math.round(x * 100) / 100;
const clampInterval = (d: number) => Math.min(SETTINGS.maxInterval, Math.max(1, Math.round(d)));

function graduate(c: CardState, interval: number, now: number): CardState {
  const days = clampInterval(interval);
  return { ...c, phase: 'review', step: 0, interval: days, due: addDays(now, days) };
}

function gradeLearning(c: CardState, grade: Grade, now: number): CardState {
  const steps = c.phase === 'relearning' ? SETTINGS.relearningSteps : SETTINGS.learningSteps;
  const stay = (step: number, minutes: number): CardState => ({ ...c, step, due: now + minutes * MINUTE });
  const lapsed = c.phase === 'relearning';
  switch (grade) {
    case 'again':
      return stay(0, steps[0]);
    case 'hard': {
      // On the first step with a second one available, wait halfway to it; otherwise repeat the current step.
      const minutes = c.step === 0 && steps.length > 1 ? (steps[0] + steps[1]) / 2 : steps[c.step];
      return stay(c.step, minutes);
    }
    case 'good':
      return c.step + 1 < steps.length
        ? stay(c.step + 1, steps[c.step + 1])
        : graduate(c, lapsed ? Math.max(1, c.interval) : SETTINGS.graduatingInterval, now);
    case 'easy':
      return graduate(c, lapsed ? c.interval + 1 : SETTINGS.easyInterval, now);
  }
}

function gradeReview(c: CardState, grade: Grade, now: number): CardState {
  const { maxInterval: max, minEase } = SETTINGS;
  const hard = Math.min(max, Math.max(c.interval + 1, Math.round(c.interval * SETTINGS.hardFactor)));
  const good = Math.min(max, Math.max(hard + 1, Math.round(c.interval * c.ease)));
  const easy = Math.min(max, Math.max(good + 1, Math.round(c.interval * c.ease * SETTINGS.easyBonus)));
  switch (grade) {
    case 'again':
      return {
        ...c,
        phase: 'relearning',
        step: 0,
        interval: 1,
        ease: round2(Math.max(minEase, c.ease - 0.2)),
        lapses: c.lapses + 1,
        due: now + SETTINGS.relearningSteps[0] * MINUTE,
      };
    case 'hard':
      return { ...c, interval: hard, ease: round2(Math.max(minEase, c.ease - 0.15)), due: addDays(now, hard) };
    case 'good':
      return { ...c, interval: good, due: addDays(now, good) };
    case 'easy':
      return { ...c, interval: easy, ease: round2(c.ease + 0.15), due: addDays(now, easy) };
  }
}

/** The new state of a card after answering. `prev` is undefined for a card never seen before. */
export function schedule(prev: CardState | undefined, key: string, grade: Grade, now: number): CardState {
  const base: CardState = prev ?? {
    key,
    phase: 'learning',
    step: 0,
    interval: 0,
    ease: SETTINGS.startEase,
    reps: 0,
    lapses: 0,
    due: now,
    lastReviewed: now,
  };
  const next = base.phase === 'review' ? gradeReview(base, grade, now) : gradeLearning(base, grade, now);
  return { ...next, reps: base.reps + 1, lastReviewed: now };
}

function formatMinutes(minutes: number): string {
  const m = Math.round(minutes);
  if (m < 1) return '<1m';
  if (m < 60) return `${m}m`;
  return `${Math.round(m / 60)}h`;
}

const trim = (x: number) => Number(x.toFixed(1));

export function formatDays(days: number): string {
  if (days < 30) return `${days}d`;
  if (days < 365) return `${trim(days / 30)}mo`;
  return `${trim(days / 365)}y`;
}

/** Short label for when a card would come back: "1m", "10m", "1d", "3d", "1.5mo". */
export function intervalLabel(s: CardState, now: number): string {
  return s.phase === 'review' ? formatDays(s.interval) : formatMinutes((s.due - now) / MINUTE);
}

/** What each button would do, for the hint under the buttons. */
export function previewLabels(prev: CardState | undefined, key: string, now: number): Record<Grade, string> {
  const out = {} as Record<Grade, string>;
  for (const g of GRADES) out[g] = intervalLabel(schedule(prev, key, g, now), now);
  return out;
}
