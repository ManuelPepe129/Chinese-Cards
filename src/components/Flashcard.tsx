import type { CSSProperties } from 'react';
import type { Entry } from '../data/schema';
import { BrushText } from './BrushText';

interface Props {
  entry: Entry;
  flipped: boolean;
  reverse: boolean;
  /** Show pinyin under the hanzi on the front (ignored in reverse mode). */
  showPinyin?: boolean;
  /** Room the stroke-order panel needs on the back: at the bottom, or on the right for short cards. */
  reserve?: { side: boolean; size: number };
  onFlip: () => void;
}

/**
 * Hanzi on a practice-paper guide (田字格) when it is a single character.
 * Longer text is sized for at most 6 characters per line and wraps after that.
 */
function Hanzi({ text }: { text: string }) {
  const n = Math.max(1, [...text].length);
  return (
    <span className="glyph" data-single={n === 1} style={{ '--n': Math.min(n, 6) } as CSSProperties}>
      {n === 1 && (
        <svg className="guide" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <rect x="0" y="0" width="100" height="100" />
          <path d="M50 0V100M0 50H100M0 0L100 100M100 0L0 100" />
        </svg>
      )}
      <BrushText text={text} />
    </span>
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

export function Flashcard({ entry, flipped, reverse, showPinyin = false, reserve, onFlip }: Props) {
  const backStyle = reserve ? (reserve.side ? { paddingRight: reserve.size + 24 } : { paddingBottom: reserve.size + 22 }) : undefined;
  return (
    <button type="button" className="card" data-card data-flipped={flipped} onClick={onFlip}>
      <span className="face front" aria-hidden={flipped}>
        {reverse ? (
          <Meanings italian={entry.italian} />
        ) : (
          <>
            <Hanzi text={entry.hanzi} />
            {showPinyin && (
              <span className="front-pinyin" lang="zh-Latn-pinyin">
                {entry.pinyin}
              </span>
            )}
          </>
        )}
        <span className="hint">Tap to flip</span>
      </span>
      <span className="face back" aria-hidden={!flipped} data-reserve={reserve ? (reserve.side ? 'side' : 'bottom') : undefined} style={backStyle}>
        {reverse && <Hanzi text={entry.hanzi} />}
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
