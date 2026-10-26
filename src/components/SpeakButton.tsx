interface Props {
  /** The hanzi that will be spoken. */
  text: string;
  speaking: boolean;
  failed: boolean;
  onSpeak: () => void;
  onStop: () => void;
}

/** Round speaker button. A sibling of the flip button (never inside it), so tapping it can't flip the card. */
export function SpeakButton({ text, speaking, failed, onSpeak, onStop }: Props) {
  const label = speaking ? 'Stop audio' : failed ? 'Audio failed, tap to try again' : `Play pronunciation of ${text}`;
  return (
    <button
      type="button"
      className="speak"
      data-speaking={speaking}
      data-failed={failed}
      aria-label={label}
      title={label}
      onClick={speaking ? onStop : onSpeak}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        {speaking ? (
          <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" />
        ) : (
          <>
            <path d="M3 9.5v5h3.8L12 19V5L6.8 9.5H3z" fill="currentColor" />
            <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </>
        )}
      </svg>
    </button>
  );
}
