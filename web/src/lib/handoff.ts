/**
 * The raw take, handed from the landing's brief box to the studio on the same origin. One record in IndexedDB
 * (db `moovi-handoff`, store `take`, key `latest`): the landing saves it, the studio takes it once and it is gone.
 */
export interface Take { file: File; style: string; note?: string; split?: boolean }

const DB = 'moovi-handoff', STORE = 'take', KEY = 'latest';

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE); };
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
    req.onblocked = () => rej(new Error('moovi-handoff is blocked by another tab'));
  });
}

/** Keep the take for the studio. Resolves once it is written (rejects if storage is unavailable). */
export async function saveTake(file: File, opts: { style: string; note?: string; split?: boolean }): Promise<void> {
  const db = await open();
  try {
    await new Promise<void>((res, rej) => {
      const tx = db.transaction(STORE, 'readwrite');
      const take: Take = { file, style: opts.style, ...(opts.note ? { note: opts.note } : {}), ...(opts.split ? { split: true } : {}) };
      tx.objectStore(STORE).put(take, KEY);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
      tx.onabort = () => rej(tx.error);
    });
  } finally { db.close(); }
}

/** Read the take the landing left, and delete it in the same transaction. Null when there is none. */
export async function takeTake(): Promise<Take | null> {
  let db: IDBDatabase;
  try { db = await open(); } catch { return null; }
  try {
    return await new Promise<Take | null>(res => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      let out: Take | null = null;
      const get = store.get(KEY);
      get.onsuccess = () => {
        const v = get.result as Take | undefined;
        if (v && v.file instanceof Blob) {
          // some browsers hand a stored File back as a Blob: give the studio a File either way
          const file = v.file instanceof File ? v.file : new File([v.file], 'take.mp4', { type: (v.file as Blob).type || 'video/mp4' });
          out = { file, style: v.style, ...(v.note ? { note: v.note } : {}), ...(v.split ? { split: true } : {}) };
        }
        store.delete(KEY);
      };
      tx.oncomplete = () => res(out);
      tx.onerror = () => res(out);
      tx.onabort = () => res(out);
    });
  } finally { db.close(); }
}
