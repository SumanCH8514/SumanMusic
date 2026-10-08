import { ENV } from '../config/env';


const deadKeys = new Set();

const getApiKeys = () => {
  return ENV.YOUTUBE.API_KEYS.filter(key => !deadKeys.has(key));
};

export const clearDeadKeys = () => deadKeys.clear();

const BASE_URL = ENV.YOUTUBE.BASE_URL;

// Local Memory + Session Cache to drastically reduce YouTube Data API quota consumption (search costs 100 units)
const queryCache = new Map();

const getCachedData = (key) => {
  if (queryCache.has(key)) {
    const { data, timestamp } = queryCache.get(key);
    if (Date.now() - timestamp < 30 * 60 * 1000) { // 30 minutes cache
      return data;
    }
    queryCache.delete(key);
  }
  try {
    const sessionData = sessionStorage.getItem(`yt_cache_${key}`);
    if (sessionData) {
      const { data, timestamp } = JSON.parse(sessionData);
      if (Date.now() - timestamp < 30 * 60 * 1000) {
        queryCache.set(key, { data, timestamp });
        return data;
      }
      sessionStorage.removeItem(`yt_cache_${key}`);
    }
  } catch (_) { /* ignore */ }
  return null;
};

const setCachedData = (key, data) => {
  const payload = { data, timestamp: Date.now() };
  queryCache.set(key, payload);
  try {
    sessionStorage.setItem(`yt_cache_${key}`, JSON.stringify(payload));
  } catch (_) { /* ignore */ }
};

/**
 * Internal fetch with multi-key failover support.
 */
const fetchWithFailover = async (endpoint, params, attempt = 0) => {
  const apiKeys = getApiKeys();
  const userToken = localStorage.getItem('suman_music_youtube_token');

  // Try user OAuth token on first attempt only if present
  const useUserToken = userToken && attempt === 0;
  
  if (!useUserToken && apiKeys.length === 0) {
    console.warn("All available YouTube API keys are currently exhausted or blocked.");
    return { items: [] };
  }

  const apiKey = useUserToken ? null : apiKeys[attempt % Math.max(apiKeys.length, 1)];

  const headers = {};
  let url;

  if (useUserToken) {
    url = `${BASE_URL}${endpoint}`;
    headers['Authorization'] = `Bearer ${userToken}`;
  } else if (apiKey) {
    url = `${BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}key=${apiKey}`;
  } else {
    return { items: [] };
  }

  try {
    const response = await fetch(url, { headers });

    if (!response.ok) {
      if (response.status === 401 && userToken) {
        localStorage.removeItem('suman_music_youtube_token');
        return fetchWithFailover(endpoint, params, attempt + 1);
      }

      const errorData = await response.json().catch(() => ({}));
      const reason = errorData.error?.errors?.[0]?.reason || "unknown";

      // 403 Forbidden (e.g. referer blocked), 429 Too Many Requests, or Quota Exceeded
      if (response.status === 403 || response.status === 429 || reason === "quotaExceeded" || reason === "rateLimitExceeded" || reason === "forbidden" || reason === "accessNotConfigured") {
        if (!useUserToken && apiKey) {
          deadKeys.add(apiKey);
        }

        if (attempt < apiKeys.length + (userToken ? 1 : 0)) {
          return fetchWithFailover(endpoint, params, attempt + 1);
        }
      }

      throw new Error(`YouTube API error: ${response.status} - ${reason}`);
    }

    return await response.json();
  } catch (_error) {
    if (apiKey) {
      deadKeys.add(apiKey);
    }
    if (attempt < apiKeys.length + (userToken ? 1 : 0)) {
      return fetchWithFailover(endpoint, params, attempt + 1);
    }
    return { items: [] };
  }
};


const parseISODuration = (isoDuration) => {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const seconds = parseInt(match[3] || 0);
  return hours * 3600 + minutes * 60 + seconds;
};


/**
 * Normalize and clean raw YouTube video titles & channel names into professional music metadata
 */
