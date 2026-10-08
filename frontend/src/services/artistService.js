import { redisGet, redisSet } from './redis';
import { ENV } from '../config/env';

const CACHE_PREFIX = 'artist_img_v3';
const CACHE_TTL_SECONDS = 14 * 24 * 60 * 60; // 14 days

// In-Memory Fast Caches & Request Deduplication
const memoryCache = new Map();
const inFlightRequests = new Map();
const claimedImageUrls = new Map(); // Tracks imageUrl -> artistKey to prevent duplicate photos

// Blacklisted generic / placeholder image patterns
const GENERIC_IMAGE_URLS = [
  'photo-1470225620780-dba8ba36b745',
  'placeholder',
  'default-cover',
  'default_avatar',
  'default_artist',
  'default_album',
  'empty_cover',
  'no-image',
  'spacer.gif',
  '1x1.png',
  'data:image',
];

// Junk artist names / noise patterns
const JUNK_ARTIST_NAMES = [
  /^\(?version\s*\d+\)?$/i,
  /^\(?official(\s*video|\s*audio|\s*music)?\)?$/i,
  /^\(?remix\)?$/i,
  /^\(?slowed\+reverb\)?$/i,
  /^\(?instrumental\)?$/i,
  /^unknown(\s*artist)?$/i,
  /^\(?audio\)?$/i,
  /^\(?video\)?$/i,
  /^\(?prod\.?\s*by\b/i,
  /^\(?ft\.?\s*[\w\s]+\)?$/i,
  /^\(?feat\.?\s*[\w\s]+\)?$/i,
];

/**
 * Validates if an artist name is legitimate
 */
export const isValidArtistName = (name) => {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 50) return false;
  return !JUNK_ARTIST_NAMES.some(regex => regex.test(trimmed));
};

export const cleanArtistName = (name) => {
  if (!name) return '';
  return name
    .replace(/^[([{]/, '')
    .replace(/[)\]}]$/, '')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Normalizes artist name to a unique slug
 */
export const getArtistSlug = (name) => {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
};

/**
 * Strict verification that returned API entity matches our target artist name
 */
export const isNameMatch = (targetName, returnedName) => {
  if (!targetName || !returnedName) return false;
  const normTarget = targetName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normReturned = returnedName.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!normTarget || !normReturned) return false;
  
  // Exact match
  if (normTarget === normReturned) return true;
  
  // Strong substring match (>= 65% overlap)
  if (normTarget.length >= 4 && (normReturned.includes(normTarget) || normTarget.includes(normReturned))) {
    const minLen = Math.min(normTarget.length, normReturned.length);
    const maxLen = Math.max(normTarget.length, normReturned.length);
    return (minLen / maxLen) > 0.65;
  }
  
  return false;
};

/**
 * Checks if a URL is a generic placeholder
 */
export const isGenericImage = (url) => {
  if (!url || typeof url !== 'string' || url.length < 10) return true;
  return GENERIC_IMAGE_URLS.some(generic => url.includes(generic));
};

/**
 * Validates and claims an image URL for an artist to avoid duplicate photos
 */
const claimImageUrl = (url, artistSlug) => {
  if (!url || isGenericImage(url)) return null;

  const existingOwner = claimedImageUrls.get(url);
  if (existingOwner && existingOwner !== artistSlug) {
    // Another artist already claimed this exact image! Avoid duplicate.
    return null;
  }

  claimedImageUrls.set(url, artistSlug);
  return url;
};

// ── Multi-Provider Fetchers with Strict Name Matching ────────────────────────

/**
 * Provider 1: SumanMusic Backend Worker & JioSaavn Edge Resolver
 */
