import { ENV } from '../config/env';
import { redisGet, redisSet } from './redis';

const LYRICSPLUS_BASE_URL = 'https://lyricsplus.binimum.org/v2/lyrics';
const LRC_RED_BASE_URL = 'https://lrc.red';
const LRCLIB_BASE_URL = 'https://lrclib.net/api';
const LYRICS_OVH_BASE_URL = 'https://api.lyrics.ovh/v1';

const cleanArtist = (artist) => {
  if (!artist || artist === "Unknown Artist") return "";
  return artist
    .split(/\s*,\s*|\s*&\s*|\s+and\s+|\s+x\s+/i)[0]
    .replace(/\s*(?:feat|ft)\.?.*$/i, "")
    .trim();
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

const getLyricsScore = (synced, plain) => {
  const text = synced || plain || '';
  if (!text) return -1000;
  let score = 0;
  if (synced) score += 500;
  return score;
};

export const interpolateLineWords = (text, lineTime, lineDuration) => {
  if (!text) return [];
  const rawWords = text.trim().split(/\s+/).filter(Boolean);
  if (rawWords.length === 0) return [];

  const totalChars = rawWords.reduce((acc, w) => acc + Math.max(1, w.length), 0);
  const duration = Math.max(1.5, lineDuration || 4.0);

  let currentOffset = lineTime;
  return rawWords.map((word, i) => {
    const isLast = i === rawWords.length - 1;
    const weight = Math.max(1, word.length) / totalChars;
    const wordDur = Number((weight * duration).toFixed(3));
    const wordObj = {
      text: word + (isLast ? '' : ' '),
      time: Number(currentOffset.toFixed(3)),
      duration: wordDur
    };
    currentOffset += wordDur;
    return wordObj;
  });
};

export const ensureLineWords = (lines) => {
  if (!Array.isArray(lines) || lines.length === 0) return [];
  const nonCountdowns = lines.filter((l) => !l.isCountdown);
  if (nonCountdowns.length === 0) return [];
  const sorted = [...nonCountdowns].sort((a, b) => a.time - b.time);

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    if (Array.isArray(current.words) && current.words.length > 0) {
      const lastWord = current.words[current.words.length - 1];
      const wordsEnd = (lastWord && typeof lastWord.time === 'number')
        ? (lastWord.time + (lastWord.duration || 0.35))
        : current.time;
      current.duration = Math.max(0.5, Number((wordsEnd - current.time).toFixed(3)));
    } else {
      const wordCount = (current.text || '').trim().split(/\s+/).filter(Boolean).length || 4;
      const naturalDuration = Math.max(1.8, Number((wordCount * 0.45).toFixed(3)));
      if (next) {
        const timeUntilNext = next.time - current.time;
        if (timeUntilNext <= 5.0) {
          current.duration = Math.max(0.5, Number(Math.min(timeUntilNext, Math.max(naturalDuration, timeUntilNext - 0.35)).toFixed(3)));
        } else {
          current.duration = Math.max(0.5, Number(Math.min(timeUntilNext - 2.5, naturalDuration).toFixed(3)));
        }
      } else {
        current.duration = naturalDuration;
      }
      current.words = interpolateLineWords(current.text, current.time, current.duration);
    }
  }

  const withCountdowns = [];

  if (sorted.length > 0 && sorted[0].time >= 5.0) {
    withCountdowns.push({
      time: 0,
      duration: sorted[0].time,
      text: '',
      words: [],
      isCountdown: true
    });
  }

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    withCountdowns.push(current);
    const next = sorted[i + 1];
    if (next) {
      const lineEnd = current.time + (current.duration || 0);
      const gap = next.time - lineEnd;
      if (gap >= 5.0) {
        withCountdowns.push({
          time: Number(lineEnd.toFixed(3)),
          duration: Number(gap.toFixed(3)),
          text: '',
          words: [],
          isCountdown: true
        });
      }
    }
  }

  return withCountdowns;
};

