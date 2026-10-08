function decodeHtml(str = '') {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
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

function cleanQuery(artist, title) {
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
}

async function fetchFromAppleMusic(artist, title) {
  const query = cleanQuery(artist, title);
  if (!query) return null;

  try {
    const directUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=10`;
    const response = await fetch(directUrl);
    if (response.ok) {
      const data = await response.json();
      if (data && data.resultCount > 0) {
        const matched = data.results.find(r => isTitleMatch(title, r.trackName)) || (data.results.length > 0 && isTitleMatch(title, data.results[0].trackName) ? data.results[0] : null);
        if (matched) {
          return {
            title: decodeHtml(matched.trackName),
            artist: decodeHtml(matched.artistName),
            album: decodeHtml(matched.collectionName),
            cover: matched.artworkUrl100 ? matched.artworkUrl100.replace("100x100bb", "600x600bb") : null,
            thumbnail: matched.artworkUrl100 ? matched.artworkUrl100.replace("100x100bb", "300x300bb") : null,
            genre: matched.primaryGenreName,
            year: matched.releaseDate ? new Date(matched.releaseDate).getFullYear() : null,
            provider: 'AppleMusic'
          };
        }
      }
    }
  } catch {}

  return null;
}

async function fetchFromJioSaavn(artist, title) {
  const query = cleanQuery(artist, title);
  if (!query) return null;

  try {
    const saavnUrl = `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&_marker=0&cc=in&includeMetaTags=1&q=${encodeURIComponent(query)}&n=10&p=1`;
    const res = await fetch(saavnUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });

    if (res.ok) {
      const text = await res.text();
      let data = null;
      try {
        data = JSON.parse(text);
      } catch {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) data = JSON.parse(match[0]);
      }

      if (data && data.results && data.results.length > 0) {
        const matched = data.results.find(r => isTitleMatch(title, r.song || r.title || r.name)) || (isTitleMatch(title, data.results[0].song || data.results[0].title || data.results[0].name) ? data.results[0] : null);
        if (matched) {
          const rawImg = matched.image || matched.album_art || matched.thumbnail || '';
          const highResCover = rawImg ? rawImg.replace(/50x50/g, '500x500').replace(/150x150/g, '500x500') : null;
          const medResCover = rawImg ? rawImg.replace(/50x50/g, '250x250').replace(/150x150/g, '250x250') : null;
          
          return {
            title: decodeHtml(matched.song || matched.title || matched.name),
            artist: decodeHtml(matched.primary_artists || matched.singers || matched.music || matched.artist),
            album: decodeHtml(matched.album || matched.more_info?.album || null),
            cover: highResCover,
            thumbnail: medResCover || highResCover,
            genre: matched.language ? `${matched.language.charAt(0).toUpperCase() + matched.language.slice(1)} Music` : 'Indian',
            year: matched.year ? parseInt(matched.year, 10) : null,
            provider: 'JioSaavn'
          };
        }
      }
    }
  } catch {}

  try {
    const autoUrl = `https://www.jiosaavn.com/api.php?__call=autocomplete.get&_format=json&_marker=0&cc=in&includeMetaTags=1&query=${encodeURIComponent(query)}`;
    const res = await fetch(autoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });
    if (res.ok) {
      const text = await res.text();
      let data = null;
      try {
        data = JSON.parse(text);
      } catch {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) data = JSON.parse(match[0]);
      }
      const songs = data?.songs?.data || data?.songs;
      if (Array.isArray(songs) && songs.length > 0) {
        const matched = songs.find(r => isTitleMatch(title, r.title || r.song)) || (isTitleMatch(title, songs[0].title || songs[0].song) ? songs[0] : null);
        if (matched) {
          const rawImg = matched.image || '';
          const highResCover = rawImg ? rawImg.replace(/50x50/g, '500x500').replace(/150x150/g, '500x500') : null;
          const medResCover = rawImg ? rawImg.replace(/50x50/g, '250x250').replace(/150x150/g, '250x250') : null;

          return {
            title: decodeHtml(matched.title || matched.song),
            artist: decodeHtml(matched.more_info?.primary_artists || matched.more_info?.singers || matched.description || artist),
            album: decodeHtml(matched.more_info?.album || null),
            cover: highResCover,
            thumbnail: medResCover || highResCover,
            genre: 'Indian Music',
            year: matched.more_info?.year ? parseInt(matched.more_info.year, 10) : null,
            provider: 'JioSaavn'
          };
        }
      }
    }
  } catch {}

  return null;
}

