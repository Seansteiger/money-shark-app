import { AppSettings, Customer, Loan, Repayment } from '../types';

const DB_NAME = 'MoneyShark_DeviceDB';
const DB_VERSION = 1;
const STORE_NAME = 'keyval';

class LocalIndexedDB {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private isAvailable(): boolean {
    return typeof window !== 'undefined' && 'indexedDB' in window;
  }

  private getDB(): Promise<IDBDatabase> {
    if (!this.isAvailable()) {
      return Promise.reject(new Error('IndexedDB is not available in this environment'));
    }

    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };

        request.onsuccess = (event) => {
          resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onerror = (event) => {
          reject((event.target as IDBOpenDBRequest).error);
        };
      } catch (err) {
        reject(err);
      }
    });

    return this.dbPromise;
  }

  async get<T = any>(key: string): Promise<T | null> {
    if (!this.isAvailable()) {
      try {
        const fallback = localStorage.getItem(key);
        return fallback ? JSON.parse(fallback) : null;
      } catch {
        return null;
      }
    }

    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);

        req.onsuccess = () => resolve(req.result !== undefined ? req.result : null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return null;
    }
  }

  async set<T = any>(key: string, value: T): Promise<void> {
    if (!this.isAvailable()) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {}
      return;
    }

    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(value, key);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('Failed to write to IndexedDB:', err);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.isAvailable()) {
      try {
        localStorage.removeItem(key);
      } catch {}
      return;
    }

    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(key);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {}
  }

  async clear(): Promise<void> {
    if (!this.isAvailable()) {
      try {
        localStorage.clear();
      } catch {}
      return;
    }

    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {}
  }
}

export const deviceStorage = new LocalIndexedDB();

// Keys
const KEYS = {
  SNAPSHOT: 'ms_cached_snapshot',
  DRAFT_ENTRY: 'ms_draft_entry',
  THEME: 'ms_preference_theme',
  FIXED_RATE_PREF: 'ms_preference_fixed_rate',
  SEARCH_HISTORY: 'ms_search_history',
};

export interface CachedSnapshot {
  settings: AppSettings;
  customers: Customer[];
  loans: Loan[];
  repayments?: Repayment[];
  timestamp: number;
}

export const saveCachedSnapshot = async (data: {
  settings: AppSettings;
  customers: Customer[];
  loans: Loan[];
  repayments?: Repayment[];
}) => {
  const snapshot: CachedSnapshot = {
    ...data,
    timestamp: Date.now(),
  };
  await deviceStorage.set(KEYS.SNAPSHOT, snapshot);
};

export const getCachedSnapshot = async (): Promise<CachedSnapshot | null> => {
  return await deviceStorage.get<CachedSnapshot>(KEYS.SNAPSHOT);
};

export const saveDraftEntry = async (draft: any) => {
  await deviceStorage.set(KEYS.DRAFT_ENTRY, draft);
};

export const getDraftEntry = async (): Promise<any | null> => {
  return await deviceStorage.get(KEYS.DRAFT_ENTRY);
};

export const clearDraftEntry = async () => {
  await deviceStorage.delete(KEYS.DRAFT_ENTRY);
};

export const saveThemePreference = async (theme: 'dark' | 'light') => {
  await deviceStorage.set(KEYS.THEME, theme);
};

export const getThemePreference = async (): Promise<'dark' | 'light' | null> => {
  return await deviceStorage.get<'dark' | 'light'>(KEYS.THEME);
};

export const clearAllDeviceStorage = async () => {
  await deviceStorage.clear();
};
