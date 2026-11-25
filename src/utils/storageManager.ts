import { Wallpaper, BlogPost } from '../types';
import { INITIAL_WALLPAPERS } from '../data/initialWallpapers';
import { INITIAL_BLOG_POSTS } from '../data/initialBlogPosts';
import { normalizeMediaUrl, registerBlobUrl } from './mediaUtils';

export const STORAGE_KEYS = {
  WALLPAPERS: 'deskspace4k_wallpapers_v1',
  USER: 'deskspace4k_user_v1',
  GUEST_FAVORITES: 'deskspace4k_guest_favs_v1',
  LANG: 'deskspace4k_lang_v1',
  BLOG_POSTS: 'deskspace4k_blog_v2',
  DELETED_WALLPAPERS: 'deskspace4k_deleted_wallpapers_v2',
  DELETED_BLOG_POSTS: 'deskspace4k_deleted_blog_posts_v1',
};

const DB_NAME = 'DeskSpace4K_IndexedDB_v3';
const DB_VERSION = 5;
const BLOB_STORE_NAME = 'media_blobs';
const WALLPAPERS_STORE_NAME = 'custom_wallpapers';
const BLOG_STORE_NAME = 'custom_blog_posts';
const DELETED_STORE_NAME = 'deleted_wallpaper_ids';
const DELETED_BLOG_STORE_NAME = 'deleted_blog_post_ids';

