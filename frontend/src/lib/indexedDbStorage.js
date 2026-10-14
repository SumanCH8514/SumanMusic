const DB_NAME = 'sumanmusic_db';
const DB_VERSION = 1;

let dbPromise = null;

const openDatabase = () => {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('songs')) {
        const songStore = db.createObjectStore('songs', { keyPath: 'id' });
        songStore.createIndex('by_artist', 'artist', { unique: false });
        songStore.createIndex('by_album', 'album', { unique: false });
        songStore.createIndex('by_createdTime', 'createdTime', { unique: false });
        songStore.createIndex('by_scope', 'scope', { unique: false });
      }

      if (!db.objectStoreNames.contains('metadata')) {
        const metaStore = db.createObjectStore('metadata', { keyPath: 'key' });
        metaStore.createIndex('by_expiresAt', 'expiresAt', { unique: false });
      }

      if (!db.objectStoreNames.contains('catalogue_meta')) {
        db.createObjectStore('catalogue_meta', { keyPath: 'scope' });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error('IndexedDB open error:', event.target.error);
      resolve(null);
    };
  });

  return dbPromise;
};

export const getCachedSongs = async (scope = 'inbuilt') => {
  const db = await openDatabase();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(['songs'], 'readonly');
      const store = tx.objectStore('songs');
      const index = store.index('by_scope');
      const request = index.getAll(scope);

      request.onsuccess = () => {
        const results = request.result || [];
        resolve(results.map(item => item.songData));
      };

      request.onerror = () => {
        resolve([]);
      };
    } catch {
      resolve([]);
    }
  });
};

export const saveCachedSongs = async (scope = 'inbuilt', songs = [], version = null, etag = null) => {
  if (!Array.isArray(songs) || songs.length === 0) return false;
  const db = await openDatabase();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(['songs', 'catalogue_meta'], 'readwrite');
      const songStore = tx.objectStore('songs');
      const metaStore = tx.objectStore('catalogue_meta');

      const existingRequest = songStore.index('by_scope').getAllKeys(scope);

      existingRequest.onsuccess = () => {
        const existingKeys = existingRequest.result || [];
        for (const key of existingKeys) {
          songStore.delete(key);
        }

        const now = Date.now();
        for (const song of songs) {
          if (!song || !song.id) continue;
          songStore.put({
            id: song.id,
            scope,
            title: song.title || '',
            artist: song.artist || 'Unknown Artist',
            album: song.album || '',
            createdTime: song.createdTime || '',
            cachedAt: now,
            songData: song
          });
        }

        metaStore.put({
          scope,
          version: version || `v_${now}`,
          etag: etag || `"${now}_${songs.length}"`,
          count: songs.length,
          lastSyncedAt: now,
          schemaVersion: 1
        });
      };

      tx.oncomplete = () => {
        resolve(true);
      };

      tx.onerror = () => {
        resolve(false);
      };
    } catch {
      resolve(false);
    }
  });
};

export const getCatalogueMeta = async (scope = 'inbuilt') => {
  const db = await openDatabase();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(['catalogue_meta'], 'readonly');
      const store = tx.objectStore('catalogue_meta');
      const request = store.get(scope);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
};

export const getCachedTrackMetadata = async (key) => {
  if (!key) return null;
  const db = await openDatabase();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(['metadata'], 'readonly');
      const store = tx.objectStore('metadata');
      const request = store.get(key);

      request.onsuccess = () => {
        const record = request.result;
        if (!record) {
          resolve(null);
          return;
        }
        if (record.expiresAt && Date.now() > record.expiresAt) {
          cleanupExpiredMetadata(key);
          resolve(null);
          return;
        }
        resolve(record.data);
      };

      request.onerror = () => {
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
};

export const setCachedTrackMetadata = async (key, data, ttlMs = 7 * 24 * 60 * 60 * 1000) => {
  if (!key || !data) return false;
  const db = await openDatabase();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(['metadata'], 'readwrite');
      const store = tx.objectStore('metadata');
      const now = Date.now();

      store.put({
        key,
        data,
        cachedAt: now,
        expiresAt: now + ttlMs
      });

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
};

export const cleanupExpiredMetadata = async (specificKey = null) => {
  const db = await openDatabase();
  if (!db) return;

  try {
    const tx = db.transaction(['metadata'], 'readwrite');
    const store = tx.objectStore('metadata');

    if (specificKey) {
      store.delete(specificKey);
      return;
    }

    const now = Date.now();
    const index = store.index('by_expiresAt');
    const range = IDBKeyRange.upperBound(now);
    const request = index.openCursor(range);

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  } catch {}
};

export const clearUserCache = async (scope = 'personal') => {
  const db = await openDatabase();
  if (!db) return;

  try {
    const tx = db.transaction(['songs', 'catalogue_meta'], 'readwrite');
    const songStore = tx.objectStore('songs');
    const metaStore = tx.objectStore('catalogue_meta');

    const index = songStore.index('by_scope');
    const request = index.getAllKeys(scope);

    request.onsuccess = () => {
      const keys = request.result || [];
      for (const k of keys) {
        songStore.delete(k);
      }
      metaStore.delete(scope);
    };
  } catch {}
};

export const clearAllIndexedDBCache = async () => {
  const db = await openDatabase();
  if (!db) return;

  try {
    const tx = db.transaction(['songs', 'metadata', 'catalogue_meta'], 'readwrite');
    tx.objectStore('songs').clear();
    tx.objectStore('metadata').clear();
    tx.objectStore('catalogue_meta').clear();
  } catch {}
};

export const updateCachedSong = async (song) => {
  if (!song || !song.id) return;
  const db = await openDatabase();
  if (!db) return;

  try {
    const tx = db.transaction(['songs'], 'readwrite');
    const store = tx.objectStore('songs');
    const getReq = store.get(song.id);

    getReq.onsuccess = () => {
      const record = getReq.result;
      if (record) {
        record.songData = { ...record.songData, ...song };
        if (song.cover) record.songData.cover = song.cover;
        if (song.thumbnail) record.songData.thumbnail = song.thumbnail;
        if (song.album) record.songData.album = song.album;
        if (song.year) record.songData.year = song.year;
        store.put(record);
      }
    };
  } catch {}
};