const fetchFromBackend = async (artistName, artistSlug) => {
  try {
    const backendUrl = `${ENV.BACKEND_URL}/api/artist-image?artist=${encodeURIComponent(artistName)}`;
    const res = await fetch(backendUrl, { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const data = await res.json();
      if (data?.imageUrl) {
        return claimImageUrl(data.imageUrl, artistSlug);
      }
    }
  } catch {
    // Fallback
  }
  return null;
};

const fetchFromTheAudioDB = async (artistName, artistSlug) => {
  try {
    const res = await fetch(
      `https://www.theaudiodb.com/api/v1/json/2/search.php?s=${encodeURIComponent(artistName)}`,
      { signal: AbortSignal.timeout(2500) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data?.artists) && data.artists.length > 0) {
      const matched = data.artists.find(a => isNameMatch(artistName, a.strArtist));
      if (!matched) return null;
      const img = matched.strArtistThumb || matched.strArtistCutout || matched.strArtistFanart || null;
      return claimImageUrl(img, artistSlug);
    }
  } catch {
    // Ignore network failure
  }
  return null;
};

/**
 * Provider 4: Wikipedia / Wikimedia API (with Strict Name Match)
 */
const fetchFromWikipedia = async (artistName, artistSlug) => {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(artistName)}&prop=pageimages&format=json&pithumbsize=600&origin=*`;
    const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data?.query?.pages;
    if (pages) {
      const pageId = Object.keys(pages)[0];
      const page = pages[pageId];
      if (pageId && pageId !== '-1' && page?.thumbnail?.source) {
        if (page.title && !isNameMatch(artistName, page.title)) {
          return null; // Rejected mismatch
        }
        return claimImageUrl(page.thumbnail.source, artistSlug);
      }
    }
  } catch {
    // Ignore network failure
  }
  return null;
};

/**
 * Provider 5: Deezer API (with Strict Name Match)
 */
const fetchFromDeezer = async (artistName, artistSlug) => {
  try {
    const url = `https://api.deezer.com/search/artist?q=${encodeURIComponent(artistName)}&limit=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data?.data) && data.data.length > 0) {
      const matched = data.data.find(a => isNameMatch(artistName, a.name));
      if (!matched) return null;
      const img = matched.picture_xl || matched.picture_big || matched.picture_medium || null;
      return claimImageUrl(img, artistSlug);
    }
  } catch {
    // Ignore network failure
  }
  return null;
};

/**
 * Provider 6: Last.fm API (with Strict Name Match)
 */
const fetchFromLastFM = async (artistName, artistSlug) => {
  try {
    const apiKey = ENV.LASTFM?.API_KEY;
    if (!apiKey) return null;
    const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(artistName)}&api_key=${apiKey}&format=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.artist && isNameMatch(artistName, data.artist.name)) {
      const images = data.artist.image;
      if (Array.isArray(images) && images.length > 0) {
        const best = images[images.length - 1]?.['#text'] || images[0]?.['#text'];
        return claimImageUrl(best, artistSlug);
      }
    }
  } catch {
    // Ignore network failure
  }
  return null;
};

/**
 * Provider 7: YouTube Channel Avatar (with Strict Name Match)
 */
const fetchFromYouTube = async (artistName, artistSlug) => {
  const keys = ENV.YOUTUBE.API_KEYS;
  if (!keys || keys.length === 0) return null;
  const apiKey = keys[0];

  try {
    const url = `${ENV.YOUTUBE.BASE_URL}/search?part=snippet&type=channel&q=${encodeURIComponent(artistName)}&maxResults=1&key=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.items?.[0]?.snippet?.thumbnails) {
      const item = data.items[0];
      const channelTitle = item.snippet.channelTitle || item.snippet.title;
      if (!isNameMatch(artistName, channelTitle)) {
        return null;
      }
      const thumbs = item.snippet.thumbnails;
      const best = thumbs.high?.url || thumbs.medium?.url || thumbs.default?.url || null;
      return claimImageUrl(best, artistSlug);
    }
  } catch {
    // Ignore network failure
  }
  return null;
};

/**
 * Synchronous multi-tier check (Memory + LocalStorage) for instantaneous 0ms rendering
 */
export const getCachedArtistImageSync = (artistName) => {
  const cleanName = cleanArtistName(artistName);
  if (!cleanName) return null;
  const slug = getArtistSlug(cleanName);

  // 1. Fast Memory Hit (0ms)
  if (memoryCache.has(slug)) {
    const val = memoryCache.get(slug);
    return val === '__not_found__' ? null : val;
  }

  // 2. Synchronous Web Storage Hit (0ms on fresh page reload)
  try {
    const raw = localStorage.getItem(`sm_cache_${CACHE_PREFIX}_${slug}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (!parsed.expiry || Date.now() < parsed.expiry)) {
        if (parsed.data && parsed.data !== '__not_found__') {
          memoryCache.set(slug, parsed.data);
          return parsed.data;
        }
      }
    }
  } catch (_) {}

  return null;
};

