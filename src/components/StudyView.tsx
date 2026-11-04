import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Entry } from '../data/schema';
import { shuffledIndices } from '../lib/shuffle';
import { hanChars } from '../lib/strokes';
import { useElementSize } from '../lib/useElementSize';
import { useStrokeAvailability } from '../lib/useStrokeAvailability';
import { useSpeech } from '../lib/useSpeech';
import { Flashcard } from './Flashcard';
import type { StrokesHandle } from './HanziStrokes';
import { SpeakButton } from './SpeakButton';
import { StrokeButton } from './StrokeButton';

export interface StudyOptions {
  shuffle: boolean;
  reverse: boolean;
  showPinyin: boolean;
}
export const DEFAULT_OPTIONS: StudyOptions = { shuffle: true, reverse: false, showPinyin: false };

interface Props {
  entries: Entry[];
  /** Entries that are sentences (the rest are single characters or words). Only they get "Pinyin on front". */
  sentenceEntries?: ReadonlySet<Entry>;
  /** Lifted to the parent so the toggles survive switching to Browse and back. */
  options: StudyOptions;
  onOptionsChange: (patch: Partial<StudyOptions>) => void;
  empty?: ReactNode;
}

const SWIPE_MIN_PX = 50;
const NO_SENTENCES: ReadonlySet<Entry> = new Set();

export function StudyView({ entries, sentenceEntries = NO_SENTENCES, options, onOptionsChange, empty }: Props) {
  const { shuffle, reverse, showPinyin } = options;
  const [round, setRound] = useState(0); // bumped to reshuffle after a full pass
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const order = useMemo(
    () => (shuffle ? shuffledIndices(entries.length) : entries.map((_, i) => i)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, shuffle, round],
  );
  const n = order.length;
  const hasSentences = entries.some((e) => sentenceEntries.has(e));

  const step = useCallback(
    (delta: 1 | -1) => {
      if (n === 0) return;
      setFlipped(false);
      if (shuffle && delta === 1 && pos === n - 1) setRound((r) => r + 1);
      setPos((p) => (p + delta + n) % n);
    },
    [n, pos, shuffle],
  );
  const flip = useCallback(() => setFlipped((f) => !f), []);

  const speech = useSpeech();
  const stopSpeech = speech.stop;
  // Stroke order is drawn in place of the hanzi; the play button replays it.
  const [flipEl, box] = useElementSize<HTMLDivElement>();
  const strokesRef = useRef<StrokesHandle>(null);
  const [strokesPlaying, setStrokesPlaying] = useState(false);
  const current: Entry | undefined = n > 0 ? entries[order[Math.min(pos, n - 1)]] : undefined;
  const han = hanChars(current?.hanzi ?? '');
  const strokeStatus = useStrokeAvailability(han);
  const canPlayStrokes = han.some((c) => strokeStatus(c) !== 'missing');
  // The hanzi is on the front, or on the back in Italian-first mode.
  const hanziVisible = reverse ? flipped : !flipped;

  // Moving to another card (or toggling Italian-first) silences the previous one.
  const cardKey = `${current?.hanzi}-${round}-${Math.min(pos, Math.max(n - 1, 0))}-${reverse}`;
  useEffect(() => {
    stopSpeech();
  }, [cardKey, stopSpeech]);
  useEffect(() => {
    strokesRef.current?.stop(); // flipping away from the hanzi ends the animation
  }, [flipped]);

  // A different card set (filter or mode changed) starts again from the first card.
  useEffect(() => {
    setPos(0);
    setFlipped(false);
  }, [entries]);

  // Keyboard: space = flip, arrows = navigate.
  useEffect(() => {
    const inField = (t: EventTarget | null) =>
      !!(t as HTMLElement | null)?.closest?.('input, textarea, select, [contenteditable], [data-no-shortcuts]');
    const onOtherButton = (t: EventTarget | null) =>
      !!(t as HTMLElement | null)?.closest?.('button:not([data-card])');

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || inField(e.target)) return;
      if (e.key === ' ') {
        if (onOtherButton(e.target)) return; // let toggles keep their native Space behaviour
        e.preventDefault();
        if (!e.repeat) flip();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        step(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        step(-1);
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
  }, [flip, step]);

  // Touch swipe (mouse keeps click-to-flip only).
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const onPointerDown = (e: React.PointerEvent) => {
    swiped.current = false;
    swipeStart.current = e.pointerType === 'mouse' ? null : { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const s = swipeStart.current;
    swipeStart.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) >= SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy) * 1.5) {
      swiped.current = true;
      step(dx < 0 ? 1 : -1);
    }
  };
  const onFlipClick = () => {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    flip();
  };

  if (n === 0) {
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

  const safePos = Math.min(pos, n - 1);
  const entry = entries[order[safePos]];

  return (
    <div className="study">
      <div
        className="stage"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipeStart.current = null)}
      >
        <div className="flip" ref={flipEl}>
          {/* key remounts the card on navigation so the next card never shows its back mid-flip */}
          <Flashcard
            key={`${entry.hanzi}-${round}-${safePos}-${reverse}`}
            entry={entry}
            flipped={flipped}
            reverse={reverse}
            showPinyin={showPinyin && !reverse && sentenceEntries.has(entry)}
            area={box}
            strokesRef={strokesRef}
            onPlayingChange={setStrokesPlaying}
            onFlip={onFlipClick}
          />
          {/* In Italian-first mode the front hides the hanzi, so don't give the answer away by speaking it. */}
          {speech.available && (!reverse || flipped) && (
            <SpeakButton
              text={entry.hanzi}
              speaking={speech.speaking}
              failed={speech.failed}
              onSpeak={() => speech.speak(entry.hanzi)}
              onStop={speech.stop}
            />
          )}
          {hanziVisible && canPlayStrokes && (
            <StrokeButton
              playing={strokesPlaying}
              onPlay={() => strokesRef.current?.play()}
              onStop={() => strokesRef.current?.stop()}
            />
          )}
        </div>
      </div>

      <div className="controls">
        <div className="group">
          <button type="button" className="btn" onClick={() => step(-1)}>
            Previous
          </button>
          <span className="counter" aria-live="polite">
            {safePos + 1} / {n}
          </span>
          <button type="button" className="btn" onClick={() => step(1)}>
            Next
          </button>
        </div>
        <div className="group">
          <button
            type="button"
            className="btn"
            aria-pressed={shuffle}
            onClick={() => {
              onOptionsChange({ shuffle: !shuffle });
              setPos(0);
              setFlipped(false);
            }}
          >
            Shuffle
          </button>
          <button
            type="button"
            className="btn"
            aria-pressed={reverse}
            onClick={() => {
              onOptionsChange({ reverse: !reverse });
              setFlipped(false);
            }}
          >
            Italian first
          </button>
          {hasSentences && (
            <button
              type="button"
              className="btn"
              aria-pressed={showPinyin && !reverse}
              disabled={reverse}
              onClick={() => onOptionsChange({ showPinyin: !showPinyin })}
            >
              Pinyin on front
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
