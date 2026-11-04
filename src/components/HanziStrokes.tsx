import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react';
import { glyphCell, splitLines, type Box } from '../lib/strokeLayout';
import { hanChars, isHan } from '../lib/strokes';
import { useStrokeAvailability } from '../lib/useStrokeAvailability';
import { createWriter, readColors, type ManagedWriter } from '../lib/writer';

export interface StrokesHandle {
  /** Redraws the characters stroke by stroke. */
  play: () => void;
  /** Stops the animation and shows the finished characters. */
  stop: () => void;
}

interface Props {
  text: string;
  /** Room (px) the drawing may take. */
  area: Box;
  maxCell: number;
  ref?: Ref<StrokesHandle>;
  onPlayingChange?: (playing: boolean) => void;
}

const GUIDE = 'M50 0V100M0 50H100M0 0L100 100M100 0L0 100';

/**
 * The hanzi of a card, drawn from the stroke data (one Hanzi Writer per character) and shown finished.
 * `play()` replays it in writing order. A single character sits on a practice-paper guide (田字格).
 * Characters without stroke data, and punctuation, are shown as plain text.
 */
export function HanziStrokes({ text, area, maxCell, ref, onPlayingChange }: Props) {
  const chars = useMemo(() => [...text], [text]);
  const status = useStrokeAvailability(useMemo(() => hanChars(text), [text]));
  // Writers are only created once the stroke data is known to exist; until then the cell stays empty.
  const drawable = chars.map((c) => isHan(c) && status(c) === 'ok');
  const loading = chars.map((c) => isHan(c) && status(c) === 'loading');
  const drawKey = drawable.map(Number).join('');
  const single = chars.length === 1;
  const cell = glyphCell({ count: chars.length, width: area.w, height: area.h, maxCell });

  const rootRef = useRef<HTMLSpanElement>(null);
  const hostRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const writers = useRef<ManagedWriter[]>([]);
  const run = useRef(0); // bumped to cancel whatever animation is in progress
  const playing = useRef(false);
  const [theme, setTheme] = useState(0);

  const setPlaying = useCallback(
    (p: boolean) => {
      if (playing.current === p) return;
      playing.current = p;
      onPlayingChange?.(p);
    },
    [onPlayingChange],
  );

  const stop = useCallback(() => {
    run.current++;
    for (const { writer } of writers.current) {
      writer.showCharacter({ duration: 0 });
      writer.hideOutline({ duration: 0 });
    }
    setPlaying(false);
  }, [setPlaying]);

  const play = useCallback(async () => {
    const ws = writers.current.map((m) => m.writer);
    if (ws.length === 0) return;
    const id = ++run.current;
    setPlaying(true);
    for (const w of ws) {
      w.hideCharacter({ duration: 0 });
      w.showOutline({ duration: 0 });
    }
    for (const w of ws) {
      if (run.current !== id) return;
      await new Promise<void>((done) => void w.animateCharacter({ onComplete: () => done() }));
    }
    if (run.current !== id) return;
    for (const w of ws) w.hideOutline({ duration: 250 });
    setPlaying(false);
  }, [setPlaying]);

  useImperativeHandle(ref, () => ({ play: () => void play(), stop }), [play, stop]);

  // Follow the system theme: the writers take their colours from CSS variables when created.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setTheme((t) => t + 1);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (cell === 0 || !rootRef.current) return;
    const colors = readColors(rootRef.current);
    const made: ManagedWriter[] = [];
    chars.forEach((c, i) => {
      const host = hostRefs.current[i];
      if (!drawable[i] || !host) return;
      made.push(
        createWriter(host, c, {
          width: cell,
          height: cell,
          padding: Math.round(cell * 0.1),
          showOutline: false,
          delayBetweenStrokes: 250,
          ...colors,
        }),
      );
    });
    writers.current = made;
    return () => {
      run.current++;
      made.forEach((m) => m.dispose());
      writers.current = [];
      setPlaying(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, cell, drawKey, theme, setPlaying]);

  let index = 0;
  return (
    <span ref={rootRef} className="hanzi strokes-text" role="img" aria-label={text} lang="zh-Hans" data-ready={cell > 0}>
      {splitLines(chars).map((line, li) => (
        <span key={li} className="brush-line" aria-hidden="true">
          {line.map((c) => {
            const i = index++;
            return (
              <span key={i} className="sw-cell" style={{ width: cell, height: cell }}>
                {single && (
                  <svg className="guide" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                    <rect x="0" y="0" width="100" height="100" />
                    <path d={GUIDE} />
                  </svg>
                )}
                {drawable[i] ? (
                  <span className="sw-host" ref={(el) => void (hostRefs.current[i] = el)} />
                ) : loading[i] ? null : (
                  <span className="brush-fallback" style={{ fontSize: cell * 0.8 }}>
                    {c}
                  </span>
                )}
              </span>
            );
          })}
        </span>
      ))}
    </span>
  );
}
