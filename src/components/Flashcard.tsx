import type { Ref } from 'react';
import type { Entry } from '../data/schema';
import { HanziStrokes, type StrokesHandle } from './HanziStrokes';

interface Props {
  entry: Entry;
  flipped: boolean;
  reverse: boolean;
  /** Show pinyin under the hanzi on the front (ignored in reverse mode). */
  showPinyin?: boolean;
  /** Size of the card, used to scale the drawn hanzi. */
  area: { w: number; h: number };
  strokesRef?: Ref<StrokesHandle>;
  onPlayingChange?: (playing: boolean) => void;
  onFlip: () => void;
}

/** Hanzi drawn from stroke data, at most 6 per line. Single characters get a bigger practice-paper square. */
function Hanzi({ text, area, strokesRef, onPlayingChange }: { text: string; area: Props['area']; strokesRef?: Ref<StrokesHandle>; onPlayingChange?: (p: boolean) => void }) {
  return (
    <HanziStrokes
      text={text}
      ref={strokesRef}
      onPlayingChange={onPlayingChange}
      area={{ w: area.w - 48, h: area.h * 0.45 }}
      maxCell={area.w >= 600 ? 340 : 260}
    />
  );
}

function Meanings({ italian }: { italian: string[] }) {
  const [primary, ...rest] = italian;
  return (
    <>
      <span className="meaning" lang="it">
        {primary}
      </span>
      {rest.length > 0 && (
        <span className="more" lang="it">
          {rest.join(', ')}
        </span>
      )}
    </>
  );
}

export function Flashcard({ entry, flipped, reverse, showPinyin = false, area, strokesRef, onPlayingChange, onFlip }: Props) {
  const hanzi = <Hanzi text={entry.hanzi} area={area} strokesRef={strokesRef} onPlayingChange={onPlayingChange} />;
  return (
    <button type="button" className="card" data-card data-flipped={flipped} onClick={onFlip}>
      <span className="face front" aria-hidden={flipped}>
        {reverse ? (
          <Meanings italian={entry.italian} />
        ) : (
          <>
            {hanzi}
            {showPinyin && (
              <span className="front-pinyin" lang="zh-Latn-pinyin">
                {entry.pinyin}
              </span>
            )}
          </>
        )}
        <span className="hint">Tap to flip</span>
      </span>
      <span className="face back" aria-hidden={!flipped}>
        {reverse && hanzi}
        <span className="pinyin" lang="zh-Latn-pinyin">
          {entry.pinyin}
        </span>
        {!reverse && <Meanings italian={entry.italian} />}
        {entry.traditional && (
          <span className="more" lang="zh-Hant">
            Traditional: {entry.traditional}
          </span>
        )}
        {entry.notes && <span className="note">{entry.notes}</span>}
      </span>
      <span className="sr-only">Flip card</span>
    </button>
  );
}
