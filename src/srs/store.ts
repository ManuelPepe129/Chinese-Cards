import type { DailyMeta } from './queue';
import type { CardState, Grade } from './scheduler';

/** One answered card, kept for statistics and the future "mistakes" mode. */
export interface ReviewLogEntry {
  key: string;
  at: number;
  grade: Grade;
}

export interface ProgressData {
  states: CardState[];
  meta: DailyMeta | null;
}

export interface ProgressStore {
  loadAll(): Promise<ProgressData>;
  /** Saves the new card state, the log entry and the daily counter together. */
  save(state: CardState, log: ReviewLogEntry, meta: DailyMeta): Promise<void>;
}

export interface OpenedStore {
  store: ProgressStore;
  /** False when the browser has no usable IndexedDB: progress then only lasts until the page is closed. */
  durable: boolean;
}

/** In-memory store: used in tests, and as a fallback when IndexedDB is unavailable (e.g. some private windows). */
export function createMemoryStore(initial?: ProgressData): ProgressStore {
  const cards = new Map((initial?.states ?? []).map((s) => [s.key, s]));
  let meta: DailyMeta | null = initial?.meta ?? null;
  const log: ReviewLogEntry[] = [];
  return {
    async loadAll() {
      return { states: [...cards.values()].map((s) => ({ ...s })), meta: meta && { ...meta } };
    },
    async save(state, entry, nextMeta) {
      cards.set(state.key, { ...state });
      log.push({ ...entry });
      meta = { ...nextMeta };
    },
  };
}

const DB_NAME = 'mandarin-cards';
const DB_VERSION = 1;
const META_ID = 'daily';

const request = <T>(r: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });

const finished = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
  });

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB_NAME, DB_VERSION);
    open.onupgradeneeded = () => {
      const db = open.result;
      db.createObjectStore('cards', { keyPath: 'key' });
      db.createObjectStore('log', { autoIncrement: true });
      db.createObjectStore('meta', { keyPath: 'id' });
    };
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
    open.onblocked = () => reject(new Error('IndexedDB is blocked by another tab'));
  });
}

function createIndexedDbStore(db: IDBDatabase): ProgressStore {
  return {
    async loadAll() {
      const tx = db.transaction(['cards', 'meta'], 'readonly');
      const [states, record] = await Promise.all([
        request(tx.objectStore('cards').getAll() as IDBRequest<CardState[]>),
        request(tx.objectStore('meta').get(META_ID) as IDBRequest<(DailyMeta & { id: string }) | undefined>),
      ]);
      return { states, meta: record ? { day: record.day, newIntroduced: record.newIntroduced } : null };
    },
    async save(state, entry, meta) {
      const tx = db.transaction(['cards', 'log', 'meta'], 'readwrite');
      tx.objectStore('cards').put(state);
      tx.objectStore('log').add(entry);
      tx.objectStore('meta').put({ id: META_ID, ...meta });
      await finished(tx);
    },
  };
}

/** Opens the on-device database, or falls back to memory (and says so through `durable`). */
export async function openProgressStore(): Promise<OpenedStore> {
  if (typeof indexedDB !== 'undefined') {
    try {
      return { store: createIndexedDbStore(await openDb()), durable: true };
    } catch {
      // fall through to the in-memory store
    }
  }
  return { store: createMemoryStore(), durable: false };
}

/** Asks the browser not to evict this site's data when storage runs low. Best effort. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