export const cleanYouTubeMusicMetadata = (rawTitle, channelTitle = '') => {
  if (!rawTitle) return { title: 'Unknown Track', artist: channelTitle || 'Unknown Artist' };

  let title = rawTitle;
  let artist = (channelTitle || '')
    .replace(/ - Topic$/i, '')
    .replace(/VEVO$/i, '')
    .replace(/ Official$/i, '')
    .replace(/ Records$/i, '')
    .trim();

  // 1. Remove bracketed / parenthetical noise
  title = title.replace(/\[\s*(official|audio|video|lyrics?|hd|4k|8k|full\s*song|remix|teaser|promo|exclusive|jukebox|live|unplugged|bhojpuri|hindi|punjabi|hit\s*song)[^\]]*\]/gi, '');
  title = title.replace(/\(\s*(official|audio|video|lyrics?|hd|4k|8k|full\s*song|remix|teaser|promo|exclusive|jukebox|live|unplugged|bhojpuri|hindi|punjabi|hit\s*song)[^)]*\)/gi, '');

  // 2. Remove hashtag spam (#Video, #HitSong, #Trending, etc.)
  title = title.replace(/#\S+/g, '');

  // 3. Handle Pipe separators e.g. "Song Title | Movie Name | Singer Name"
  if (title.includes('|')) {
    const pipeParts = title.split('|').map(p => p.trim()).filter(Boolean);
    // Find candidate segments
    const cleanSegments = pipeParts.filter(p => !/(video|hit\s*song|\d{4}|music\s*video|official|lyrical|audio|full\s*hd|bhojpuri)/i.test(p));
    if (cleanSegments.length > 0) {
      title = cleanSegments[0];
      if (cleanSegments.length > 1 && !artist) {
        artist = cleanSegments[1];
      }
    } else {
      title = pipeParts[0];
    }
  }

  // 4. Handle "Artist - Title" format
  if (title.includes(' - ')) {
    const parts = title.split(' - ');
    if (parts.length === 2) {
      const possibleArtist = parts[0].trim();
      const possibleTitle = parts[1].trim();
      if (possibleArtist.length > 0 && possibleArtist.length < 35 && !/(official|video|4k|song)/i.test(possibleArtist)) {
        artist = possibleArtist;
        title = possibleTitle;
      }
    }
  }

  // 5. Clean trailing noise, symbols, and whitespace
  title = title
    .replace(/[|•–\-:]+$/, '')
    .replace(/^[|•–\-:]+/, '')
    .replace(/^["']|["']$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!title) title = rawTitle.trim();

  return { title, artist: artist || channelTitle || 'YouTube Music' };
};

export const fetchYouTubeCategory = async (query, maxResults = 20) => {
  if (!query || !query.trim()) return [];
  const cacheKey = `cat_${query.trim().toLowerCase()}_${maxResults}`;
  const cached = getCachedData(cacheKey);
  if (cached && cached.length > 0) return cached;

  // 1. Primary: Cloudflare Worker Backend
  try {
    const backendUrl = `${ENV.BACKEND_URL}/api/youtube/category?q=${encodeURIComponent(query)}&maxResults=${maxResults}`;
    const response = await fetch(backendUrl);
    if (response.ok) {
      const items = await response.json();
      if (Array.isArray(items) && items.length > 0) {
        const result = items.map(item => {
          const { title, artist } = cleanYouTubeMusicMetadata(item.title, item.artist);
          return { ...item, title, artist };
        });
        setCachedData(cacheKey, result);
        return result;
      }
    }
  } catch (_) { /* ignore */ }

  // 2. Client Fallback - enforce videoCategoryId=10 (Music)
  try {
    const searchEndpoint = `/search?part=snippet&maxResults=${maxResults}&q=${encodeURIComponent(query)}&type=video&videoCategoryId=10`;
    const searchData = await fetchWithFailover(searchEndpoint);

    if (!searchData.items || searchData.items.length === 0) return [];

    const videoIds = searchData.items.map(item => item.id?.videoId).filter(Boolean).join(',');
    if (!videoIds) return [];

    const detailsEndpoint = `/videos?part=snippet,contentDetails,topicDetails&id=${videoIds}`;
    const detailsData = await fetchWithFailover(detailsEndpoint);

    const filteredItems = (detailsData.items || []).filter(item => {
      const durationSeconds = parseISODuration(item.contentDetails?.duration || '');
      const title = (item.snippet?.title || '').toLowerCase();
      const isMusic = item.snippet?.categoryId === '10' || item.topicDetails?.topicCategories?.some(t => t.toLowerCase().includes('music'));
      return isMusic && durationSeconds >= 60 && !title.includes('#shorts') && !title.includes('shorts');
    });

    const result = filteredItems.map(item => {
      const { title, artist } = cleanYouTubeMusicMetadata(item.snippet?.title, item.snippet?.channelTitle);

      return {
        id: `yt_${item.id}`,
        title,
        artist,
        cover: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url,
        url: `https://www.youtube.com/watch?v=${item.id}`,
        videoId: item.id,
        isYouTube: true,
        duration: parseISODuration(item.contentDetails?.duration || '')
      };
    });

    if (result.length > 0) {
      setCachedData(cacheKey, result);
    }
    return result;
  } catch (_) {
    return [];
  }
};

/**
 * Fetch a single YouTube video by video ID for direct URL loading & refreshing.
 */
export const fetchYouTubeVideoById = async (videoId) => {
  if (!videoId) return null;
  const cleanId = videoId.replace(/^yt_/, '');

  // 1. Backend Search Proxy
  try {
    const backendUrl = `${ENV.BACKEND_URL}/api/youtube/search?q=${cleanId}&maxResults=1`;
    const response = await fetch(backendUrl);
    if (response.ok) {
      const data = await response.json();
      if (data && data.items && data.items.length > 0) {
        const item = data.items[0];
        let cleanTitle = (item.snippet?.title || '').replace(/\[.*?\]|\(.*?\)/g, "").trim();
        return {
          id: `yt_${cleanId}`,
          videoId: cleanId,
          title: cleanTitle || "YouTube Music",
          artist: item.snippet?.channelTitle || "YouTube",
          cover: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`,
          thumbnail: item.snippet?.thumbnails?.default?.url || `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`,
          url: `https://www.youtube.com/watch?v=${cleanId}`,
          isYouTube: true
        };
      }
    }
  } catch (err) {
    console.warn("Backend YouTube fetch by ID failed, attempting fallback:", err);
  }

  // 2. Client Fallback
  try {
    const detailsEndpoint = `/videos?part=snippet,contentDetails&id=${cleanId}`;
    const detailsData = await fetchWithFailover(detailsEndpoint);
    if (detailsData && detailsData.items && detailsData.items.length > 0) {
      const item = detailsData.items[0];
      const { title, artist } = cleanYouTubeMusicMetadata(item.snippet?.title, item.snippet?.channelTitle);
      return {
        id: `yt_${cleanId}`,
        videoId: cleanId,
        title,
        artist,
        cover: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`,
        thumbnail: item.snippet?.thumbnails?.default?.url || `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${cleanId}`,
        isYouTube: true,
        duration: parseISODuration(item.contentDetails?.duration || '')
      };
    }
  } catch (err) {
    console.warn("Client YouTube fetch by ID failed:", err);
  }

  // 3. Fallback constructed object
  return {
    id: `yt_${cleanId}`,
    videoId: cleanId,
    title: "YouTube Music",
    artist: "YouTube",
    cover: `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`,
    thumbnail: `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`,
    url: `https://www.youtube.com/watch?v=${cleanId}`,
    isYouTube: true
  };
};

/**
 * Fetch User's Liked YouTube Music Videos (EXCLUSIVELY filtered for categoryId 10 - Music)
 */
export const fetchYouTubeLikedSongs = async (maxResults = 50) => {
  try {
    const userToken = localStorage.getItem('suman_music_youtube_token');
    if (!userToken) return [];

    const endpoint = `/playlistItems?part=snippet,contentDetails&playlistId=LL&maxResults=${maxResults}`;
    const data = await fetchWithFailover(endpoint);

    if (!data.items || data.items.length === 0) return [];

    const videoIds = data.items.map(item => item.contentDetails?.videoId || item.snippet?.resourceId?.videoId).filter(Boolean).join(',');
    if (!videoIds) return [];

    const detailsEndpoint = `/videos?part=snippet,contentDetails,topicDetails&id=${videoIds}`;
    const detailsData = await fetchWithFailover(detailsEndpoint);

    // Strictly filter ONLY categoryId 10 (Music) or music topic categories
    const filteredItems = (detailsData.items || []).filter(item => {
      const isMusicCategory = item.snippet?.categoryId === '10';
      const hasMusicTopic = item.topicDetails?.topicCategories?.some(t => t.toLowerCase().includes('music'));
      const durationSeconds = parseISODuration(item.contentDetails?.duration || '');
      const title = (item.snippet?.title || '').toLowerCase();
      
      return (isMusicCategory || hasMusicTopic) && durationSeconds >= 45 && !title.includes('#shorts');
    });

    return filteredItems.map(item => {
      const { title, artist } = cleanYouTubeMusicMetadata(item.snippet?.title, item.snippet?.channelTitle);
      return {
        id: `yt_${item.id}`,
        title,
        artist,
        cover: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
        url: `https://www.youtube.com/watch?v=${item.id}`,
        videoId: item.id,
        isYouTube: true,
        duration: parseISODuration(item.contentDetails?.duration || '')
      };
    });
  } catch (err) {
    console.warn("Error fetching user's YouTube liked songs:", err);
    return [];
  }
};

/**
 * Fetch YouTube Trending Music Chart in India (Category 10: Music only, regionCode: IN)
 */
export const fetchYouTubeTrendingMusic = async (maxResults = 20) => {
  const cacheKey = `trending_in_${maxResults}`;
  const cached = getCachedData(cacheKey);
  if (cached && cached.length > 0) return cached;

  try {
    const endpoint = `/videos?part=snippet,contentDetails&chart=mostPopular&videoCategoryId=10&regionCode=IN&maxResults=${maxResults}`;
    const data = await fetchWithFailover(endpoint);

    if (data.items && data.items.length > 0) {
      const filteredItems = data.items.filter(item => {
        const isMusic = item.snippet?.categoryId === '10';
        const durationSeconds = parseISODuration(item.contentDetails?.duration || '');
        const title = (item.snippet?.title || '').toLowerCase();
        return isMusic && durationSeconds >= 60 && !title.includes('#shorts');
      });

      if (filteredItems.length > 0) {
        const result = filteredItems.map(item => {
          const { title, artist } = cleanYouTubeMusicMetadata(item.snippet?.title, item.snippet?.channelTitle);
          return {
            id: `yt_${item.id}`,
            title,
            artist,
            cover: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url,
            url: `https://www.youtube.com/watch?v=${item.id}`,
            videoId: item.id,
            isYouTube: true,
            duration: parseISODuration(item.contentDetails?.duration || '')
          };
        });
        setCachedData(cacheKey, result);
        return result;
      }
    }
  } catch (_) { /* ignore */ }

  // Fallback to India Category Search
  const fallback = await fetchYouTubeCategory("Trending Music Songs India 2025 Official Hits", maxResults);
  if (fallback.length > 0) {
    setCachedData(cacheKey, fallback);
  }
  return fallback;
};

/**
 * Algorithmic Recommendations based on user's recent artists or popular tracks
 */
export const fetchYouTubeRecommendations = async (seedArtists = [], maxResults = 20) => {
  let query = "Top Hits Official Music Songs 2025";
  if (seedArtists && seedArtists.length > 0) {
    const validArtists = seedArtists.filter(a => a && a !== 'Unknown Artist' && a !== 'YouTube' && !a.toLowerCase().includes('topic'));
    if (validArtists.length > 0) {
      const selected = validArtists.slice(0, 2).join(" ");
      if (selected.trim()) {
        query = `${selected} official audio songs`;
      }
    }
  }
  return fetchYouTubeCategory(query, maxResults);
};

/**
 * Algorithmic Mood & Genre Tracks (Exclusively music)
 */
export const fetchYouTubeMoodTracks = async (moodQuery, maxResults = 15) => {
  return fetchYouTubeCategory(`${moodQuery} official songs`, maxResults);
};


