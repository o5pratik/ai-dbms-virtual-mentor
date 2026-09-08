export type PracticeSnapshot = {
  bytes: ArrayBuffer;
  databaseName: string;
  sql: string;
  savedAt: number;
};

export type PracticeDraft = Pick<
  PracticeSnapshot,
  'databaseName' | 'sql' | 'savedAt'
>;
export type PracticeCheckpoint = PracticeSnapshot & { label: string };

// A new storage namespace prevents the former CollegeDB-seeded snapshot from
// leaking into the clean, program-only ER diagram. The old local copy is left
// untouched so this migration does not delete learner data.
const DATABASE_NAME = 'ai-dbms-mentor-program-v2';
const DATABASE_VERSION = 1;
const STORE_NAME = 'practice-snapshots';
const ACTIVE_SNAPSHOT = 'active';
const UNDO_CHECKPOINT = 'undo';
const DRAFT_KEY = 'ai-dbms-mentor:program-draft:v2';

function openStorage() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        request.error ?? new Error('Local database storage is unavailable.'),
      );
  });
}

async function transactStorage<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
) {
  const database = await openStorage();
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = operation(transaction.objectStore(STORE_NAME));
    let result: T;
    request.onsuccess = () => {
      result = request.result;
    };
    request.onerror = () =>
      reject(
        request.error ?? new Error('The local snapshot could not be updated.'),
      );
    transaction.oncomplete = () => {
      database.close();
      resolve(result);
    };
    transaction.onerror = () => {
      database.close();
      reject(
        transaction.error ??
          new Error('The local snapshot transaction failed.'),
      );
    };
  });
}

export async function loadPracticeSnapshot() {
  const snapshot = await transactStorage<PracticeSnapshot | undefined>(
    'readonly',
    (store) => store.get(ACTIVE_SNAPSHOT),
  );
  return snapshot ?? null;
}

export async function savePracticeSnapshot(snapshot: PracticeSnapshot) {
  await transactStorage<IDBValidKey>('readwrite', (store) =>
    store.put(snapshot, ACTIVE_SNAPSHOT),
  );
}

export async function loadPracticeCheckpoint() {
  const checkpoint = await transactStorage<PracticeCheckpoint | undefined>(
    'readonly',
    (store) => store.get(UNDO_CHECKPOINT),
  );
  return checkpoint ?? null;
}

export async function savePracticeCheckpoint(checkpoint: PracticeCheckpoint) {
  await transactStorage<IDBValidKey>('readwrite', (store) =>
    store.put(checkpoint, UNDO_CHECKPOINT),
  );
}

export async function clearPracticeCheckpoint() {
  await transactStorage<undefined>('readwrite', (store) =>
    store.delete(UNDO_CHECKPOINT),
  );
}

export async function clearPracticeSnapshot() {
  await transactStorage<undefined>('readwrite', (store) =>
    store.delete(ACTIVE_SNAPSHOT),
  );
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Storage can be blocked in private browsing. The in-memory lab still works.
  }
}

export function loadPracticeDraft(): PracticeDraft | null {
  try {
    const value = localStorage.getItem(DRAFT_KEY);
    if (!value) return null;
    const draft = JSON.parse(value) as Partial<PracticeDraft>;
    return typeof draft.sql === 'string' &&
      typeof draft.databaseName === 'string' &&
      typeof draft.savedAt === 'number'
      ? {
          sql: draft.sql,
          databaseName: draft.databaseName,
          savedAt: draft.savedAt,
        }
      : null;
  } catch {
    return null;
  }
}

export function savePracticeDraft(sql: string, databaseName: string) {
  try {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        sql,
        databaseName,
        savedAt: Date.now(),
      } satisfies PracticeDraft),
    );
  } catch {
    // Draft persistence is best effort; SQL execution must remain available.
  }
}
