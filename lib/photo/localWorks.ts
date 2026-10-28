export type PhotoWork = {
  id: string;
  image: string;
  createdAt: number;
  expiresAt: number;
  style: string;
  size: string;
};

const DB_NAME = 'offer-get-photo-works';
const STORE = 'works';
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transact<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore, resolve: (value: T) => void) => void): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    let result: T;
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.oncomplete = () => { db.close(); resolve(result); };
    run(tx.objectStore(STORE), (value) => { result = value; });
  });
}

export async function listPhotoWorks(): Promise<PhotoWork[]> {
  const works = await transact<PhotoWork[]>('readonly', (store, resolve) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as PhotoWork[]);
  });
  const now = Date.now();
  const expired = works.filter((work) => work.expiresAt <= now);
  await Promise.all(expired.map((work) => deletePhotoWork(work.id)));
  return works.filter((work) => work.expiresAt > now).sort((a, b) => b.createdAt - a.createdAt);
}

export async function savePhotoWork(image: string, style: string, size: string): Promise<void> {
  if (!image.startsWith('data:image/')) throw new Error('生成结果无法离线保存。');
  await listPhotoWorks();
  const now = Date.now();
  const work: PhotoWork = { id: crypto.randomUUID(), image, style, size, createdAt: now, expiresAt: now + RETENTION_MS };
  await transact<void>('readwrite', (store, resolve) => {
    const request = store.put(work);
    request.onsuccess = () => resolve();
  });
}

export async function deletePhotoWork(id: string): Promise<void> {
  await transact<void>('readwrite', (store, resolve) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
  });
}
