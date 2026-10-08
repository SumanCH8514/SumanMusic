const CACHE_NAME = 'sumanmusic-offline-v1';
const INDEX_KEY = 'suman_music_offline_index';

const getIndex = () => {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const setIndex = (items) => {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(items));
  } catch {}
};

export const isTrackOffline = (songId) => {
  if (!songId) return false;
  const index = getIndex();
  return index.some(item => item.id === songId);
};

export const getOfflineTracks = () => {
  return getIndex();
};

export const saveTrackOffline = async (song, onProgress = null) => {
  const targetUrl = song?.url || song?.streamUrl || song?.driveUrl;
  if (!song || !song.id || !targetUrl) {
    throw new Error('Invalid song object');
  }

  if (typeof window === 'undefined' || !('caches' in window)) {
    throw new Error('CacheStorage not supported on this device');
  }

  const cache = await caches.open(CACHE_NAME);
  const cacheKey = `/offline-track/${song.id}`;

  const response = await fetch(targetUrl);
  if (!response.ok) {
    throw new Error(`Download failed with status ${response.status}`);
  }

  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;

  if (response.body && total > 0 && onProgress) {
    const reader = response.body.getReader();
    let loaded = 0;
    const chunks = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      onProgress(Math.round((loaded / total) * 100));
    }

    const blob = new Blob(chunks, { type: response.headers.get('content-type') || 'audio/mpeg' });
    const cachedResponse = new Response(blob, {
      status: 200,
      headers: {
        'Content-Type': blob.type,
        'Content-Length': String(blob.size),
        'Accept-Ranges': 'bytes'
      }
    });
    await cache.put(cacheKey, cachedResponse);
  } else {
    const blob = await response.blob();
    const cachedResponse = new Response(blob, {
      status: 200,
      headers: {
        'Content-Type': blob.type,
        'Content-Length': String(blob.size),
        'Accept-Ranges': 'bytes'
      }
    });
    await cache.put(cacheKey, cachedResponse);
    if (onProgress) onProgress(100);
  }

  const index = getIndex();
  const existingIndex = index.findIndex(item => item.id === song.id);
  const offlineEntry = {
    ...song,
    savedAt: Date.now(),
    isOffline: true
  };

  if (existingIndex >= 0) {
    index[existingIndex] = offlineEntry;
  } else {
    index.push(offlineEntry);
  }
  setIndex(index);

  window.dispatchEvent(new CustomEvent('sumanmusic-offline-updated', { detail: { songId: song.id, status: 'saved' } }));
  return true;
};

export const removeTrackOffline = async (songId) => {
  if (!songId) return false;
  try {
    if ('caches' in window) {
      const cache = await caches.open(CACHE_NAME);
      await cache.delete(`/offline-track/${songId}`);
    }
    const index = getIndex().filter(item => item.id !== songId);
    setIndex(index);
    window.dispatchEvent(new CustomEvent('sumanmusic-offline-updated', { detail: { songId, status: 'removed' } }));
    return true;
  } catch {
    return false;
  }
};

export const getOfflineAudioUrl = async (songId) => {
  if (!songId || typeof window === 'undefined' || !('caches' in window)) return null;
  try {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(`/offline-track/${songId}`);
    if (cachedResponse) {
      const blob = await cachedResponse.blob();
      return URL.createObjectURL(blob);
    }
  } catch {}
  return null;
};