export const parseLrc = (lrcString) => {
  if (!lrcString) return [];
  const lines = lrcString.split('\n');
  const result = [];
  const timeRegex = /\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;

  lines.forEach((line) => {
    const text = line.replace(timeRegex, '').trim();
    if (!text) return;
    timeRegex.lastIndex = 0;
    let match;
    while ((match = timeRegex.exec(line)) !== null) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const ms = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0;
      result.push({
        time: minutes * 60 + seconds + ms / 1000,
        text
      });
    }
  });

  return ensureLineWords(result);
};

const fetchLyricsPlusClient = async (artist, title, duration = 0) => {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const cArtist = cleanArtist(artist);
    const cTitle = cleanTitle(title);
    const params = new URLSearchParams({ title: cTitle, artist: cArtist });
    if (duration > 0) params.append('duration', Math.round(duration));

    const response = await fetch(`${LYRICSPLUS_BASE_URL}/get?${params.toString()}`, { signal: controller.signal });
    clearTimeout(timer);

    if (!response.ok) return null;
    const data = await response.json();
    if (!data || !Array.isArray(data.lyrics) || data.lyrics.length === 0) return null;

    const isWord = data.type === 'Word';
    const lines = data.lyrics.map((l) => ({
      time: Number((l.time / 1000).toFixed(3)),
      duration: l.duration ? Number((l.duration / 1000).toFixed(3)) : 0,
      text: l.text || '',
      words: Array.isArray(l.syllabus) ? l.syllabus.map((s) => ({
        time: Number((s.time / 1000).toFixed(3)),
        duration: Number((s.duration / 1000).toFixed(3)),
        text: s.text || ''
      })) : []
    }));

    return {
      type: isWord ? 'word' : 'line',
      source: 'binilyrics',
      lines,
      syncedLyrics: lines.map((l) => `[${l.time}] ${l.text}`).join('\n'),
      plainLyrics: lines.map((l) => l.text).join('\n')
    };
  } catch {
    return null;
  }
};

export const parseEnhancedLrc = (lrcString) => {
  if (!lrcString) return [];
  const lines = lrcString.split('\n');
  const result = [];
  const lineTimeRegex = /\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;
  const wordTagRegex = /<(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?>/g;

  for (const rawLine of lines) {
    if (!rawLine.trim()) continue;
    lineTimeRegex.lastIndex = 0;
    const timeMatch = lineTimeRegex.exec(rawLine);
    if (!timeMatch) continue;

    const min = parseInt(timeMatch[1], 10);
    const sec = parseInt(timeMatch[2], 10);
    const ms = timeMatch[3] ? parseInt(timeMatch[3].padEnd(3, '0'), 10) : 0;
    const lineTime = min * 60 + sec + ms / 1000;

    const content = rawLine.replace(/\[\d{1,2}:\d{1,2}(?:[.:]\d{1,3})?\]/g, '').trim();
    if (!content) continue;

    const cleanLineText = content.replace(/<\d{1,2}:\d{1,2}(?:[.:]\d{1,3})?>/g, '').trim();
    if (!cleanLineText) continue;

    const wordMarkers = [];
    wordTagRegex.lastIndex = 0;
    let wm;
    while ((wm = wordTagRegex.exec(content)) !== null) {
      const wMin = parseInt(wm[1], 10);
      const wSec = parseInt(wm[2], 10);
      const wMs = wm[3] ? parseInt(wm[3].padEnd(3, '0'), 10) : 0;
      wordMarkers.push({
        time: wMin * 60 + wSec + wMs / 1000,
        index: wm.index,
        tagLength: wm[0].length
      });
    }

    const words = [];
    if (wordMarkers.length > 0) {
      for (let i = 0; i < wordMarkers.length; i++) {
        const currM = wordMarkers[i];
        const nextM = wordMarkers[i + 1];
        const textSlice = content.slice(
          currM.index + currM.tagLength,
          nextM ? nextM.index : undefined
        );
        const wordText = textSlice.replace(/<[^>]+>/g, '').trim();
        if (wordText) {
          const duration = nextM
            ? Math.max(0.08, Number((nextM.time - currM.time).toFixed(3)))
            : 0.35;
          words.push({
            text: wordText + (i === wordMarkers.length - 1 ? '' : ' '),
            time: Number(currM.time.toFixed(3)),
            duration
          });
        }
      }
    }

    result.push({
      time: lineTime,
      text: cleanLineText,
      words
    });
  }

  return ensureLineWords(result);
};

const fetchLyricsLrcRedClient = async (artist, title) => {
  try {
    const cArtist = cleanArtist(artist);
    const cTitle = cleanTitle(title);
    const matchUrl = `${LRC_RED_BASE_URL}/match.json?title=${encodeURIComponent(cTitle)}&artist=${encodeURIComponent(cArtist)}`;
    const matchRes = await fetch(matchUrl);
    let hit = null;
    if (matchRes.ok) {
      const matchData = await matchRes.json();
      if (Array.isArray(matchData.hits) && matchData.hits.length > 0) {
        hit = matchData.hits[0];
      }
    }

    if (!hit) {
      const searchUrl = `${LRC_RED_BASE_URL}/search.json?q=${encodeURIComponent(`${cArtist} ${cTitle}`)}`;
      const searchRes = await fetch(searchUrl);
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (Array.isArray(searchData.hits) && searchData.hits.length > 0) {
          hit = searchData.hits[0];
        }
      }
    }

    if (hit && hit.isrc) {
      const lrcRes = await fetch(`${LRC_RED_BASE_URL}/s/${hit.isrc}.lrc`);
      if (lrcRes.ok) {
        const lrcText = await lrcRes.text();
        const lines = parseEnhancedLrc(lrcText);
        if (lines.length > 0) {
          const hasWords = lines.some((l) => l.words && l.words.length > 0);
          return {
            type: hasWords ? 'word' : 'line',
            source: 'lrcred',
            lines,
            syncedLyrics: lrcText,
            plainLyrics: lines.map((l) => l.text).join('\n')
          };
        }
      }
    }
    return null;
  } catch {
    return null;
  }
};

