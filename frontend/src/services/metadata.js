import { ENV } from '../config/env';

const CACHE_NAME = 'suman_meta_cache';
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000;

const memoryCache = new Map();

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
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith(CACHE_NAME))
      .forEach(k => localStorage.removeItem(k));
  } catch {}
};

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

const decodeHtml = (str = '') => {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
};

const isTitleMatch = (searchedTitle, candidateTrackName) => {
  if (!searchedTitle || !candidateTrackName) return false;
  const clean = (s) => (s || '').toLowerCase()
    .replace(/\s*\(.*?\)/g, '')
    .replace(/\s*\[.*?\]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
  const norm1 = clean(searchedTitle);
  const norm2 = clean(candidateTrackName);
  if (!norm1 || !norm2) return false;
  if (norm1 === norm2 || norm1.includes(norm2) || norm2.includes(norm1)) return true;
  return false;
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
    const response = await fetch(directUrl, { signal: AbortSignal.timeout(3000) });
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
      const response = await fetch(directUrl, { signal: AbortSignal.timeout(3000) });
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

const fetchFromJioSaavn = async (artist, title) => {
  const query = cleanQuery(artist, title);
  if (!query) return null;

  const endpoints = [
    `https://www.jiosaavn.com/api.php?__call=autocomplete.get&_format=json&_marker=0&cc=in&includeMetaTags=1&query=${encodeURIComponent(query)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://www.jiosaavn.com/api.php?__call=autocomplete.get&_format=json&_marker=0&cc=in&includeMetaTags=1&query=${encodeURIComponent(query)}`)}`
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const text = await res.text();
        let data = null;
        try {
          data = JSON.parse(text);
        } catch {
          const m = text.match(/\{[\s\S]*\}/);
          if (m) data = JSON.parse(m[0]);
        }
        const songs = data?.songs?.data || data?.songs;
        if (Array.isArray(songs) && songs.length > 0) {
          const matched = songs.find(r => isTitleMatch(title, r.title || r.song)) || songs[0];
          if (matched) {
            const rawImg = matched.image || '';
            const highResCover = rawImg ? rawImg.replace(/50x50/g, '500x500').replace(/150x150/g, '500x500') : null;
            return {
              title: decodeHtml(matched.title || matched.song),
              artist: decodeHtml(matched.more_info?.primary_artists || matched.more_info?.singers || artist),
              album: decodeHtml(matched.more_info?.album || null),
              cover: highResCover,
              thumbnail: highResCover,
              genre: 'Indian Music',
              year: matched.more_info?.year ? parseInt(matched.more_info.year, 10) : null,
              provider: 'JioSaavn'
            };
          }
        }
      }
    } catch {}
  }

  return null;
};

const fetchFromLastFM = async (artist, title) => {
  const apiKey = ENV.LASTFM?.API_KEY;
  if (!apiKey || !title) return null;

  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=${apiKey}&artist=${encodeURIComponent(artist || '')}&track=${encodeURIComponent(title)}&format=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      if (data?.track) {
        const track = data.track;
        const images = track.album?.image;
        let cover = null;
        if (Array.isArray(images) && images.length > 0) {
          cover = images[images.length - 1]?.['#text'] || images[0]?.['#text'];
        }
        if (cover && cover.includes('2a96cbd8b46e442fc41c2b86b821562f')) {
          cover = null;
        }

        return {
          title: decodeHtml(track.name || title),
          artist: decodeHtml(track.artist?.name || artist),
          album: decodeHtml(track.album?.title || null),
          cover: cover || null,
          thumbnail: cover || null,
          genre: track.toptags?.tag?.[0]?.name || 'Music',
          year: null,
          provider: 'Last.fm'
        };
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
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
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

const fetchFromBackendWorker = async (artist, title, provider = 'auto', fallback = true) => {
  try {
    const url = `${ENV.BACKEND_URL}/api/metadata?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}&provider=${encodeURIComponent(provider)}&fallback=${fallback}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(3500) });
    if (response.ok) {
      const data = await response.json();
      if (data && (data.cover || data.title)) {
        return data;
      }
    }
  } catch {}
  return null;
};

export const fetchExternalMetadata = async (artist, title, options = {}) => {
  if (!title) return null;

  const safeArtist = artist || "Unknown Artist";
  const provider = (options.provider || activeProvider || 'auto').toLowerCase();
  const fallback = options.fallback !== undefined ? options.fallback : activeFallback;

  const cacheKey = `${provider}_${fallback ? 'fb' : 'nofb'}_${safeArtist}_${title}`.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const cached = getCachedMetadata(cacheKey);
  if (cached) {
    if (cached._notFound) return null;
    return cached;
  }

  const clientDispatch = {
    apple: () => fetchFromITunes(safeArtist, title),
    jiosaavn: () => fetchFromJioSaavn(safeArtist, title),
    lastfm: () => fetchFromLastFM(safeArtist, title),
    deezer: () => fetchFromDeezer(safeArtist, title)
  };

  let metadata = null;

  if (provider !== 'auto' && clientDispatch[provider]) {
    metadata = await clientDispatch[provider]();
    if (metadata && (metadata.cover || metadata.title)) {
      setCachedMetadata(cacheKey, metadata);
      return metadata;
    }
    if (!fallback) {
      setCachedMetadata(cacheKey, { _notFound: true });
      return null;
    }
  }

  metadata = await fetchFromBackendWorker(safeArtist, title, provider, fallback);

  if (!metadata && fallback) {
    const fallbackOrder = ['apple', 'jiosaavn', 'lastfm', 'deezer'].filter(p => p !== provider);
    for (const key of fallbackOrder) {
      const fetcher = clientDispatch[key];
      if (fetcher) {
        metadata = await fetcher();
        if (metadata && (metadata.cover || metadata.title)) {
          break;
        }
      }
    }
  }

  if (metadata) {
    setCachedMetadata(cacheKey, metadata);
    return metadata;
  }

  setCachedMetadata(cacheKey, { _notFound: true });
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
