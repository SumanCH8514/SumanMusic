/**
 * Lyrics Service
 * Fetches synced and plain lyrics from LRCLIB API
 */

const LRCLIB_BASE_URL = 'https://lrclib.net/api';
const LYRICS_OVH_BASE_URL = 'https://api.lyrics.ovh/v1';

/**
 * Extracts the primary artist name from a potentially multi-artist string
 * @param {string} artist - Artist string (e.g., "Artist A, Artist B & Artist C")
 * @returns {string} - Primary artist name
 */
const getPrimaryArtist = (artist) => {
  if (!artist) return '';
  return artist.split(/\s*,\s*|\s*&\s*|\s+and\s+/i)[0].trim();
};

/**
 * Fetches lyrics from LRCLIB search endpoint (Fuzzy Match)
 * @param {string} artist 
 * @param {string} title 
 * @returns {Promise<{syncedLyrics: string, plainLyrics: string} | null>}
 */
const fetchLyricsLrcLibSearch = async (artist, title) => {
  try {
    const query = encodeURIComponent(`${getPrimaryArtist(artist)} ${title}`);
    const response = await apiFetch(`${LRCLIB_BASE_URL}/search?q=${query}`);
    if (!response.ok) return null;
    const data = await response.json();
    
    if (data && data.length > 0) {
      const result = data.find(r => r.syncedLyrics || r.plainLyrics) || data[0];
      return {
        syncedLyrics: result.syncedLyrics || '',
        plainLyrics: result.plainLyrics || ''
      };
    }
    return null;
  } catch (error) {
    console.warn("LRCLIB Search fallback failed:", error);
    return null;
  }
};

/**
 * Fetches lyrics from secondary source (Lyrics.ovh)
 * @param {string} artist 
 * @param {string} title 
 * @returns {Promise<{syncedLyrics: string, plainLyrics: string} | null>}
 */
const fetchLyricsOvh = async (artist, title) => {
  try {
    const primaryArtist = getPrimaryArtist(artist);
    const response = await apiFetch(`${LYRICS_OVH_BASE_URL}/${encodeURIComponent(primaryArtist)}/${encodeURIComponent(title)}`);
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.lyrics) return null;
    return {
      syncedLyrics: '',
      plainLyrics: data.lyrics || ''
    };
  } catch (error) {
    console.warn("Lyrics.ovh fallback failed:", error);
    return null;
  }
};

/**
 */
import { apiFetch } from '../lib/api';

export const fetchLyrics = async (artist, title, album = '', duration = 0) => {
  const maxRetries = 1;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      const params = new URLSearchParams({
        track_name: title,
        artist_name: artist,
      });

      if (album) params.append('album_name', album);
      if (duration) params.append('duration', Math.round(duration));

      const response = await apiFetch(`${LRCLIB_BASE_URL}/get?${params.toString()}`);

      if (!response.ok) {
        if (response.status === 404) {
          const searchResult = await fetchLyricsLrcLibSearch(artist, title);
          if (searchResult) return searchResult;
          return await fetchLyricsOvh(artist, title);
        }
        throw new Error(`Lyrics API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.syncedLyrics && !data.plainLyrics) {
        const searchResult = await fetchLyricsLrcLibSearch(artist, title);
        if (searchResult) return searchResult;
        return await fetchLyricsOvh(artist, title);
      }

      return {
        syncedLyrics: data.syncedLyrics || '',
        plainLyrics: data.plainLyrics || ''
      };
    } catch (error) {
      attempt++;
      if (attempt > maxRetries) {
        const searchResult = await fetchLyricsLrcLibSearch(artist, title);
        if (searchResult) return searchResult;
        return await fetchLyricsOvh(artist, title);
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  return null;
};

/**
 * Parses LRC format into an array of objects
 * @param {string} lrcString - The LRC format string
 * @returns {Array<{time: number, text: string}>}
 */
export const parseLrc = (lrcString) => {
  if (!lrcString) return [];

  const lines = lrcString.split('\n');
  const result = [];
  // Supports formats: [mm:ss.xx], [mm:ss:xx], [mm:ss]
  const timeRegex = /\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;

  lines.forEach(line => {
    const text = line.replace(timeRegex, '').trim();
    if (!text) return;

    let match;
    // Reset regex index for multiple matches on the same line
    timeRegex.lastIndex = 0;
    
    while ((match = timeRegex.exec(line)) !== null) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const ms = match[3] ? parseInt(match[3].padEnd(3, '0')) : 0;
      
      result.push({
        time: minutes * 60 + seconds + ms / 1000,
        text
      });
    }
  });

  return result.sort((a, b) => a.time - b.time);
};
