import { redisGet, redisSet } from './redis.service.js';

let inMemoryToken = null;
let inMemoryTokenExpiresAt = 0;

export async function getSpotifyAccessToken(env = {}) {
  const clientId = env?.SPOTIFY_CLIENT_ID;
  const clientSecret = env?.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  const now = Date.now();
  if (inMemoryToken && now < inMemoryTokenExpiresAt) {
    return inMemoryToken;
  }

  const cacheKey = 'spotify_app_token_v1';
  try {
    const cached = await redisGet(env, cacheKey);
    if (cached && typeof cached === 'string') {
      inMemoryToken = cached;
      inMemoryTokenExpiresAt = now + 1800 * 1000;
      return cached;
    }
  } catch {}

  try {
    const credentials = btoa(`${clientId}:${clientSecret}`);
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.access_token) {
        const token = data.access_token;
        const expiresIn = data.expires_in || 3600;
        inMemoryToken = token;
        inMemoryTokenExpiresAt = now + Math.max(300, expiresIn - 300) * 1000;
        try {
          await redisSet(env, cacheKey, token, Math.max(300, expiresIn - 300));
        } catch {}
        return token;
      }
    }
  } catch {}

  return null;
}

function cleanString(str = '') {
  return str
    .replace(/\s*\(.*?\)/g, '')
    .replace(/\s*\[.*?\]/g, '')
    .replace(/\s*[|\-–—].*$/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isTitleMatch(searchedTitle, candidateTrackName) {
  if (!searchedTitle || !candidateTrackName) return false;

  const clean = (s) => (s || '').toLowerCase()
    .replace(/\s*\(.*?\)/g, '')
    .replace(/\s*\[.*?\]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();

  const norm1 = clean(searchedTitle);
  const norm2 = clean(candidateTrackName);

  if (!norm1 || !norm2) return false;
  if (norm1 === norm2) return true;
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;

  const words1 = (searchedTitle || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
  const words2 = (candidateTrackName || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);

  if (words1.length > 0 && words2.length > 0) {
    const overlap = words1.filter(w => words2.includes(w));
    if (overlap.length >= 1) return true;
  }

  return false;
}

export async function fetchTrackFromSpotify(artist, title, env = {}) {
  const token = await getSpotifyAccessToken(env);
  if (!token || !title) return null;

  const cleanT = cleanString(title);
  const cleanA = cleanString(artist).split(/\s+/)[0] || '';

  const queries = [
    cleanA ? `track:${cleanT} artist:${cleanA}` : `track:${cleanT}`,
    `${cleanA} ${cleanT}`.trim(),
    cleanT
  ].filter(Boolean);

  for (const q of queries) {
    try {
      const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=5`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        const items = data?.tracks?.items;
        if (Array.isArray(items) && items.length > 0) {
          const matched = items.find(item => isTitleMatch(title, item.name)) || items[0];
          if (matched) {
            const images = matched.album?.images || [];
            const highRes = images[0]?.url || null;
            const medRes = images[1]?.url || highRes;

            return {
              title: matched.name,
              artist: matched.artists?.map(a => a.name).join(', ') || artist,
              album: matched.album?.name || null,
              cover: highRes,
              thumbnail: medRes,
              genre: null,
              year: matched.album?.release_date ? parseInt(matched.album.release_date.slice(0, 4), 10) : null,
              duration: matched.duration_ms ? Math.round(matched.duration_ms / 1000) : null,
              spotifyId: matched.id,
              spotifyUri: matched.uri,
              spotifyUrl: matched.external_urls?.spotify || null,
              popularity: matched.popularity ?? null,
              provider: 'Spotify'
            };
          }
        }
      }
    } catch {}
  }

  return null;
}

export async function fetchArtistImageFromSpotify(artist, env = {}) {
  const token = await getSpotifyAccessToken(env);
  if (!token || !artist) return null;

  const cleanA = cleanString(artist);
  if (!cleanA) return null;

  try {
    const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(cleanA)}&type=artist&limit=5`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      const data = await res.json();
      const items = data?.artists?.items;
      if (Array.isArray(items) && items.length > 0) {
        const normTarget = cleanA.toLowerCase().replace(/[^a-z0-9]/g, '');
        const matched = items.find(a => {
          const normName = (a.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          return normTarget === normName || normName.includes(normTarget) || normTarget.includes(normName);
        }) || items[0];

        if (matched?.images?.[0]?.url) {
          return matched.images[0].url;
        }
      }
    }
  } catch {}

  return null;
}

export async function searchSpotify(query, type = 'track', limit = 10, env = {}) {
  const token = await getSpotifyAccessToken(env);
  if (!token || !query) {
    return { results: [], error: !token ? 'Spotify credentials not configured' : 'Query empty' };
  }

  try {
    const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${encodeURIComponent(type)}&limit=${limit}`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      const data = await res.json();
      return { results: data, error: null };
    }
  } catch (err) {
    return { results: [], error: err.message };
  }

  return { results: [], error: 'Failed to search Spotify' };
}
