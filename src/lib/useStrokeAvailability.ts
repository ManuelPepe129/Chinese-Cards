import { useEffect, useState } from 'react';
import { loadStrokeData } from './strokeData';

export type StrokeStatus = 'loading' | 'ok' | 'missing';

/**
 * Loads (and so prefetches and caches) the stroke data for the given characters, so the layout
 * knows what to reserve before the card is flipped. Unknown characters count as "loading".
 */
export function useStrokeAvailability(chars: readonly string[]): (char: string) => StrokeStatus {
  const key = chars.join('');
  const [status, setStatus] = useState<Record<string, StrokeStatus>>({});
  useEffect(() => {
    let cancelled = false;
    for (const c of new Set(chars)) {
      void loadStrokeData(c).then((data) => {
        if (!cancelled) setStatus((s) => (s[c] ? s : { ...s, [c]: data ? 'ok' : 'missing' }));
      });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return (c) => status[c] ?? 'loading';
}
