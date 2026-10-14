import { ENV } from '../config/env';
import { getCachedTrackMetadata, setCachedTrackMetadata, clearAllIndexedDBCache } from '../lib/indexedDbStorage';

const CACHE_NAME = 'suman_meta_cache';
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000;

const memoryCache = new Map();
const inFlightRequests = new Map();

const MAX_CONCURRENT_REQUESTS = 3;
let activeRequestsCount = 0;
const requestQueue = [];

const processQueue = () => {
  if (activeRequestsCount >= MAX_CONCURRENT_REQUESTS || requestQueue.length === 0) {
    return;
  }
  const { task, resolve, reject } = requestQueue.shift();
  activeRequestsCount++;
  task()
    .then(resolve)
    .catch(reject)
    .finally(() => {
      activeRequestsCount--;
      processQueue();
    });
};

const enqueueRequest = (task) => {
  return new Promise((resolve, reject) => {
    requestQueue.push({ task, resolve, reject });
    processQueue();
  });
};

let activeProvider = (() => {
  try { return localStorage.getItem('suman_meta_provider') || 'auto'; } catch { return 'auto'; }
})();
let activeFallback = (() => {
  try { return localStorage.getItem('suman_meta_fallback') !== 'false'; } catch { return true; }
})();

export const setMetadataConfig = ({ provider, fallback }) => {
  if (provider !== undefined) {
    activeProvider = provider;
    try { localStorage.setItem('suman_meta_provider', provider); } catch {}
  }
  if (fallback !== undefined) {
    activeFallback = !!fallback;
    try { localStorage.setItem('suman_meta_fallback', String(!!fallback)); } catch {}
  }
};

export const getMetadataConfig = () => ({
  provider: activeProvider,
  fallback: activeFallback
});

export const clearMetadataCache = () => {
  memoryCache.clear();
  inFlightRequests.clear();
  clearAllIndexedDBCache().catch(() => {});
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith(CACHE_NAME))
      .forEach(k => localStorage.removeItem(k));
  } catch {}
};

const getCachedMetadata = async (key) => {
  if (memoryCache.has(key)) {
    return memoryCache.get(key);
  }
  try {
    const idbData = await getCachedTrackMetadata(key);
    if (idbData !== null && idbData !== undefined) {
      memoryCache.set(key, idbData);
      return idbData;
    }
  } catch {}
  try {
    const raw = localStorage.getItem(`${CACHE_NAME}_${key}`);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(`${CACHE_NAME}_${key}`);
      return null;
    }
    memoryCache.set(key, data);
    setCachedTrackMetadata(key, data, CACHE_EXPIRY).catch(() => {});
    return data;
  } catch {
    return null;
  }
};

const setCachedMetadata = (key, data) => {
  if (!data) return;
  memoryCache.set(key, data);
  setCachedTrackMetadata(key, data, CACHE_EXPIRY).catch(() => {});
  try {
    localStorage.setItem(`${CACHE_NAME}_${key}`, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith(CACHE_NAME))
        .slice(0, 20)
        .forEach(k => localStorage.removeItem(k));
    } catch {}
  }
};

export const fetchExternalMetadata = async (artist, title, options = {}) => {
  if (!title) return null;

  const safeArtist = artist || '';
  const provider = (options.provider || activeProvider || 'auto').toLowerCase();
  const fallback = options.fallback !== undefined ? options.fallback : activeFallback;

  const cacheKey = `${provider}_${fallback ? 'fb' : 'nofb'}_${safeArtist}_${title}`.toLowerCase().replace(/[^a-z0-9]/g, '_');

  const cached = await getCachedMetadata(cacheKey);
  if (cached) {
    if (cached._notFound) return null;
    return cached;
  }

  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const promise = enqueueRequest(async () => {
    try {
      const url = `${ENV.BACKEND_URL}/api/metadata?artist=${encodeURIComponent(safeArtist)}&title=${encodeURIComponent(title)}&provider=${encodeURIComponent(provider)}&fallback=${fallback}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (response.ok) {
        const data = await response.json();
        if (data && (data.cover || data.title)) {
          setCachedMetadata(cacheKey, data);
          return data;
        }
      }
    } catch {}

    setCachedMetadata(cacheKey, { _notFound: true });
    return null;
  }).finally(() => {
    inFlightRequests.delete(cacheKey);
  });

  inFlightRequests.set(cacheKey, promise);
  return promise;
};

export const fetchBatchMetadata = async (songs = [], concurrency = 2, onSongEnriched = null) => {
  if (!songs || songs.length === 0) return [];

  const unEnriched = songs.filter(s => s && s.title && !s.album);
  if (unEnriched.length === 0) return [];

  const results = [];
  let index = 0;

  const worker = async () => {
    while (index < unEnriched.length) {
      const song = unEnriched[index++];
      try {
        const meta = await fetchExternalMetadata(song.artist, song.title);
        if (meta) {
          results.push({ songId: song.id, metadata: meta });
          if (onSongEnriched) {
            onSongEnriched(song.id, meta);
          }
        }
      } catch {}
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, unEnriched.length) }, () => worker());
  await Promise.all(workers);
  return results;
};
