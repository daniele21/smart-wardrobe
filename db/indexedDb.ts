const DB_NAME = 'VirtualTryOnDB';
const DB_VERSION = 2; // Incremented version to trigger upgrade
export const USER_MODEL_STORE = 'userModel';
export const CACHE_STORE = 'apiCache';
export const WARDROBE_STORE = 'wardrobeItems';

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
      if (!tempDb.objectStoreNames.contains(WARDROBE_STORE)) {
        tempDb.createObjectStore(WARDROBE_STORE, { keyPath: 'id' });
      }
    };
  });
};

export default openDB;