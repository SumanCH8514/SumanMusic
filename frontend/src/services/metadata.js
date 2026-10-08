import { ENV } from '../config/env';

const CACHE_NAME = 'suman_meta_cache';
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000;

const memoryCache = new Map();

const getCachedMetadata = (key) => {
  if (memoryCache.has(key)) {
    return memoryCache.get(key);
  }
  try {
    const raw = localStorage.getItem(`${CACHE_NAME}_${key}`);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(`${CACHE_NAME}_${key}`);
      return null;
    }
    memoryCache.set(key, data);
    return data;
  } catch {
    return null;
  }
};

const setCachedMetadata = (key, data) => {
  if (!data) return;
  memoryCache.set(key, data);
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

const cleanQuery = (artist, title) => {
  let t = (title || '')
    .replace(/\s*\(.*?\)/g, '')
    .replace(/\s*\[.*?\]/g, '')
    .replace(/\s*[|\-–—].*$/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let a = (artist || '')
    .split(/\s*,\s*|\s*&\s*|\s+and\s+|\s+feat\.?\s+|\s+ft\.?\s+|\s+x\s+|\s+vs\.?\s+/i)[0]
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return `${a} ${t}`.trim() || `${t}`.trim() || `${title}`.trim();
};

const fetchFromITunes = async (artist, title) => {
  const query = cleanQuery(artist, title);
  if (!query) return null;

  try {
    const directUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`;
    const response = await fetch(directUrl);
    if (response.ok) {
      const data = await response.json();
      if (data && data.resultCount > 0) {
        const result = data.results[0];
        return {
          title: result.trackName,
          artist: result.artistName,
          album: result.collectionName,
          cover: result.artworkUrl100 ? result.artworkUrl100.replace("100x100bb", "600x600bb") : null,
          thumbnail: result.artworkUrl100 ? result.artworkUrl100.replace("100x100bb", "300x300bb") : null,
          genre: result.primaryGenreName,
          year: result.releaseDate ? new Date(result.releaseDate).getFullYear() : null,
          provider: 'AppleMusic'
        };
      }
    }
  } catch {}

  if (artist && title && artist !== "Unknown Artist") {
    try {
      const swappedQuery = cleanQuery(title, artist);
      const directUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(swappedQuery)}&entity=song&limit=1`;
      const response = await fetch(directUrl);
      if (response.ok) {
        const data = await response.json();
        if (data && data.resultCount > 0) {
          const result = data.results[0];
          return {
            title: result.trackName,
            artist: result.artistName,
            album: result.collectionName,
            cover: result.artworkUrl100 ? result.artworkUrl100.replace("100x100bb", "600x600bb") : null,
            thumbnail: result.artworkUrl100 ? result.artworkUrl100.replace("100x100bb", "300x300bb") : null,
            genre: result.primaryGenreName,
            year: result.releaseDate ? new Date(result.releaseDate).getFullYear() : null,
            provider: 'AppleMusic'
          };
        }
      }
    } catch {}
  }

  return null;
};

const fetchFromBackendWorker = async (artist, title) => {
  try {
    const url = `${ENV.BACKEND_URL}/api/metadata?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}`;
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      if (data && (data.cover || data.title)) {
        return data;
      }
    }
  } catch {}
  return null;
};

const fetchFromDeezer = async (artist, title) => {
  const query = cleanQuery(artist, title);
  if (!query) return null;

  try {
    const url = `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=1`)}`;
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      if (data && data.data && data.data.length > 0) {
        const result = data.data[0];
        return {
          title: result.title,
          artist: result.artist?.name,
          album: result.album?.title,
          cover: result.album?.cover_xl || result.album?.cover_big || result.album?.cover_medium,
          thumbnail: result.album?.cover_medium || result.album?.cover_small,
          genre: 'Music',
          year: null,
          provider: 'Deezer'
        };
      }
    }
  } catch {}
  return null;
};

export const fetchExternalMetadata = async (artist, title) => {
  if (!title) return null;

  const safeArtist = artist || "Unknown Artist";
  const key = `${safeArtist}_${title}`.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const cached = getCachedMetadata(key);
  if (cached) {
    if (cached._notFound) return null;
    return cached;
  }

  let metadata = await fetchFromITunes(safeArtist, title);

  if (!metadata) {
    metadata = await fetchFromBackendWorker(safeArtist, title);
  }

  if (!metadata) {
    metadata = await fetchFromDeezer(safeArtist, title);
  }

  if (metadata) {
    setCachedMetadata(key, metadata);
    return metadata;
  }

  setCachedMetadata(key, { _notFound: true });
  return null;
};

export const fetchBatchMetadata = async (songs = [], concurrency = 4, onSongEnriched = null) => {
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
