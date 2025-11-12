import openDB, { CACHE_STORE } from './indexedDb';

interface CacheEntry {
  key: string;
  value: any;
  timestamp: number;
}

const TTL = 24 * 60 * 60 * 1000; // 24 hours

export const getFromCache = async <T>(key: string): Promise<T | null> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(CACHE_STORE, 'readonly');
        const store = transaction.objectStore(CACHE_STORE);
        const request = store.get(key);

        request.onsuccess = () => {
            const entry: CacheEntry | undefined = request.result;
            if (entry && (Date.now() - entry.timestamp < TTL)) {
                resolve(entry.value as T);
            } else {
                if (entry) {
                    // Asynchronously delete expired entry
                    deleteFromCache(key).catch(err => console.error("Failed to delete expired cache entry", err));
                }
                resolve(null);
            }
        };
        request.onerror = () => reject(request.error);
    });
};

export const saveToCache = async <T>(key: string, value: T): Promise<void> => {
    const db = await openDB();
    const entry: CacheEntry = { key, value, timestamp: Date.now() };
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(CACHE_STORE, 'readwrite');
        const store = transaction.objectStore(CACHE_STORE);
        const request = store.put(entry);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const deleteFromCache = async (key: string): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(CACHE_STORE, 'readwrite');
        const store = transaction.objectStore(CACHE_STORE);
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};
