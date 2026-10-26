import { useEffect, useState } from 'react';
import { loadDataset } from './load';
import type { ValidationResult } from './validate';

export type DatasetState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | ({ status: 'ready' } & ValidationResult);

export function useDataset(): DatasetState {
  const [state, setState] = useState<DatasetState>({ status: 'loading' });
  useEffect(() => {
    let cancelled = false;
    loadDataset()
      .then((r) => !cancelled && setState({ status: 'ready', ...r }))
      .catch((e: Error) => !cancelled && setState({ status: 'error', message: e.message }));
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}
