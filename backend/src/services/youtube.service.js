async function fetchYouTubeWithFailover(keys, endpoint) {
  const validKeys = keys.filter(k => k && k.length > 10 && !k.includes("YOUR_"));
  if (validKeys.length === 0) {
    return { items: [] };
  }

  for (let i = 0; i < validKeys.length; i++) {
    const key = validKeys[i];
    const url = `https://www.googleapis.com/youtube/v3${endpoint}${endpoint.includes('?') ? '&' : '?'}key=${key}`;
    try {
      const response = await fetch(url);
      if (response.ok) {
        return await response.json();
      }
    } catch {}
  }
  return { items: [] };
}

export async function fetchYouTubeSearch(keys, query, maxResults = 20) {
  try {
    const endpoint = `/search?part=snippet&maxResults=${maxResults}&q=${encodeURIComponent(query)}&type=video`;
    return await fetchYouTubeWithFailover(keys, endpoint);
  } catch {
    return { items: [] };
  }
}

export async function fetchYouTubeCategory(keys, query, maxResults = 20) {
  try {
    const searchEndpoint = `/search?part=snippet&maxResults=${maxResults}&q=${encodeURIComponent(query)}&type=video`;
    const searchData = await fetchYouTubeWithFailover(keys, searchEndpoint);

    if (!searchData || !searchData.items || searchData.items.length === 0) return [];

    const videoIds = searchData.items.map(item => item.id.videoId).filter(Boolean).join(',');
    if (!videoIds) return [];

    const detailsEndpoint = `/videos?part=snippet,contentDetails&id=${videoIds}`;
    const detailsData = await fetchYouTubeWithFailover(keys, detailsEndpoint);

    const parseISODuration = (isoDuration) => {
      const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (!match) return 0;
      const hours = parseInt(match[1] || 0);
      const minutes = parseInt(match[2] || 0);
      const seconds = parseInt(match[3] || 0);
      return hours * 3600 + minutes * 60 + seconds;
    };

    const filteredItems = (detailsData.items || []).filter(item => {
      const durationSeconds = parseISODuration(item.contentDetails?.duration || '');
      const title = (item.snippet.title || '').toLowerCase();
      return durationSeconds >= 90 && !title.includes('#shorts') && !title.includes('shorts');
    });

    return filteredItems.map(item => {
      let cleanTitle = item.snippet.title.replace(/\[.*?\]|\(.*?\)/g, "").trim();
      return {
        id: `yt_${item.id}`,
        title: cleanTitle,
        artist: item.snippet.channelTitle,
        cover: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
        url: `https://www.youtube.com/watch?v=${item.id}`,
        videoId: item.id,
        isYouTube: true,
        duration: parseISODuration(item.contentDetails?.duration || '')
      };
    });
  } catch {
    return [];
  }
}
