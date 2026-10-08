async function fetchArtistImageFromJioSaavn(artist) {
  try {
    const saavnUrl = `https://www.jiosaavn.com/api.php?__call=autocomplete.get&_format=json&_marker=0&cc=in&includeMetaTags=1&query=${encodeURIComponent(artist)}`;
    const res = await fetch(saavnUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(3000)
    });
    if (res.ok) {
      const data = await res.json();
      const artists = data?.artists?.data;
      if (Array.isArray(artists) && artists.length > 0) {
        const normTarget = artist.toLowerCase().replace(/[^a-z0-9]/g, '');
        const matchedArtist = artists.find(a => {
          const normName = (a.title || a.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          if (normTarget === normName) return true;
          if (normTarget.length >= 4 && (normName.includes(normTarget) || normTarget.includes(normName))) {
            const minLen = Math.min(normTarget.length, normName.length);
            const maxLen = Math.max(normTarget.length, normName.length);
            return (minLen / maxLen) > 0.65;
          }
          return false;
        });

        if (matchedArtist && matchedArtist.image) {
          return matchedArtist.image.replace(/50x50/g, '500x500').replace(/150x150/g, '500x500');
        }
      }
    }
  } catch {}
  return null;
}

async function fetchArtistImageFromLastFM(artist, env = {}) {
  const apiKey = env?.LASTFM_API_KEY;
  if (!apiKey) return null;

  try {
    const lastfmUrl = `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(artist)}&api_key=${apiKey}&format=json`;
    const res = await fetch(lastfmUrl, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      const images = data?.artist?.image;
      if (Array.isArray(images) && images.length > 0) {
        const best = images[images.length - 1]?.['#text'] || images[0]?.['#text'];
        if (best && typeof best === 'string' && best.startsWith('http') && !best.includes('2a96cbd8b46e442fc41c2b86b821562f')) {
          return best;
        }
      }
    }
  } catch {}
  return null;
}

export async function fetchArtistImage(artist, env = {}, preferredProvider = 'auto', enableFallback = true) {
  if (!artist) return null;

  const norm = (preferredProvider || 'auto').toLowerCase();
  const providers = {
    lastfm: () => fetchArtistImageFromLastFM(artist, env),
    jiosaavn: () => fetchArtistImageFromJioSaavn(artist)
  };

  const defaultOrder = ['jiosaavn', 'lastfm'];
  let runOrder = [];

  if (norm !== 'auto' && providers[norm]) {
    runOrder = [norm];
    if (enableFallback) {
      runOrder = runOrder.concat(defaultOrder.filter(p => p !== norm));
    }
  } else {
    runOrder = defaultOrder;
  }

  for (const p of runOrder) {
    const fetcher = providers[p];
    if (!fetcher) continue;
    const img = await fetcher();
    if (img) return img;
    if (!enableFallback && norm !== 'auto') break;
  }

  return null;
}
