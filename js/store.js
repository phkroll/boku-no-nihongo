// Persistence: the whole Data object lives in one IndexedDB record.
import { emptyData } from './model.js';

const DB_NAME = 'boku-no-nihongo';
const STORE = 'kv';
const KEY = 'data';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run(mode, action) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = action(tx.objectStore(STORE));
        tx.oncomplete = () => {
          db.close();
          resolve(req.result);
        };
        tx.onerror = () => reject(tx.error);
      }),
  );
}

export async function loadData() {
  return (await run('readonly', (s) => s.get(KEY))) ?? emptyData();
}

export function saveData(data) {
  return run('readwrite', (s) => s.put(structuredClone(data), KEY));
}

export async function requestPersist() {
  return (await navigator.storage?.persist?.()) ?? false;
}
