import { WardrobeItem } from '../types';
import openDB, { WARDROBE_STORE } from './indexedDb';

export const getWardrobe = async (): Promise<WardrobeItem[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(WARDROBE_STORE, 'readonly');
        const store = transaction.objectStore(WARDROBE_STORE);
        const request = store.getAll();

        request.onsuccess = () => {
            resolve(request.result as WardrobeItem[]);
        };
        request.onerror = () => reject(request.error);
    });
};

export const saveWardrobeItem = async (item: WardrobeItem): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(WARDROBE_STORE, 'readwrite');
        const store = transaction.objectStore(WARDROBE_STORE);
        const request = store.put(item);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const saveMultipleWardrobeItems = async (items: WardrobeItem[]): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(WARDROBE_STORE, 'readwrite');
        const store = transaction.objectStore(WARDROBE_STORE);
        
        items.forEach(item => {
            store.put(item);
        });

        transaction.oncomplete = () => {
            resolve();
        };

        transaction.onerror = () => {
            reject(transaction.error);
        };
    });
};

export const updateWardrobeItem = async (item: WardrobeItem): Promise<void> => {
    return saveWardrobeItem(item);
};

export const deleteWardrobeItem = async (itemId: string): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(WARDROBE_STORE, 'readwrite');
        const store = transaction.objectStore(WARDROBE_STORE);
        const request = store.delete(itemId);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};
