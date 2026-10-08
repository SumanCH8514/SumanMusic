export async function fetchArtistImage(artist) {
  if (!artist) return null;
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
