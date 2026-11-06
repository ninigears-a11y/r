// "My GIFs" persistence in IndexedDB — stays in this browser only.
// Every call fails soft: private windows or blocked storage just mean
// the gallery isn't remembered.
import type { Mode } from "@/lib/presets";

export interface StoredGif {
  id: string;
  blob: Blob;
  title: string;
  mode: Mode;
  fileName: string;
  createdAt: number;
  demo: boolean;
}

const DB = "nome-studio";
const STORE = "gifs";
export const MAX_STORED = 24;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function listGifs(): Promise<StoredGif[]> {
  try {
    const all = await tx<StoredGif[]>("readonly", (s) => s.getAll());
    return all.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export async function saveGif(gif: StoredGif): Promise<void> {
  try {
    await tx("readwrite", (s) => s.put(gif));
    const all = await listGifs();
    for (const old of all.slice(MAX_STORED)) await tx("readwrite", (s) => s.delete(old.id));
  } catch {
    /* storage unavailable */
  }
}

export async function deleteGif(id: string): Promise<void> {
  try {
    await tx("readwrite", (s) => s.delete(id));
  } catch {
    /* storage unavailable */
  }
}
