import { useCallback, useEffect, useRef, useState } from 'react';
import type { WriterLayout } from '../lib/strokeLayout';
import { createWriter, readColors, type ManagedWriter } from '../lib/writer';

interface Props {
  /** Characters to draw (those with stroke data, or still loading). */
  chars: string[];
  /** Characters whose stroke data is not available. */
  missing: string[];
  /** The text had more characters than we draw. */
  truncated: boolean;
  /** Null when there is nothing to draw (only the notice is shown). */
  layout: WriterLayout | null;
  side: boolean;
}

type Mode = 'idle' | 'playing' | 'quiz';

const IDLE = 'Stroke order';
const AUTOPLAY_DELAY_MS = 600; // lets the card finish flipping first
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Stroke-order animation and drawing quiz, one writer per character. It is a sibling of the card
 * (not inside the flip button), so its buttons and drawing surface never flip the card.
 */
export default function StrokePanel({ chars, missing, truncated, layout, side }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const hostRefs = useRef<(HTMLDivElement | null)[]>([]);
  const managed = useRef<ManagedWriter[]>([]);
  const run = useRef(0); // bumped to cancel whatever sequence is in progress
  const autoPlayed = useRef(false);
  const autoTimer = useRef<ReturnType<typeof setTimeout>>(undefined); // the pending automatic first play
  const [mode, setMode] = useState<Mode>('idle');
  const [status, setStatus] = useState(IDLE);
  const [theme, setTheme] = useState(0);
  const cell = layout?.cell ?? 0;
  const charsKey = chars.join('');

  const play = useCallback(async () => {
    clearTimeout(autoTimer.current);
    const id = ++run.current;
    const ws = managed.current.map((m) => m.writer);
    ws.forEach((w) => w.cancelQuiz());
    setMode('playing');
    setStatus('Watch the strokes');
    for (const w of ws) {
      if (run.current !== id) return;
      await new Promise<void>((done) => void w.animateCharacter({ onComplete: () => done() }));
    }
    if (run.current === id) {
      setMode('idle');
      setStatus(IDLE);
    }
  }, []);

  const stopQuiz = useCallback(() => {
    clearTimeout(autoTimer.current);
    run.current++;
    for (const { writer } of managed.current) {
      writer.cancelQuiz();
      writer.showCharacter({ duration: 0 });
    }
    setMode('idle');
    setStatus(IDLE);
  }, []);

  const startQuiz = useCallback(async () => {
    clearTimeout(autoTimer.current); // a quiz started within the first moments must not be replaced by the auto-play
    const id = ++run.current;
    const ws = managed.current.map((m) => m.writer);
    setMode('quiz');
    for (const w of ws) {
      w.cancelQuiz();
      w.hideCharacter({ duration: 0 });
      w.showOutline({ duration: 0 });
    }
    const many = ws.length > 1;
    for (let i = 0; i < ws.length; i++) {
      if (run.current !== id) return;
      // For a word, say which character is being drawn; for a single character just capitalise.
      const say = (text: string) => (many ? `${chars[i]}: ${text}` : text.charAt(0).toUpperCase() + text.slice(1));
      setStatus(say('draw stroke 1'));
      await new Promise<void>((done) =>
        void ws[i].quiz({
          onCorrectStroke: (d) => {
            if (run.current !== id) return;
            setStatus(say(d.strokesRemaining > 0 ? `stroke ${d.strokeNum + 2} of ${d.strokeNum + 1 + d.strokesRemaining}` : 'done'));
          },
          onMistake: () => run.current === id && setStatus('Not quite, try again'),
          onComplete: () => done(),
        }),
      );
    }
    if (run.current === id) {
      setMode('idle');
      setStatus('Well done!');
    }
  }, [chars]);

  // Follow the system theme: the writers take their colours from CSS variables when created.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setTheme((t) => t + 1);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!rootRef.current || cell === 0 || chars.length === 0) return;
    const colors = readColors(rootRef.current);
    const made = chars.map((c, i) =>
      createWriter(hostRefs.current[i]!, c, { width: cell, height: cell, padding: 8, drawingWidth: 6, ...colors }),
    );
    managed.current = made;
    setMode('idle');
    setStatus(IDLE);
    // Auto-play once per card. With reduced motion the finished character is shown instead.
    if (!autoPlayed.current && !reducedMotion()) {
      autoPlayed.current = true;
      autoTimer.current = setTimeout(() => void play(), AUTOPLAY_DELAY_MS);
    }
    return () => {
      clearTimeout(autoTimer.current);
      run.current++;
      made.forEach((m) => m.dispose());
      managed.current = [];
    };
  }, [charsKey, cell, theme, play]);

  const notice = [
    missing.length > 0 ? `No stroke data for ${missing.join(' ')}.` : '',
    truncated ? 'Showing the first characters only.' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={rootRef}
      className="strokes"
      data-side={side}
      data-state={mode}
      data-empty={!layout}
      data-no-swipe
      style={layout && side ? { width: layout.panelWidth } : undefined}
    >
      {layout && (
        <>
          <div className="sw-grid" style={{ gridTemplateColumns: `repeat(${layout.cols}, ${layout.cell}px)` }}>
            {chars.map((c, i) => (
              <div key={`${i}-${c}`} className="sw-cell" style={{ width: cell, height: cell }} role="img" aria-label={`Stroke order of ${c}`}>
                <svg className="guide" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                  <path d="M50 0V100M0 50H100M0 0L100 100M100 0L0 100" />
                </svg>
                <div className="sw-host" ref={(el) => void (hostRefs.current[i] = el)} />
              </div>
            ))}
          </div>
          <div className="sw-controls">
            <p className="sw-status" aria-live="polite">
              {status}
            </p>
            <div className="sw-buttons">
              <button type="button" className="btn" onClick={() => void play()}>
                Replay
              </button>
              <button type="button" className="btn" aria-pressed={mode === 'quiz'} onClick={() => (mode === 'quiz' ? stopQuiz() : void startQuiz())}>
                {mode === 'quiz' ? 'Stop quiz' : 'Quiz'}
              </button>
            </div>
          </div>
        </>
      )}
      {notice && <p className="sw-notice">{notice}</p>}
    </div>
  );
}
