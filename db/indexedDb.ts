
const DB_NAME = "virtualTryOnDB";
const DB_VERSION = 1;
export const USER_MODEL_STORE = "userModel";

let dbPromise: Promise<IDBDatabase> | null = null;

const openDB = (): Promise<IDBDatabase> => {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("IndexedDB error:", request.error);
      reject("Error opening database");
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(USER_MODEL_STORE)) {
        db.createObjectStore(USER_MODEL_STORE, { keyPath: "id" });
      }
    };
  });

  return dbPromise;
};

export default openDB;
