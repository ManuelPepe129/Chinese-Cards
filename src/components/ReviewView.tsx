import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Entry } from '../data/schema';
import { hanChars } from '../lib/strokes';
import { useElementSize } from '../lib/useElementSize';
import { useSpeech } from '../lib/useSpeech';
import { useStrokeAvailability } from '../lib/useStrokeAvailability';
import type { CardKindInQueue, Counts, QueueItem, Session } from '../srs/queue';
import { GRADES, SETTINGS, type Grade } from '../srs/scheduler';
import { useReviewSession } from '../srs/useReviewSession';
import { Flashcard } from './Flashcard';
import type { StrokesHandle } from './HanziStrokes';
import { SpeakButton } from './SpeakButton';
import { StrokeButton } from './StrokeButton';

export type ReviewItem = QueueItem<Entry>;

const GRADE_NAME: Record<Grade, string> = { again: 'Again', hard: 'Hard', good: 'Good', easy: 'Easy' };

/** The four answer buttons, each with the time the card would come back after it. */
export function AnswerButtons({ labels, onGrade }: { labels: Record<Grade, string>; onGrade: (g: Grade) => void }) {
  return (
    <div className="answers" role="group" aria-label="How well did you remember it?">
      {GRADES.map((g, i) => (
        <button
          key={g}
          type="button"
          className="grade"
          data-grade={g}
          title={`${GRADE_NAME[g]} (${i + 1})`}
          onClick={() => onGrade(g)}
        >
          <span className="grade-name">{GRADE_NAME[g]}</span>
          <span className="grade-when">{labels[g]}</span>
        </button>
      ))}
    </div>
  );
}

/** New / Learning / Due counters; the one the current card comes from is highlighted. */
export function ReviewCounts({ counts, kind }: { counts: Counts; kind?: CardKindInQueue }) {
  const cell = (k: CardKindInQueue, label: string) => (
    <span className="rc" data-active={kind === k}>
      {label} <b>{counts[k]}</b>
    </span>
  );
  return (
    <div className="review-counts" role="status" aria-live="polite">
      {cell('new', 'New')} {cell('learning', 'Learning')} {cell('review', 'Due')}
    </div>
  );
}

function ReviewDone<T>({ session, durable }: { session: Session<T>; durable: boolean }) {
  const { tomorrow, unseenLeft } = session;
  return (
    <div className="study">
      <ReviewCounts counts={session.counts} />
      <div className="review-done">
        <h2>All done for now</h2>
        <p>
          {tomorrow > 0
            ? `${tomorrow} card${tomorrow === 1 ? '' : 's'} will be due tomorrow.`
            : 'Nothing is due tomorrow.'}
        </p>
        {unseenLeft > 0 && (
          <p>
            {unseenLeft} new card{unseenLeft === 1 ? ' is' : 's are'} waiting: the daily limit of {SETTINGS.newPerDay} new
            cards is reached.
          </p>
        )}
        {!durable && <p className="issues">Progress can’t be saved in this browser; it will be lost when you close the page.</p>}
      </div>
    </div>
  );
}

interface Props {
  items: ReviewItem[];
  empty?: ReactNode;
}

/** Spaced-repetition review: the front shows the hanzi; after flipping, four buttons decide when it comes back. */
export function ReviewView({ items, empty }: Props) {
  const { loaded, durable, saveError, session, labels, grade } = useReviewSession(items);
  const [flipped, setFlipped] = useState(false);
  const speech = useSpeech();
  const stopSpeech = speech.stop;
  const [flipEl, box] = useElementSize<HTMLDivElement>();
  const strokesRef = useRef<StrokesHandle>(null);
  const [strokesPlaying, setStrokesPlaying] = useState(false);

  const current = session.next;
  const entry = current?.item.entry;
  const han = hanChars(entry?.hanzi ?? '');
  const strokeStatus = useStrokeAvailability(han);
  const canPlayStrokes = han.some((c) => strokeStatus(c) !== 'missing');
  const cardId = current ? `${current.item.key}-${current.state?.reps ?? 0}` : '';

  const flip = useCallback(() => setFlipped((f) => !f), []);
  const onGrade = useCallback(
    (g: Grade) => {
      if (!flipped) return; // the answer is shown first
      grade(g);
      setFlipped(false);
    },
    [flipped, grade],
  );

  // A different card (or a filter change) silences the previous one and starts on the front.
  useEffect(() => {
    setFlipped(false);
    stopSpeech();
  }, [cardId, stopSpeech]);
  useEffect(() => {
    strokesRef.current?.stop();
  }, [flipped]);

  // Keyboard: Space flips, then 1-4 answer (Space = Good).
  useEffect(() => {
    if (!current) return;
    const inField = (t: EventTarget | null) =>
      !!(t as HTMLElement | null)?.closest?.('input, textarea, select, [contenteditable], [data-no-shortcuts]');
    const onOtherButton = (t: EventTarget | null) =>
      !!(t as HTMLElement | null)?.closest?.('button:not([data-card])');

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || inField(e.target)) return;
      if (e.key === ' ') {
        if (onOtherButton(e.target)) return; // let buttons keep their native Space behaviour
        e.preventDefault();
        if (e.repeat) return;
        if (flipped) onGrade('good');
        else flip();
      } else if (e.key >= '1' && e.key <= '4') {
        if (!flipped) return;
        e.preventDefault();
        onGrade(GRADES[Number(e.key) - 1]);
      }
    };
    // A focused <button> also clicks on Space keyup; suppress it so the card doesn't flip twice.
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' && !onOtherButton(e.target) && !inField(e.target)) e.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [current, flipped, flip, onGrade]);

  if (!loaded) {
    return (
      <div className="study">
        <p className="message" role="status">
          Loading your progress…
        </p>
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="study">
        {empty ?? (
          <p className="message">
            No cards yet. Add entries to <code>public/data/data.json</code>.
          </p>
        )}
      </div>
    );
  }
  if (!current || !entry) return <ReviewDone session={session} durable={durable} />;

  return (
    <div className="study">
      <ReviewCounts counts={session.counts} kind={current.kind} />
      {(!durable || saveError) && (
        <p className="issues" role="status">
          {saveError
            ? 'The last answer could not be saved on this device.'
            : 'Progress can’t be saved in this browser; it will be lost when you close the page.'}
        </p>
      )}
      <div className="stage">
        <div className="flip" ref={flipEl}>
          {/* key remounts the card on navigation so the next card never shows its back mid-flip */}
          <Flashcard
            key={cardId}
            entry={entry}
            flipped={flipped}
            reverse={false}
            showPinyin={false}
            area={box}
            strokesRef={strokesRef}
            onPlayingChange={setStrokesPlaying}
            onFlip={flip}
          />
          {speech.available && (
            <SpeakButton
              text={entry.hanzi}
              speaking={speech.speaking}
              failed={speech.failed}
              onSpeak={() => speech.speak(entry.hanzi)}
              onStop={speech.stop}
            />
          )}
          {!flipped && canPlayStrokes && (
            <StrokeButton
              playing={strokesPlaying}
              onPlay={() => strokesRef.current?.play()}
              onStop={() => strokesRef.current?.stop()}
            />
          )}
        </div>
      </div>
      <div className="answer-bar">
        {flipped && labels ? (
          <AnswerButtons labels={labels} onGrade={onGrade} />
        ) : (
          <button type="button" className="btn show-answer" onClick={flip}>
            Show answer
          </button>
        )}
      </div>
    </div>
  );
}
