
import { UserModel } from '../types';
import openDB, { USER_MODEL_STORE } from './indexedDb';

export const getUserModel = async (): Promise<string | null> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(USER_MODEL_STORE, 'readonly');
        const store = transaction.objectStore(USER_MODEL_STORE);
        const request = store.get('currentUser');

        request.onsuccess = () => {
            resolve(request.result?.imageUrl || null);
        };
        request.onerror = () => reject(request.error);
    });
};

export const saveUserModel = async (imageUrl: string): Promise<void> => {
    const db = await openDB();
    const model: UserModel = { id: 'currentUser', imageUrl };
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(USER_MODEL_STORE, 'readwrite');
        const store = transaction.objectStore(USER_MODEL_STORE);
        const request = store.put(model);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const deleteUserModel = async (): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(USER_MODEL_STORE, 'readwrite');
        const store = transaction.objectStore(USER_MODEL_STORE);
        const request = store.delete('currentUser');

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};
