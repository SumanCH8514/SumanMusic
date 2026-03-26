import { apiFetch } from '../lib/api';


const LRCLIB_BASE_URL = 'https://lrclib.net/api';
const LYRICS_OVH_BASE_URL = 'https://api.lyrics.ovh/v1';



const cleanArtist = (artist) => {
  if (!artist || artist === "Unknown Artist") return "";
  return artist
    .split(/\s*,\s*|\s*&\s*|\s+and\s+|\s+x\s+/i)[0]
    .replace(/\s*(?:feat|ft)\.?.*$/i, "")
    .trim();
};


const getLyricsScore = (synced, plain) => {
  const text = synced || plain || '';
  if (!text) return -1000;

  let score = 0;
  if (synced) score += 500;
  if (/[\u0900-\u097F]/.test(text)) {
    score -= 200;
  } else {
    // Bonus for common English words if it's Latin script
    const commonEnglishWords = /\b(the|and|you|is|it|in|to|of|that|this|with|for|was|are|on|be|at)\b/gi;
    const matches = text.match(commonEnglishWords);
    if (matches) score += matches.length * 10;
  }

  return score;
};


const cleanTitle = (title) => {
  if (!title) return '';
  return title
    .replace(/\s*\(?(?:official|music|video|audio|lyrics|hd|40k|explicit|edit|radio|club|remix|version|mix|karaoke|instrumental)\)?/gi, '')
    .replace(/\s*\[(?:official|music|video|audio|lyrics|hd|4k|explicit|edit|radio|club|remix|version|mix|karaoke|instrumental)\]/gi, '')
    .replace(/\s*\(?\s*(?:feat|ft)\.?\s+[^)]+\)?/gi, '')
    .replace(/\s*\[\s*(?:feat|ft)\.?\s+[^\]]+\]/gi, '')
    .replace(/\s*[-(].*?(?:remix|version|edit|mix|track|ost).*?[)]?/gi, '')
    .replace(/\s*\(.*?\)/g, '')
    .trim();
};


const fetchLyricsLrcLibSearch = async (artist, title) => {
  try {
    const query = encodeURIComponent(`${cleanArtist(artist)} ${cleanTitle(title)}`);
    const response = await apiFetch(`${LRCLIB_BASE_URL}/search?q=${query}`);
    if (!response.ok) return null;
    const data = await response.json();
    
    if (data && data.length > 0) {
      const sortedResults = [...data].sort((a, b) => {
        const scoreA = getLyricsScore(a.syncedLyrics, a.plainLyrics);
        const scoreB = getLyricsScore(b.syncedLyrics, b.plainLyrics);
        return scoreB - scoreA;
      });

      const result = sortedResults[0];
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


const fetchLyricsOvh = async (artist, title) => {
  try {
    const primaryArtist = cleanArtist(artist);
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

export const fetchLyrics = async (artist, title, album = '', duration = 0) => {
  const metaVariants = [
    { a: artist, t: title, alb: album },
    { a: artist, t: title, alb: '' },
    { a: cleanArtist(artist), t: cleanTitle(title), alb: album },
    { a: cleanArtist(artist), t: cleanTitle(title), alb: '' }
  ];


  for (const variant of metaVariants) {
    try {
      const params = new URLSearchParams({
        track_name: variant.t,
        artist_name: variant.a,
      });

      if (variant.alb) params.append('album_name', variant.alb);
      if (duration) params.append('duration', Math.round(duration));

      const response = await apiFetch(`${LRCLIB_BASE_URL}/get?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        if (data.syncedLyrics || data.plainLyrics) {
          return {
            syncedLyrics: data.syncedLyrics || '',
            plainLyrics: data.plainLyrics || ''
          };
        }
      }
    } catch (e) {
      console.warn("LRCLIB /get failed for variant:", variant, e);
    }
  }


  const searchResult = await fetchLyricsLrcLibSearch(artist, title);
  if (searchResult) return searchResult;


  try {
    const titleOnlyQuery = encodeURIComponent(cleanTitle(title));
    const response = await apiFetch(`${LRCLIB_BASE_URL}/search?q=${titleOnlyQuery}`);
    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        const sortedResults = [...data].sort((a, b) => {
          const scoreA = getLyricsScore(a.syncedLyrics, a.plainLyrics);
          const scoreB = getLyricsScore(b.syncedLyrics, b.plainLyrics);
          return scoreB - scoreA;
        });

        const result = sortedResults[0];
        return { syncedLyrics: result.syncedLyrics || '', plainLyrics: result.plainLyrics || '' };
      }
    }
  } catch (e) {
    console.warn("LRCLIB Title-only search failed:", e);
  }


  return await fetchLyricsOvh(artist, title);
};


export const parseLrc = (lrcString) => {
  if (!lrcString) return [];

  const lines = lrcString.split('\n');
  const result = [];
  const timeRegex = /\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;

  lines.forEach(line => {
    const text = line.replace(timeRegex, '').trim();
    if (!text) return;

    let match;
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