async function fetchFromDeezer(artist, title) {
  const query = cleanQuery(artist, title);
  if (!query) return null;

  try {
    const deezerUrl = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=10`;
    const response = await fetch(deezerUrl);
    if (response.ok) {
      const data = await response.json();
      if (data && data.data && data.data.length > 0) {
        const matched = data.data.find(r => isTitleMatch(title, r.title)) || (data.data.length > 0 && isTitleMatch(title, data.data[0].title) ? data.data[0] : null);
        if (matched) {
          return {
            title: decodeHtml(matched.title),
            artist: decodeHtml(matched.artist?.name),
            album: decodeHtml(matched.album?.title),
            cover: matched.album?.cover_xl || matched.album?.cover_big || matched.album?.cover_medium,
            thumbnail: matched.album?.cover_medium || matched.album?.cover_small,
            genre: 'Music',
            year: null,
            provider: 'Deezer'
          };
        }
      }
    }
  } catch {}

  return null;
}

async function fetchFromLastFM(artist, title, env = {}) {
  const apiKey = env?.LASTFM_API_KEY;
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
          cover: cover,
          thumbnail: cover,
          genre: track.toptags?.tag?.[0]?.name || 'Music',
          year: null,
          provider: 'Last.fm'
        };
      }
    }
  } catch {}

  return null;
}

async function fetchFromAudioDb(artist, title) {
  try {
    const audioDbUrl = `https://www.theaudiodb.com/api/v1/json/2/searchtrack.php?s=${encodeURIComponent(artist)}&t=${encodeURIComponent(title)}`;
    const response = await fetch(audioDbUrl);
    if (response.ok) {
      const data = await response.json();
      if (data && data.track && data.track.length > 0) {
        const matched = data.track.find(r => isTitleMatch(title, r.strTrack)) || data.track[0];
        if (matched) {
          return {
            title: decodeHtml(matched.strTrack || title),
            artist: decodeHtml(matched.strArtist || artist),
            album: decodeHtml(matched.strAlbum || null),
            cover: matched.strTrackThumb || null,
            thumbnail: matched.strTrackThumb || null,
            genre: matched.strGenre || 'Music',
            year: null,
            provider: 'TheAudioDB'
          };
        }
      }
    }
  } catch {}
  return null;
}

async function fetchSinglePass(artist, title, env = {}, preferredProvider = 'auto', enableFallback = true) {
  const providerFetchers = {
    apple: () => fetchFromAppleMusic(artist, title),
    jiosaavn: () => fetchFromJioSaavn(artist, title),
    lastfm: () => fetchFromLastFM(artist, title, env),
    deezer: () => fetchFromDeezer(artist, title),
    theaudiodb: () => fetchFromAudioDb(artist, title)
  };

  const defaultOrder = ['apple', 'jiosaavn', 'lastfm', 'deezer', 'theaudiodb'];
  let runOrder = [];

  const normPreferred = (preferredProvider || 'auto').toLowerCase();
  if (normPreferred !== 'auto' && providerFetchers[normPreferred]) {
    runOrder = [normPreferred];
    if (enableFallback) {
      runOrder = runOrder.concat(defaultOrder.filter(p => p !== normPreferred));
    }
  } else {
    runOrder = defaultOrder;
  }

  let bestWithoutCover = null;

  for (const providerKey of runOrder) {
    const fetcher = providerFetchers[providerKey];
    if (!fetcher) continue;
    try {
      const res = await fetcher();
      if (res && res.title) {
        if (res.cover) {
          return res;
        }
        if (!bestWithoutCover) {
          bestWithoutCover = res;
        }
      }
    } catch {}

    // If fallback is disabled and we just tested the preferred provider, stop here
    if (!enableFallback && normPreferred !== 'auto') {
      break;
    }
  }

  return bestWithoutCover;
}

export async function fetchMetadata(artist, title, env = {}, preferredProvider = 'auto', enableFallback = true) {
  let result = await fetchSinglePass(artist, title, env, preferredProvider, enableFallback);
  if (result && result.cover) return result;

  if (enableFallback && artist && title && artist !== "Unknown Artist") {
    const swappedResult = await fetchSinglePass(title, artist, env, preferredProvider, enableFallback);
    if (swappedResult && swappedResult.cover) {
      return swappedResult;
    }
  }

  if (enableFallback && title) {
    const titleOnlyResult = await fetchSinglePass('', title, env, preferredProvider, enableFallback);
    if (titleOnlyResult && titleOnlyResult.cover) {
      return titleOnlyResult;
    }
  }

  return result || null;
}
