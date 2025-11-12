const DB_NAME = 'VirtualTryOnDB';
const DB_VERSION = 1;
export const USER_MODEL_STORE = 'userModel';
export const CACHE_STORE = 'apiCache';

let db: IDBDatabase;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("IndexedDB error:", request.error);
      reject(new Error("Failed to open IndexedDB."));
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = () => {
      const tempDb = request.result;
      if (!tempDb.objectStoreNames.contains(USER_MODEL_STORE)) {
        tempDb.createObjectStore(USER_MODEL_STORE, { keyPath: 'id' });
      }
      if (!tempDb.objectStoreNames.contains(CACHE_STORE)) {
        tempDb.createObjectStore(CACHE_STORE, { keyPath: 'key' });
      }
    };
  });
};

export default openDB;
