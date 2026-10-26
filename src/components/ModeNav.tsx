import { MODES, type Mode } from '../url/urlState';

const LABELS: Record<Mode, string> = { cards: 'Characters', sentences: 'Sentences', browse: 'Browse' };

export function ModeNav({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="modes" role="group" aria-label="Mode">
      {MODES.map((m) => (
        <button key={m} type="button" aria-pressed={m === mode} onClick={() => onChange(m)}>
          {LABELS[m]}
        </button>
      ))}
    </div>
  );
}