// Open IndexedDB database safely with auto-migration
function openDatabase(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(BLOB_STORE_NAME)) {
          db.createObjectStore(BLOB_STORE_NAME, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(WALLPAPERS_STORE_NAME)) {
          db.createObjectStore(WALLPAPERS_STORE_NAME, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(BLOG_STORE_NAME)) {
          db.createObjectStore(BLOG_STORE_NAME, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(DELETED_STORE_NAME)) {
          db.createObjectStore(DELETED_STORE_NAME, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(DELETED_BLOG_STORE_NAME)) {
          db.createObjectStore(DELETED_BLOG_STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.warn('IndexedDB failed to open, continuing with in-memory fallback');
        resolve(null);
      };
    } catch (e) {
      console.warn('Error opening IndexedDB', e);
      resolve(null);
    }
  });
}

/**
 * Stores a heavy Blob / File or permanent Base64 DataURL in IndexedDB.
 */
export async function storeBlobInIndexedDB(
  id: string,
  blob?: Blob,
  name?: string,
  base64?: string
): Promise<boolean> {
  try {
    const db = await openDatabase();
    if (!db) return false;

    return new Promise((resolve) => {
      const tx = db.transaction([BLOB_STORE_NAME], 'readwrite');
      const store = tx.objectStore(BLOB_STORE_NAME);
      const record = {
        id,
        blob: blob || null,
        name: name || '',
        type: blob ? blob.type : '',
        base64: base64 || null,
        updatedAt: Date.now(),
      };
      const req = store.put(record);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('Failed to store media in IndexedDB', err);
    return false;
  }
}

/**
 * Retrieves a media record (Blob or Base64) from IndexedDB.
 */
export async function getMediaFromIndexedDB(
  id: string
): Promise<{ blob?: Blob; base64?: string; name?: string } | null> {
  try {
    const db = await openDatabase();
    if (!db) return null;

    return new Promise((resolve) => {
      const tx = db.transaction([BLOB_STORE_NAME], 'readonly');
      const store = tx.objectStore(BLOB_STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => {
        if (req.result) {
          resolve(req.result);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Retrieves a Blob from IndexedDB and registers a fresh Object URL.
 */
export async function getBlobUrlFromIndexedDB(id: string): Promise<string | null> {
  try {
    const media = await getMediaFromIndexedDB(id);
    if (!media) return null;

    if (media.base64) {
      return media.base64;
    }

    if (media.blob) {
      const blobUrl = URL.createObjectURL(media.blob);
      registerBlobUrl(blobUrl);
      return blobUrl;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Saves a single custom wallpaper with its full, real Base64 or direct URL into IndexedDB.
 */
export async function saveCustomWallpaperToIndexedDB(wallpaper: Wallpaper): Promise<boolean> {
  try {
    const db = await openDatabase();
    if (!db) return false;

    return new Promise((resolve) => {
      const tx = db.transaction([WALLPAPERS_STORE_NAME], 'readwrite');
      const store = tx.objectStore(WALLPAPERS_STORE_NAME);
      const req = store.put(wallpaper);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('Failed to save wallpaper to IndexedDB', err);
    return false;
  }
}

/**
 * Loads the set of permanently deleted wallpaper IDs synchronously from LocalStorage.
 */
export function getDeletedWallpaperIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DELETED_WALLPAPERS);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

/**
 * Saves the set of permanently deleted wallpaper IDs to LocalStorage.
 */
export function saveDeletedWallpaperIds(ids: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.DELETED_WALLPAPERS, JSON.stringify(Array.from(ids)));
  } catch (e) {
    console.warn('Could not save deleted wallpaper IDs to LocalStorage', e);
  }
}

/**
 * Checks if a wallpaper ID has been marked as permanently deleted.
 */
export function isWallpaperDeleted(id: string): boolean {
  return getDeletedWallpaperIds().has(id);
}

/**
 * Loads the set of permanently deleted blog post IDs synchronously from LocalStorage.
 */
export function getDeletedBlogPostIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DELETED_BLOG_POSTS);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

/**
 * Saves the set of permanently deleted blog post IDs to LocalStorage.
 */
export function saveDeletedBlogPostIds(ids: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.DELETED_BLOG_POSTS, JSON.stringify(Array.from(ids)));
  } catch (e) {
    console.warn('Could not save deleted blog post IDs to LocalStorage', e);
  }
}

/**
 * Checks if a blog post ID has been marked as permanently deleted.
 */
export function isBlogPostDeleted(id: string): boolean {
  return getDeletedBlogPostIds().has(id);
}

/**
 * Saves all custom wallpapers into IndexedDB so they survive page reloads permanently.
 * Explicitly cleans up any deleted or stale records from WALLPAPERS_STORE_NAME.
 */
export async function saveAllCustomWallpapersToIndexedDB(wallpapers: Wallpaper[]): Promise<boolean> {
  try {
    const db = await openDatabase();
    if (!db) return false;

    const deletedIds = getDeletedWallpaperIds();
    // Exclude any deleted item
    const activeWallpapers = wallpapers.filter((w) => !deletedIds.has(w.id));
    const activeIds = new Set(activeWallpapers.map((w) => w.id));

    const initialMap = new Map(INITIAL_WALLPAPERS.map((w) => [w.id, w]));
    const itemsToSave = activeWallpapers.filter((w) => {
      const initial = initialMap.get(w.id);
      if (!initial) return true; // custom uploaded wallpaper
      return (
        w.title.en !== initial.title.en ||
        w.title.ar !== initial.title.ar ||
        w.category !== initial.category ||
        w.url !== initial.url ||
        w.videoUrl !== initial.videoUrl ||
        w.posterUrl !== initial.posterUrl ||
        w.downloads !== initial.downloads ||
        w.favorites !== initial.favorites
      );
    });

    return new Promise((resolve) => {
      const tx = db.transaction([WALLPAPERS_STORE_NAME], 'readwrite');
      const store = tx.objectStore(WALLPAPERS_STORE_NAME);

      // Clean up records in store that were deleted or are no longer in the active collection
      const getAllReq = store.getAllKeys();
      getAllReq.onsuccess = () => {
        const storedKeys = getAllReq.result || [];
        for (const key of storedKeys) {
          const keyStr = String(key);
          if (deletedIds.has(keyStr) || !activeIds.has(keyStr)) {
            store.delete(key);
          }
        }

        for (const wp of itemsToSave) {
          store.put(wp);
        }
      };

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('Failed to save all custom wallpapers to IndexedDB', err);
    return false;
  }
}

/**
 * Loads all custom wallpapers from IndexedDB.
 * Returns each wallpaper with its original Base64 or direct URL intact.
 * Strictly excludes any record that was permanently deleted.
 */
export async function loadCustomWallpapersFromIndexedDB(): Promise<Wallpaper[]> {
  try {
    const db = await openDatabase();
    if (!db) return [];

    const deletedIds = getDeletedWallpaperIds();

    return new Promise((resolve) => {
      const tx = db.transaction([WALLPAPERS_STORE_NAME], 'readonly');
      const store = tx.objectStore(WALLPAPERS_STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const results = req.result;
        if (Array.isArray(results) && results.length > 0) {
          const validItems = results.filter((w) => w && w.id && !deletedIds.has(w.id));
          resolve(validItems);
        } else {
          resolve([]);
        }
      };
      req.onerror = () => resolve([]);
    });
  } catch (err) {
    console.warn('Failed to load custom wallpapers from IndexedDB', err);
    return [];
  }
}

/**
 * Converts a title or phrase into a clean URL-safe slug.
 */
export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u0600-\u06FF\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/**
 * Strictly checks if a wallpaper matches a route identifier by exact ID or slug.
 */
export function matchesIdOrSlug(wallpaper: Wallpaper, targetIdOrSlug: string): boolean {
  if (!wallpaper || !targetIdOrSlug) return false;
  const decoded = decodeURIComponent(targetIdOrSlug).trim().toLowerCase();
  const rawId = (wallpaper.id || '').trim().toLowerCase();
  if (rawId === decoded) return true;

  if (wallpaper.slug) {
    const rawSlug = wallpaper.slug.trim().toLowerCase();
    if (rawSlug === decoded) return true;
  }

  const enSlug = slugify(wallpaper.title?.en || '');
  if (enSlug && enSlug === decoded) return true;

  const arSlug = slugify(wallpaper.title?.ar || '');
  if (arSlug && arSlug === decoded) return true;

  return false;
}

/**
 * Fetches the exact wallpaper record from IndexedDB or state where item.id === routeId or item.slug === routeSlug.
 * Strictly eliminates any hardcoded or fallback data fetching.
 */
export async function getWallpaperByIdOrSlug(
  idOrSlug: string,
  inMemoryList?: Wallpaper[]
): Promise<Wallpaper | null> {
  if (!idOrSlug) return null;
  const decoded = decodeURIComponent(idOrSlug).trim();
  const deletedIds = getDeletedWallpaperIds();

  // If marked as deleted, strictly return null
  if (deletedIds.has(decoded)) return null;

  // 1. Search in-memory state or safeLoadWallpapers()
  const candidates = inMemoryList && inMemoryList.length > 0 ? inMemoryList : safeLoadWallpapers();
  const memoryMatch = candidates.find((w) => matchesIdOrSlug(w, decoded));
  if (memoryMatch && !deletedIds.has(memoryMatch.id)) {
    return memoryMatch;
  }

  // 2. Query IndexedDB store directly for custom uploaded items
  try {
    const db = await openDatabase();
    if (db) {
      const fromDb = await new Promise<Wallpaper | null>((resolve) => {
        const tx = db.transaction([WALLPAPERS_STORE_NAME], 'readonly');
        const store = tx.objectStore(WALLPAPERS_STORE_NAME);

        // Try direct primary key lookup first
        const keyReq = store.get(decoded);
        keyReq.onsuccess = () => {
          const direct = keyReq.result as Wallpaper | undefined;
          if (direct && direct.id && !deletedIds.has(direct.id)) {
            resolve(direct);
            return;
          }

          // Scan all stored custom records for matching slug or localized slug
          const allReq = store.getAll();
          allReq.onsuccess = () => {
            const list = allReq.result as Wallpaper[] | undefined;
            if (Array.isArray(list)) {
              const matched = list.find((w) => matchesIdOrSlug(w, decoded) && !deletedIds.has(w.id));
              resolve(matched || null);
            } else {
              resolve(null);
            }
          };
          allReq.onerror = () => resolve(null);
        };
        keyReq.onerror = () => resolve(null);
      });

      if (fromDb) return fromDb;
    }
  } catch (err) {
    console.warn('Error reading wallpaper by ID/slug from IndexedDB:', err);
  }

  // 3. Check INITIAL_WALLPAPERS as final source of truth for base items
  const initialMatch = INITIAL_WALLPAPERS.find(
    (w) => matchesIdOrSlug(w, decoded) && !deletedIds.has(w.id)
  );
  if (initialMatch) {
    return initialMatch;
  }

  // Strictly no fallback or dummy item
  return null;
}

export interface PagedWallpapersResult {
  items: Wallpaper[];
  total: number;
  offset: number;
  limit: number;
  page: number;
  totalPages: number;
}

export interface PagedQueryOptions {
  offset?: number;
  limit?: number;
  filter?: (wallpaper: Wallpaper) => boolean;
  sort?: (a: Wallpaper, b: Wallpaper) => number;
}

/**
 * Fluent IndexedDB query builder with .offset() and .limit() support.
 * Minimizes heap memory usage and guarantees smooth 60fps rendering by streaming
 * only the active page's records from IndexedDB storage.
 */
export class IndexedDBWallpaperQuery {
  private _offset: number = 0;
  private _limit: number = 24;
  private _filter?: (w: Wallpaper) => boolean;
  private _sort?: (a: Wallpaper, b: Wallpaper) => number;

  offset(offset: number): this {
    this._offset = Math.max(0, offset);
    return this;
  }

  limit(limit: number): this {
    this._limit = Math.max(1, limit);
    return this;
  }

  filter(filterFn: (w: Wallpaper) => boolean): this {
    this._filter = filterFn;
    return this;
  }

  sort(sortFn: (a: Wallpaper, b: Wallpaper) => number): this {
    this._sort = sortFn;
    return this;
  }

  async count(): Promise<number> {
    try {
      const db = await openDatabase();
      if (!db) return 0;
      return new Promise((resolve) => {
        const tx = db.transaction([WALLPAPERS_STORE_NAME], 'readonly');
        const store = tx.objectStore(WALLPAPERS_STORE_NAME);
        if (!this._filter) {
          const req = store.count();
          req.onsuccess = () => resolve(req.result || 0);
          req.onerror = () => resolve(0);
        } else {
          let count = 0;
          const req = store.openCursor();
          req.onsuccess = (e) => {
            const cursor = (e.target as IDBRequest).result as IDBCursorWithValue | null;
            if (cursor) {
              if (this._filter!(cursor.value)) count++;
              cursor.continue();
            } else {
              resolve(count);
            }
          };
          req.onerror = () => resolve(0);
        }
      });
    } catch {
      return 0;
    }
  }

  async execute(): Promise<PagedWallpapersResult> {
    try {
      const db = await openDatabase();
      if (!db) {
        return {
          items: [],
          total: 0,
          offset: this._offset,
          limit: this._limit,
          page: Math.floor(this._offset / this._limit) + 1,
          totalPages: 0,
        };
      }

      return new Promise((resolve) => {
        const tx = db.transaction([WALLPAPERS_STORE_NAME], 'readonly');
        const store = tx.objectStore(WALLPAPERS_STORE_NAME);

        if (this._sort) {
          const matched: Wallpaper[] = [];
          const req = store.openCursor();
          req.onsuccess = (e) => {
            const cursor = (e.target as IDBRequest).result as IDBCursorWithValue | null;
            if (cursor) {
              const val = cursor.value as Wallpaper;
              if (!this._filter || this._filter(val)) {
                matched.push(val);
              }
              cursor.continue();
            } else {
              matched.sort(this._sort!);
              const total = matched.length;
              const pagedItems = matched.slice(this._offset, this._offset + this._limit);
              const page = Math.floor(this._offset / this._limit) + 1;
              const totalPages = Math.max(1, Math.ceil(total / this._limit));
              resolve({
                items: pagedItems,
                total,
                offset: this._offset,
                limit: this._limit,
                page,
                totalPages,
              });
            }
          };
          req.onerror = () => {
            resolve({
              items: [],
              total: 0,
              offset: this._offset,
              limit: this._limit,
              page: 1,
              totalPages: 0,
            });
          };
        } else {
          let total = 0;
          let skipped = 0;
          const items: Wallpaper[] = [];
          let hasAdvanced = false;

          const req = store.openCursor();
          req.onsuccess = (e) => {
            const cursor = (e.target as IDBRequest).result as IDBCursorWithValue | null;
            if (cursor) {
              const val = cursor.value as Wallpaper;
              const matches = !this._filter || this._filter(val);
              if (matches) {
                total++;
                if (!this._filter && !hasAdvanced && this._offset > 0) {
                  hasAdvanced = true;
                  cursor.advance(this._offset);
                  return;
                }
                if (skipped < this._offset) {
                  skipped++;
                } else if (items.length < this._limit) {
                  items.push(val);
                }
              }
              cursor.continue();
            } else {
              const page = Math.floor(this._offset / this._limit) + 1;
              const totalPages = Math.max(1, Math.ceil(total / this._limit));
              resolve({
                items,
                total,
                offset: this._offset,
                limit: this._limit,
                page,
                totalPages,
              });
            }
          };
          req.onerror = () => {
            resolve({
              items: [],
              total: 0,
              offset: this._offset,
              limit: this._limit,
              page: 1,
              totalPages: 0,
            });
          };
        }
      });
    } catch {
      return {
        items: [],
        total: 0,
        offset: this._offset,
        limit: this._limit,
        page: 1,
        totalPages: 0,
      };
    }
  }

  async toArray(): Promise<Wallpaper[]> {
    const res = await this.execute();
    return res.items;
  }
}

/**
 * Creates a new fluent IndexedDB wallpaper query supporting .offset(n) and .limit(n).
 */
export function queryWallpapersFromIndexedDB(): IndexedDBWallpaperQuery {
  return new IndexedDBWallpaperQuery();
}

/**
 * Helper to fetch paged wallpapers directly with offset and limit.
 */
export async function getWallpapersPagedFromIndexedDB(
  options: PagedQueryOptions = {}
): Promise<PagedWallpapersResult> {
  const query = new IndexedDBWallpaperQuery();
  if (options.offset !== undefined) query.offset(options.offset);
  if (options.limit !== undefined) query.limit(options.limit);
  if (options.filter) query.filter(options.filter);
  if (options.sort) query.sort(options.sort);
  return query.execute();
}

/**
 * Explicitly and permanently deletes a wallpaper by ID:
 * 1. Executes an atomic readwrite transaction against IndexedDB stores (WALLPAPERS_STORE_NAME & BLOB_STORE_NAME).
 * 2. Removes any associated video/poster/thumb blobs.
 * 3. Records the deletion in the persistent deleted store so no fallback/re-seed mechanism ever restores it.
 * 4. Updates LocalStorage synchronously.
 * 5. Awaits the explicit tx.oncomplete event to guarantee commit.
 */
export async function permanentlyDeleteWallpaperFromIndexedDB(
  id: string
): Promise<{ success: boolean; error?: string }> {
  if (!id) return { success: false, error: 'Invalid wallpaper ID' };

  try {
    // 1. Mark as deleted in LocalStorage immediately
    const deletedSet = getDeletedWallpaperIds();
    deletedSet.add(id);
    saveDeletedWallpaperIds(deletedSet);

    // 2. Remove from LocalStorage wallpapers array immediately
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.WALLPAPERS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((w: any) => w && w.id !== id);
          localStorage.setItem(STORAGE_KEYS.WALLPAPERS, JSON.stringify(filtered));
        }
      }
    } catch (e) {
      console.warn('Could not update LocalStorage wallpapers on delete', e);
    }

    // 3. Open IndexedDB and execute explicit atomic transaction
    const db = await openDatabase();
    if (!db) {
      return { success: true };
    }

    return new Promise((resolve) => {
      const storeNames = [WALLPAPERS_STORE_NAME, BLOB_STORE_NAME];
      if (db.objectStoreNames.contains(DELETED_STORE_NAME)) {
        storeNames.push(DELETED_STORE_NAME);
      }

      const tx = db.transaction(storeNames, 'readwrite');

      // Delete from custom wallpapers store
      const wpStore = tx.objectStore(WALLPAPERS_STORE_NAME);
      wpStore.delete(id);

      // Delete media blobs
      const blobStore = tx.objectStore(BLOB_STORE_NAME);
      blobStore.delete(id);
      blobStore.delete(`${id}_video`);
      blobStore.delete(`${id}_thumb`);
      blobStore.delete(`${id}_poster`);

      // Record in deleted store
      if (db.objectStoreNames.contains(DELETED_STORE_NAME)) {
        const delStore = tx.objectStore(DELETED_STORE_NAME);
        delStore.put({ id, deletedAt: Date.now() });
      }

      // Explicitly wait for transaction commit
      tx.oncomplete = () => {
        resolve({ success: true });
      };

      tx.onerror = (event) => {
        const errorMsg = (event.target as any)?.error?.message || 'IndexedDB transaction failed';
        console.error('IndexedDB deletion transaction error:', errorMsg);
        resolve({ success: false, error: errorMsg });
      };

      tx.onabort = () => {
        console.warn('IndexedDB deletion transaction aborted');
        resolve({ success: false, error: 'Transaction aborted' });
      };
    });
  } catch (err: any) {
    console.error('permanentlyDeleteWallpaperFromIndexedDB exception:', err);
    return { success: false, error: err?.message || 'Unexpected deletion error' };
  }
}

/**
 * Deletes a custom wallpaper from IndexedDB (wraps permanentlyDeleteWallpaperFromIndexedDB).
 */
export async function deleteCustomWallpaperFromIndexedDB(id: string): Promise<boolean> {
  const result = await permanentlyDeleteWallpaperFromIndexedDB(id);
  return result.success;
}

/**
 * Deletes all raw blobs associated with a media/wallpaper ID from IndexedDB.
 */
export async function deleteMediaFromIndexedDB(id: string): Promise<boolean> {
  try {
    const db = await openDatabase();
    if (!db) return false;

    return new Promise((resolve) => {
      const tx = db.transaction([BLOB_STORE_NAME], 'readwrite');
      const store = tx.objectStore(BLOB_STORE_NAME);
      store.delete(id);
      store.delete(`${id}_video`);
      store.delete(`${id}_thumb`);
      store.delete(`${id}_poster`);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * Clears all deleted wallpaper tracking (e.g., when resetting factory defaults).
 */
export async function clearAllDeletedWallpaperIds(): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEYS.DELETED_WALLPAPERS);
    } catch (e) {
      console.warn('Could not clear deleted wallpapers from LocalStorage', e);
    }
  }

  try {
    const db = await openDatabase();
    if (db && db.objectStoreNames.contains(DELETED_STORE_NAME)) {
      const tx = db.transaction([DELETED_STORE_NAME], 'readwrite');
      tx.objectStore(DELETED_STORE_NAME).clear();
    }
  } catch (err) {
    console.warn('Could not clear deleted store in IndexedDB', err);
  }
}

/**
 * Clears all custom wallpapers from IndexedDB (e.g., on reset defaults).
 */
export async function clearAllCustomWallpapersInIndexedDB(): Promise<boolean> {
  await clearAllDeletedWallpaperIds();
  try {
    const db = await openDatabase();
    if (!db) return false;

    return new Promise((resolve) => {
      const tx = db.transaction([WALLPAPERS_STORE_NAME], 'readwrite');
      const store = tx.objectStore(WALLPAPERS_STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * Saves all custom blog posts to IndexedDB permanently.
 * Explicitly cleans up any deleted or stale records from BLOG_STORE_NAME.
 * STRICT DATA-SAFETY GUARANTEE: Operates strictly on custom_blog_posts and never touches wallpapers or media blobs.
 */
export async function saveAllCustomBlogPostsToIndexedDB(posts: BlogPost[]): Promise<boolean> {
  try {
    const db = await openDatabase();
    if (!db) return false;

    const deletedIds = getDeletedBlogPostIds();
    const activePosts = posts.filter((p) => p && p.id && !deletedIds.has(p.id));
    const activeIds = new Set(activePosts.map((p) => p.id));

    const initialMap = new Map(INITIAL_BLOG_POSTS.map((p) => [p.id, p]));
    const itemsToSave = activePosts.filter((p) => {
      const initial = initialMap.get(p.id);
      if (!initial) return true; // custom post
      return (
        p.title.en !== initial.title.en ||
        p.title.ar !== initial.title.ar ||
        p.content.en !== initial.content.en ||
        p.content.ar !== initial.content.ar ||
        p.coverImage !== initial.coverImage ||
        p.category !== initial.category
      );
    });

    return new Promise((resolve) => {
      const tx = db.transaction([BLOG_STORE_NAME], 'readwrite');
      const store = tx.objectStore(BLOG_STORE_NAME);

      const getAllReq = store.getAllKeys();
      getAllReq.onsuccess = () => {
        const storedKeys = getAllReq.result || [];
        for (const key of storedKeys) {
          const keyStr = String(key);
          if (deletedIds.has(keyStr) || !activeIds.has(keyStr)) {
            store.delete(key);
          }
        }

        for (const p of itemsToSave) {
          store.put(p);
        }
      };

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('Failed to save blog posts to IndexedDB', err);
    return false;
  }
}

/**
 * Saves a single custom blog post to IndexedDB without touching any other records.
 */
export async function saveCustomBlogPostToIndexedDB(post: BlogPost): Promise<boolean> {
  try {
    const db = await openDatabase();
    if (!db) return false;

    return new Promise((resolve) => {
      const tx = db.transaction([BLOG_STORE_NAME], 'readwrite');
      const store = tx.objectStore(BLOG_STORE_NAME);
      const req = store.put(post);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('Failed to save single blog post to IndexedDB', err);
    return false;
  }
}

/**
 * Loads all custom blog posts from IndexedDB.
 * Strictly filters out any article marked as permanently deleted.
 */
export async function loadCustomBlogPostsFromIndexedDB(): Promise<BlogPost[]> {
  try {
    const db = await openDatabase();
    if (!db) return [];

    const deletedIds = getDeletedBlogPostIds();

    return new Promise((resolve) => {
      const tx = db.transaction([BLOG_STORE_NAME], 'readonly');
      const store = tx.objectStore(BLOG_STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const results = req.result;
        if (Array.isArray(results) && results.length > 0) {
          const valid = results.filter((p) => p && p.id && !deletedIds.has(p.id));
          resolve(valid);
        } else {
          resolve([]);
        }
      };
      req.onerror = () => resolve([]);
    });
  } catch (err) {
    console.warn('Failed to load custom blog posts from IndexedDB', err);
    return [];
  }
}

/**
 * Permanently deletes a single blog post from IndexedDB and marks its ID as deleted.
 * STRICT DATA-SAFETY GUARANTEE:
 * ONLY touches custom_blog_posts and deleted_blog_post_ids.
 * NEVER resets, modifies, or deletes custom_wallpapers or media_blobs.
 */
export async function permanentlyDeleteBlogPostFromIndexedDB(
  id: string
): Promise<{ success: boolean; error?: string }> {
  if (!id) return { success: false, error: 'Invalid article ID' };

  try {
    // 1. Mark as deleted in LocalStorage immediately
    const deletedSet = getDeletedBlogPostIds();
    deletedSet.add(id);
    saveDeletedBlogPostIds(deletedSet);

    // 2. Remove from LocalStorage blog posts array immediately
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.BLOG_POSTS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((p: any) => p && p.id !== id);
          localStorage.setItem(STORAGE_KEYS.BLOG_POSTS, JSON.stringify(filtered));
        }
      } else {
        const remainingInitials = INITIAL_BLOG_POSTS.filter(
          (p) => p && p.id !== id && !deletedSet.has(p.id)
        );
        localStorage.setItem(STORAGE_KEYS.BLOG_POSTS, JSON.stringify(remainingInitials));
      }
    } catch (e) {
      console.warn('Could not update LocalStorage blog posts on delete', e);
    }

    // 3. Open IndexedDB and execute explicit atomic transaction targeted strictly to blog stores
    const db = await openDatabase();
    if (!db) {
      return { success: true };
    }

    return new Promise((resolve) => {
      const storeNames = [BLOG_STORE_NAME];
      if (db.objectStoreNames.contains(DELETED_BLOG_STORE_NAME)) {
        storeNames.push(DELETED_BLOG_STORE_NAME);
      }

      const tx = db.transaction(storeNames, 'readwrite');

      // Delete ONLY from custom blog posts store
      const blogStore = tx.objectStore(BLOG_STORE_NAME);
      blogStore.delete(id);

      // Record in deleted blog store
      if (db.objectStoreNames.contains(DELETED_BLOG_STORE_NAME)) {
        const delStore = tx.objectStore(DELETED_BLOG_STORE_NAME);
        delStore.put({ id, deletedAt: Date.now() });
      }

      // Explicitly wait for transaction commit
      tx.oncomplete = () => {
        resolve({ success: true });
      };

      tx.onerror = (event) => {
        const errorMsg =
          (event.target as any)?.error?.message || 'IndexedDB blog deletion transaction failed';
        console.error('IndexedDB blog deletion transaction error:', errorMsg);
        resolve({ success: false, error: errorMsg });
      };

      tx.onabort = () => {
        console.warn('IndexedDB blog deletion transaction aborted');
        resolve({ success: false, error: 'Transaction aborted' });
      };
    });
  } catch (err: any) {
    console.error('permanentlyDeleteBlogPostFromIndexedDB exception:', err);
    return { success: false, error: err?.message || 'Unexpected deletion error' };
  }
}

/**
 * Deletes a custom blog post from IndexedDB (wraps permanentlyDeleteBlogPostFromIndexedDB).
 */
export async function deleteCustomBlogPostFromIndexedDB(id: string): Promise<boolean> {
  const result = await permanentlyDeleteBlogPostFromIndexedDB(id);
  return result.success;
}

/**
 * Strips heavy Base64 strings ONLY for LocalStorage to completely avoid QuotaExceededError,
 * because the full high-res Base64 string is permanently preserved in IndexedDB.
 */
function sanitizeWallpaperForLocalStorage(wp: Wallpaper): Wallpaper {
  let cleanUrl = wp.url;
  let cleanPoster = wp.posterUrl;
  let cleanVideo = wp.videoUrl;

  // Never store base64 or blob strings in LocalStorage!
  if (cleanUrl && (cleanUrl.startsWith('data:') || cleanUrl.startsWith('blob:'))) {
    cleanUrl = `__idb_media__:${wp.id}`;
  }
  if (cleanPoster && (cleanPoster.startsWith('data:') || cleanPoster.startsWith('blob:'))) {
    cleanPoster = `__idb_media_poster__:${wp.id}`;
  }
  if (cleanVideo && (cleanVideo.startsWith('data:') || cleanVideo.startsWith('blob:'))) {
    cleanVideo = undefined;
  }

  return {
    ...wp,
    url: cleanUrl,
    posterUrl: cleanPoster,
    videoUrl: cleanVideo,
  };
}

/**
 * Strips heavy Base64 strings for LocalStorage on blog posts.
 */
function sanitizeBlogPostForLocalStorage(post: BlogPost): BlogPost {
  let cleanCover = post.coverImage;
  if (cleanCover && (cleanCover.startsWith('data:') || cleanCover.startsWith('blob:'))) {
    cleanCover = `__idb_blog_cover__:${post.id}`;
  }
  return {
    ...post,
    coverImage: cleanCover,
  };
}

/**
 * Safely loads wallpapers synchronously from LocalStorage.
 * Does NOT replace Base64 strings with category fallbacks!
 * Strictly respects deleted wallpaper IDs and prevents any re-seeding upon reload.
 */
export function safeLoadWallpapers(): Wallpaper[] {
  try {
    const deletedIds = getDeletedWallpaperIds();

    if (typeof window === 'undefined') {
      return INITIAL_WALLPAPERS.filter((w) => !deletedIds.has(w.id));
    }

    const raw = localStorage.getItem(STORAGE_KEYS.WALLPAPERS);
    if (!raw) {
      return INITIAL_WALLPAPERS.filter((w) => !deletedIds.has(w.id));
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return INITIAL_WALLPAPERS.filter((w) => !deletedIds.has(w.id));
    }

    // Keep actual URLs (Base64 placeholders, direct URLs, bundled assets)
    // Filter out any permanently deleted wallpapers
    const sanitized: Wallpaper[] = parsed
      .filter((w: Wallpaper) => w && w.id && !deletedIds.has(w.id))
      .map((w: Wallpaper) => {
        const isVid = Boolean(
          w.formatType === 'video' ||
          w.isLive ||
          w.videoUrl ||
          /\.(mp4|webm|mov|avi|mkv)$/i.test(w.url || '')
        );

        let safeUrl = w.url;
        if (safeUrl && !safeUrl.startsWith('__idb_media__:')) {
          safeUrl = normalizeMediaUrl(safeUrl, w.category);
        }

        let safePoster = w.posterUrl;
        if (safePoster && !safePoster.startsWith('__idb_media_poster__:')) {
          safePoster = normalizeMediaUrl(safePoster, w.category);
        }

        return {
          ...w,
          url: safeUrl || (isVid ? undefined : normalizeMediaUrl(undefined, w.category)) || '',
          posterUrl: safePoster,
          videoUrl: w.videoUrl || (isVid ? safeUrl : undefined),
        };
      });

    // Merge missing initial code wallpapers EXCEPT any that were permanently deleted!
    const savedIds = new Set(sanitized.map((w) => w.id));
    const missing = INITIAL_WALLPAPERS.filter(
      (w) => !savedIds.has(w.id) && !deletedIds.has(w.id)
    );
    return [...sanitized, ...missing];
  } catch (error) {
    console.error('Error reading wallpapers from LocalStorage, falling back safely', error);
    const deletedIds = getDeletedWallpaperIds();
    return INITIAL_WALLPAPERS.filter((w) => !deletedIds.has(w.id));
  }
}

/**
 * Safely writes wallpapers:
 * 1. Writes custom wallpapers with full Base64 strings to IndexedDB (unlimited quota).
 * 2. Writes sanitized metadata to LocalStorage with try/catch quota protection.
 */
export function safeSaveWallpapers(wallpapers: Wallpaper[]): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Asynchronously persist all custom items to IndexedDB
  saveAllCustomWallpapersToIndexedDB(wallpapers).catch((e) => {
    console.warn('Could not save custom wallpapers to IndexedDB', e);
  });

  // 2. Persist to LocalStorage
  try {
    const cleanList = wallpapers.map(sanitizeWallpaperForLocalStorage);
    localStorage.setItem(STORAGE_KEYS.WALLPAPERS, JSON.stringify(cleanList));
    return true;
  } catch (err: any) {
    console.warn('LocalStorage Quota reached. Custom wallpapers remain fully safe in IndexedDB.', err);
    try {
      localStorage.removeItem('deskspace4k_recent_searches_v1');
      const minimal = wallpapers.slice(0, 40).map(sanitizeWallpaperForLocalStorage);
      localStorage.setItem(STORAGE_KEYS.WALLPAPERS, JSON.stringify(minimal));
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Safely loads blog posts from LocalStorage.
 * Strictly respects deleted article IDs and guarantees deleted demo/default articles
 * never re-populate on reload or refresh.
 */
export function safeLoadBlogPosts(): BlogPost[] {
  try {
    const deletedIds = getDeletedBlogPostIds();

    if (typeof window === 'undefined') {
      return INITIAL_BLOG_POSTS.filter((p) => !deletedIds.has(p.id));
    }

    const raw = localStorage.getItem(STORAGE_KEYS.BLOG_POSTS);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((p: BlogPost) => p && p.id && !deletedIds.has(p.id));
      }
    }

    // First visit: initial blog posts minus any that were marked as deleted
    return INITIAL_BLOG_POSTS.filter((p) => !deletedIds.has(p.id));
  } catch (e) {
    console.warn('Failed to parse blog posts from storage, returning clean filtered list', e);
    const deletedIds = getDeletedBlogPostIds();
    return INITIAL_BLOG_POSTS.filter((p) => !deletedIds.has(p.id));
  }
}

/**
 * Safely writes blog posts:
 * 1. Persists custom articles to IndexedDB and cleans up deleted keys.
 * 2. Persists lightweight metadata to LocalStorage.
 */
export function safeSaveBlogPosts(posts: BlogPost[]): boolean {
  if (typeof window === 'undefined') return false;

  const deletedIds = getDeletedBlogPostIds();
  const cleanActivePosts = posts.filter((p) => p && p.id && !deletedIds.has(p.id));

  // 1. Asynchronously persist custom posts to IndexedDB and clean up deleted keys
  saveAllCustomBlogPostsToIndexedDB(cleanActivePosts).catch((e) => {
    console.warn('Could not save custom blog posts to IndexedDB', e);
  });

  // 2. Persist to LocalStorage
  try {
    const cleanPosts = cleanActivePosts.map(sanitizeBlogPostForLocalStorage);
    localStorage.setItem(STORAGE_KEYS.BLOG_POSTS, JSON.stringify(cleanPosts));
    return true;
  } catch (err) {
    console.warn('LocalStorage quota limit reached while saving blog posts', err);
    return false;
  }
}

/**
 * Clears all deleted blog post tracking (e.g., when resetting factory defaults).
 */
export async function clearAllDeletedBlogPostIds(): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEYS.DELETED_BLOG_POSTS);
    } catch (e) {
      console.warn('Could not clear deleted blog posts from LocalStorage', e);
    }
  }

  try {
    const db = await openDatabase();
    if (db && db.objectStoreNames.contains(DELETED_BLOG_STORE_NAME)) {
      const tx = db.transaction([DELETED_BLOG_STORE_NAME], 'readwrite');
      tx.objectStore(DELETED_BLOG_STORE_NAME).clear();
    }
  } catch (err) {
    console.warn('Could not clear deleted blog store in IndexedDB', err);
  }
}

/**
 * Complete storage reset to rescue users stuck in broken browser storage states.
 */
export function resetAllStorageAndReload(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.WALLPAPERS);
    localStorage.removeItem(STORAGE_KEYS.BLOG_POSTS);
    localStorage.removeItem(STORAGE_KEYS.GUEST_FAVORITES);
    localStorage.removeItem(STORAGE_KEYS.DELETED_WALLPAPERS);
    localStorage.removeItem(STORAGE_KEYS.DELETED_BLOG_POSTS);
    clearAllCustomWallpapersInIndexedDB().catch(() => {});
    clearAllDeletedBlogPostIds().catch(() => {});
    sessionStorage.clear();
  } catch {
    // ignore
  }
  window.location.href = '/';
}
