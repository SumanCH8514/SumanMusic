export async function fetchLyrics(artist, title, album, duration) {
  const cleanArtist = (a) => (a || '').split(/\s*,\s*|\s*&\s*|\s+and\s+/i)[0].replace(/\s*(?:feat|ft)\.?.*$/i, "").trim();
  const cleanTitle = (t) => (t || '').replace(/\s*\(.*?\)/g, '').replace(/\s*\[.*?\]/g, '').trim();

  const cArtist = cleanArtist(artist);
  const cTitle = cleanTitle(title);

  try {
    const params = new URLSearchParams({ track_name: cTitle, artist_name: cArtist });
    if (album) params.append('album_name', album);
    if (duration > 0) params.append('duration', Math.round(duration));

    const response = await fetch(`https://lrclib.net/api/get?${params.toString()}`);
    if (response.ok) {
      const data = await response.json();
      if (data.syncedLyrics || data.plainLyrics) {
        return { syncedLyrics: data.syncedLyrics || '', plainLyrics: data.plainLyrics || '' };
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
        return { syncedLyrics: result.syncedLyrics || '', plainLyrics: result.plainLyrics || '' };
      }
    }
  } catch {}

  try {
    const response = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(cArtist)}/${encodeURIComponent(cTitle)}`);
    if (response.ok) {
      const data = await response.json();
      if (data.lyrics) {
        return { syncedLyrics: '', plainLyrics: data.lyrics };
      }
    }
  } catch {}

  return { syncedLyrics: '', plainLyrics: '' };
}