/**
 * High-performance, deduplicated, parallel artist image resolver
 */
export const fetchArtistImage = async (artistName, fallbackSongCover = null) => {
  const cleanName = cleanArtistName(artistName);
  if (!cleanName || !isValidArtistName(cleanName)) {
    return !isGenericImage(fallbackSongCover) ? fallbackSongCover : null;
  }

  const slug = getArtistSlug(cleanName);
  const cacheKey = `${CACHE_PREFIX}_${slug}`;

  // 1. Instant Synchronous Memory Cache
  if (memoryCache.has(slug)) {
    const memVal = memoryCache.get(slug);
    return memVal === '__not_found__' ? (!isGenericImage(fallbackSongCover) ? fallbackSongCover : null) : memVal;
  }

  // 2. In-Flight Request Deduplication (Avoid duplicate parallel queries for the same artist)
  if (inFlightRequests.has(slug)) {
    return await inFlightRequests.get(slug);
  }

  const task = (async () => {
    // Check L2/L3 Redis Cache
    try {
      const cached = await redisGet(cacheKey);
      if (cached) {
        memoryCache.set(slug, cached);
        if (cached === '__not_found__') {
          return !isGenericImage(fallbackSongCover) ? fallbackSongCover : null;
        }
        claimImageUrl(cached, slug);
        return cached;
      }
    } catch {
      // Ignore cache read error
    }

    let imageUrl = await fetchFromBackend(cleanName, slug);

    if (!imageUrl) {
      const secondaryProviders = [
        fetchFromTheAudioDB(cleanName, slug),
        fetchFromWikipedia(cleanName, slug),
        fetchFromDeezer(cleanName, slug),
        fetchFromLastFM(cleanName, slug),
        fetchFromYouTube(cleanName, slug),
      ];

      const results = await Promise.allSettled(secondaryProviders);
      imageUrl = results.find(r => r.status === 'fulfilled' && r.value)?.value;
    }

    if (!imageUrl && cleanName.includes('.')) {
      const noDots = cleanName.replace(/\./g, '').replace(/\s+/g, ' ').trim();
      imageUrl = await fetchFromBackend(noDots, slug) || await fetchFromWikipedia(noDots, slug);
    }

    // 6. Final verification & duplicate prevention
    const finalImage = imageUrl || (!isGenericImage(fallbackSongCover) ? claimImageUrl(fallbackSongCover, slug) : null);

    // 7. Store in Memory Cache & Redis Cache
    if (finalImage) {
      memoryCache.set(slug, finalImage);
      try {
        await redisSet(cacheKey, finalImage, CACHE_TTL_SECONDS);
      } catch (_) {}
    } else {
      memoryCache.set(slug, '__not_found__');
      try {
        await redisSet(cacheKey, '__not_found__', 86400 * 3);
      } catch (_) {}
    }

    return finalImage;
  })();

  inFlightRequests.set(slug, task);
  try {
    return await task;
  } finally {
    inFlightRequests.delete(slug);
  }
};

/**
 * Pre-warm artist images in background with throttled concurrency
 */
export const prefetchArtistImages = (artists = []) => {
  if (!Array.isArray(artists) || artists.length === 0) return;

  const validArtists = artists
    .map(a => typeof a === 'string' ? a : a?.name)
    .filter(name => isValidArtistName(name))
    .slice(0, 40);

  let index = 0;
  const runNext = () => {
    if (index >= validArtists.length) return;
    const name = validArtists[index++];
    fetchArtistImage(name).finally(() => {
      setTimeout(runNext, 50); // Throttled 50ms stagger
    });
  };

  // Run up to 3 concurrent prefetch workers
  runNext();
  runNext();
  runNext();
};
