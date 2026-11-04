interface Props {
  playing: boolean;
  onPlay: () => void;
  onStop: () => void;
}

/** Round play button, top-left of the card. A sibling of the flip button (never inside it), so it can't flip the card. */
export function StrokeButton({ playing, onPlay, onStop }: Props) {
  const label = playing ? 'Stop stroke order' : 'Show stroke order';
  return (
    <button
      type="button"
      className="play"
      data-playing={playing}
      aria-label={label}
      title={label}
      onClick={playing ? onStop : onPlay}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        {playing ? <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" /> : <path d="M8 5.5v13l11-6.5z" fill="currentColor" />}
      </svg>
    </button>
  );
}