const fetchLyricsLrcLibSearch = async (artist, title) => {
  try {
    const query = encodeURIComponent(`${cleanArtist(artist)} ${cleanTitle(title)}`);
    const response = await fetch(`${LRCLIB_BASE_URL}/search?q=${query}`);
    if (!response.ok) return null;
    const data = await response.json();
    if (data && data.length > 0) {
      const sortedResults = [...data].sort((a, b) => {
        const scoreA = getLyricsScore(a.syncedLyrics, a.plainLyrics);
        const scoreB = getLyricsScore(b.syncedLyrics, b.plainLyrics);
        return scoreB - scoreA;
      });
      const result = sortedResults[0];
      const parsedLines = parseLrc(result.syncedLyrics);
      return {
        type: parsedLines.length > 0 ? 'line' : 'plain',
        source: 'lrclib',
        lines: parsedLines,
        syncedLyrics: result.syncedLyrics || '',
        plainLyrics: result.plainLyrics || ''
      };
    }
    return null;
  } catch {
    return null;
  }
};

const fetchLyricsOvh = async (artist, title) => {
  try {
    const primaryArtist = cleanArtist(artist);
    const response = await fetch(`${LYRICS_OVH_BASE_URL}/${encodeURIComponent(primaryArtist)}/${encodeURIComponent(title)}`);
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.lyrics) return null;
    return {
      type: 'plain',
      source: 'ovh',
      lines: [{ time: 0, duration: 9999, text: data.lyrics, words: [] }],
      syncedLyrics: '',
      plainLyrics: data.lyrics || ''
    };
  } catch {
    return null;
  }
};

