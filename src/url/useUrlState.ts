import { useCallback, useEffect, useState } from 'react';
import { parseUrlState, serializeUrlState, type UrlState } from './urlState';

/** Filter/mode state mirrored in the query string (replaceState, so no history entries). */
export function useUrlState(): [UrlState, (patch: Partial<UrlState>) => void] {
  const [state, setState] = useState<UrlState>(() => parseUrlState(window.location.search));

  useEffect(() => {
    const next = `${window.location.pathname}${serializeUrlState(state)}${window.location.hash}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (next !== current) window.history.replaceState(null, '', next);
  }, [state]);

  useEffect(() => {
    const onPop = () => setState(parseUrlState(window.location.search));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const update = useCallback((patch: Partial<UrlState>) => setState((s) => ({ ...s, ...patch })), []);
  return [state, update];
}
