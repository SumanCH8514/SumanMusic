const cleanArtist = (a) => (a || '').split(/\s*,\s*|\s*&\s*|\s+and\s+/i)[0].replace(/\s*(?:feat|ft)\.?.*$/i, "").trim();
const cleanTitle = (t) => (t || '').replace(/\s*\(.*?\)/g, '').replace(/\s*\[.*?\]/g, '').trim();

function formatMsToLrcTime(ms) {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = (totalSeconds % 60).toFixed(2);
  const minStr = String(minutes).padStart(2, '0');
  const secStr = String(seconds).padStart(5, '0');
  return `[${minStr}:${secStr}]`;
}

function interpolateLineWords(text, lineTime, lineDuration) {
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
}

function parseLrcToLines(lrcString) {
  if (!lrcString) return [];
  const lines = lrcString.split('\n');
  const result = [];
  const timeRegex = /\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;
  for (const line of lines) {
    const text = line.replace(timeRegex, '').trim();
    if (!text) continue;
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
  }
  const sorted = result.sort((a, b) => a.time - b.time);
  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    current.duration = next ? Math.max(0.5, Number((next.time - current.time).toFixed(3))) : 4.0;
    current.words = interpolateLineWords(current.text, current.time, current.duration);
  }
  return sorted;
}

function parseEnhancedLrc(lrcString) {
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

  const sorted = result.sort((a, b) => a.time - b.time);
  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    const nxt = sorted[i + 1];
    cur.duration = nxt ? Math.max(0.5, Number((nxt.time - cur.time).toFixed(3))) : 4.0;
    if (!Array.isArray(cur.words) || cur.words.length === 0) {
      cur.words = interpolateLineWords(cur.text, cur.time, cur.duration);
    }
  }
  return sorted;
}

async function fetchLyricsLrcRed(cArtist, cTitle) {
  try {
    const matchUrl = `https://lrc.red/match.json?title=${encodeURIComponent(cTitle)}&artist=${encodeURIComponent(cArtist)}`;
    const matchRes = await fetch(matchUrl);
    let hit = null;
    if (matchRes.ok) {
      const matchData = await matchRes.json();
      if (Array.isArray(matchData.hits) && matchData.hits.length > 0) {
        hit = matchData.hits[0];
      }
    }

    if (!hit) {
      const searchUrl = `https://lrc.red/search.json?q=${encodeURIComponent(`${cArtist} ${cTitle}`)}`;
      const searchRes = await fetch(searchUrl);
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (Array.isArray(searchData.hits) && searchData.hits.length > 0) {
          hit = searchData.hits[0];
        }
      }
    }

    if (hit && hit.isrc) {
      const lrcRes = await fetch(`https://lrc.red/s/${hit.isrc}.lrc`);
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
  } catch {}
  return null;
}

export async function fetchLyrics(artist, title, album, duration, source = 'auto') {
  const cArtist = cleanArtist(artist);
  const cTitle = cleanTitle(title);

  if (!cTitle) {
    return { type: 'plain', source: 'none', lines: [], syncedLyrics: '', plainLyrics: '' };
  }

  const shouldTryBini = source === 'auto' || source === 'binilyrics';
  const shouldTryLrcRed = source === 'auto' || source === 'lrcred';
  const shouldTryLrclib = source === 'auto' || source === 'lrclib';
  const shouldTryOvh = source === 'auto' || source === 'ovh';

  if (shouldTryBini) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const lpUrl = `https://lyricsplus.binimum.org/v2/lyrics/get?title=${encodeURIComponent(cTitle)}&artist=${encodeURIComponent(cArtist)}${duration > 0 ? `&duration=${Math.round(duration)}` : ''}`;
      const lpRes = await fetch(lpUrl, { signal: controller.signal });
      clearTimeout(timer);

      if (lpRes.ok) {
        const data = await lpRes.json();
        if (data && Array.isArray(data.lyrics) && data.lyrics.length > 0) {
          const isWord = data.type === 'Word';
          const lines = data.lyrics.map(l => ({
            time: Number((l.time / 1000).toFixed(3)),
            duration: l.duration ? Number((l.duration / 1000).toFixed(3)) : 0,
            text: l.text || '',
            words: Array.isArray(l.syllabus) ? l.syllabus.map(s => ({
              time: Number((s.time / 1000).toFixed(3)),
              duration: Number((s.duration / 1000).toFixed(3)),
              text: s.text || ''
            })) : []
          }));

          const syncedLyrics = lines.map(l => `${formatMsToLrcTime(l.time * 1000)} ${l.text}`).join('\n');
          const plainLyrics = lines.map(l => l.text).join('\n');

          return {
            type: isWord ? 'word' : 'line',
            source: 'binilyrics',
            lines,
            syncedLyrics,
            plainLyrics
          };
        }
      }
    } catch {}
  }

  if (shouldTryLrcRed) {
    const lrcRedData = await fetchLyricsLrcRed(cArtist, cTitle);
    if (lrcRedData) return lrcRedData;
  }

  if (shouldTryLrclib) {
    try {
      const params = new URLSearchParams({ track_name: cTitle, artist_name: cArtist });
      if (album) params.append('album_name', album);
      if (duration > 0) params.append('duration', Math.round(duration));

      const response = await fetch(`https://lrclib.net/api/get?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        if (data.syncedLyrics || data.plainLyrics) {
          const lines = parseLrcToLines(data.syncedLyrics);
          return {
            type: lines.length > 0 ? 'line' : 'plain',
            source: 'lrclib',
            lines,
            syncedLyrics: data.syncedLyrics || '',
            plainLyrics: data.plainLyrics || lines.map(l => l.text).join('\n')
          };
        }
      }
    } catch {}

    try {
      const query = encodeURIComponent(`${cArtist} ${cTitle}`);
      const response = await fetch(`https://lrclib.net/api/search?q=${query}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const result = data[0];
          const lines = parseLrcToLines(result.syncedLyrics);
          return {
            type: lines.length > 0 ? 'line' : 'plain',
            source: 'lrclib',
            lines,
            syncedLyrics: result.syncedLyrics || '',
            plainLyrics: result.plainLyrics || lines.map(l => l.text).join('\n')
          };
        }
      }
    } catch {}
  }

  if (shouldTryOvh) {
    try {
      const response = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(cArtist)}/${encodeURIComponent(cTitle)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.lyrics) {
          return {
            type: 'plain',
            source: 'ovh',
            lines: [],
            syncedLyrics: '',
            plainLyrics: data.lyrics
          };
        }
      }
    } catch {}
  }

  return { type: 'plain', source: 'none', lines: [], syncedLyrics: '', plainLyrics: '' };
}