export const fetchLyrics = async (artist, title, album = '', duration = 0, source = 'auto', forceReload = false) => {
  if (!title) return null;
  const cacheKey = `lyrics_v2_${cleanArtist(artist)}_${cleanTitle(title)}_${source}`.toLowerCase().replace(/[^a-z0-9]/g, '_');

  if (!forceReload) {
    const cached = await redisGet(cacheKey);
    if (cached) {
      if (cached._notFound) return null;
      if (Array.isArray(cached.lines)) {
        cached.lines = ensureLineWords(cached.lines);
      }
      return cached;
    }
  }

  let lyricsData = null;

  try {
    const params = new URLSearchParams({
      artist: artist || '',
      title: title || '',
      album: album || '',
      duration: duration || 0,
      source: source || 'auto'
    });
    if (forceReload) params.append('reload', 'true');

    const response = await fetch(`${ENV.BACKEND_URL}/api/lyrics?${params.toString()}`);
    if (response.ok) {
      const data = await response.json();
      if (data && (Array.isArray(data.lines) && data.lines.length > 0 || data.plainLyrics)) {
        const rawLines = Array.isArray(data.lines) && data.lines.length > 0
          ? ensureLineWords(data.lines)
          : parseLrc(data.syncedLyrics || '');
        lyricsData = {
          type: data.type || (rawLines.some((l) => l.words?.length > 0) ? 'word' : 'line'),
          source: data.source || (data.type === 'word' ? 'binilyrics' : 'lrclib'),
          lines: rawLines,
          syncedLyrics: data.syncedLyrics || '',
          plainLyrics: data.plainLyrics || ''
        };
      }
    }
  } catch {}

  if (!lyricsData && (source === 'auto' || source === 'binilyrics')) {
    lyricsData = await fetchLyricsPlusClient(artist, title, duration);
  }

  if (!lyricsData && (source === 'auto' || source === 'lrcred')) {
    lyricsData = await fetchLyricsLrcRedClient(artist, title);
  }

  if (!lyricsData && (source === 'auto' || source === 'lrclib')) {
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

        const response = await fetch(`${LRCLIB_BASE_URL}/get?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          if (data.syncedLyrics || data.plainLyrics) {
            const parsedLines = parseLrc(data.syncedLyrics);
            lyricsData = {
              type: parsedLines.length > 0 ? 'line' : 'plain',
              source: 'lrclib',
              lines: parsedLines,
              syncedLyrics: data.syncedLyrics || '',
              plainLyrics: data.plainLyrics || ''
            };
            break;
          }
        }
      } catch {}
    }
  }

  if (!lyricsData && (source === 'auto' || source === 'lrclib')) {
    lyricsData = await fetchLyricsLrcLibSearch(artist, title);
  }

  if (!lyricsData && (source === 'auto' || source === 'ovh')) {
    lyricsData = await fetchLyricsOvh(artist, title);
  }

  await redisSet(cacheKey, lyricsData || { _notFound: true }, 7 * 86400);
  return lyricsData && !lyricsData._notFound ? lyricsData : null;
};

export const fetchTranslations = async (lines, target = 'en') => {
  if (!Array.isArray(lines) || lines.length === 0) return [];
  const textLines = lines.map((l) => (typeof l === 'string' ? l : l.text || ''));

  try {
    const response = await fetch(`${ENV.BACKEND_URL}/api/translate?target=${encodeURIComponent(target)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines: textLines })
    });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.translations)) {
        return data.translations;
      }
    }
  } catch {}

  try {
    const joined = textLines.join('\n');
    const gUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(joined)}`;
    const res = await fetch(gUrl);
    if (res.ok) {
      const data = await res.json();
      const translatedFull = Array.isArray(data[0]) ? data[0].map((x) => x[0]).join('') : '';
      const translatedLines = translatedFull.split('\n');
      return textLines.map((_, i) => translatedLines[i] || '');
    }
  } catch {}

  return textLines;
};

export const getSongLyricsOffset = (songId) => {
  if (!songId) return 0;
  try {
    const val = localStorage.getItem(`sm_lyrics_offset_${songId}`);
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
};

export const setSongLyricsOffset = (songId, offsetMs) => {
  if (!songId) return;
  try {
    localStorage.setItem(`sm_lyrics_offset_${songId}`, String(offsetMs));
  } catch {}
};
