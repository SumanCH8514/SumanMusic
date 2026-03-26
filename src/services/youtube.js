import { ENV } from '../config/env';


const deadKeys = new Set();

const getApiKeys = () => {
  return ENV.YOUTUBE.API_KEYS.filter(key => !deadKeys.has(key));
};

export const clearDeadKeys = () => deadKeys.clear();

const BASE_URL = ENV.YOUTUBE.BASE_URL;

/**
 * Internal fetch with multi-key failover support.
 */
const fetchWithFailover = async (endpoint, params, attempt = 0) => {
  const apiKeys = getApiKeys();
  if (apiKeys.length === 0) {
    throw new Error("No YouTube API Keys configured");
  }
  

  const apiKey = apiKeys[attempt % apiKeys.length];
  const url = `${BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}key=${apiKey}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const reason = errorData.error?.errors?.[0]?.reason || "unknown";
        

        if (reason === "quotaExceeded" || reason === "rateLimitExceeded") {
            deadKeys.add(apiKey); // Mark this key as dead for this session
            
            if (attempt < apiKeys.length - 1) {
                console.warn(`YouTube Key ${attempt + 1} quota exceeded, trying next key...`);
                return fetchWithFailover(endpoint, params, attempt + 1);
            }
        }
        
        const message = errorData.error?.message || `Status: ${response.status}`;
        console.error(`YouTube API Error [${response.status}]: ${message} (Reason: ${reason})`);
        throw new Error(`YouTube API error: ${response.status} - ${reason}`);
    }
    
    return await response.json();
  } catch (error) {

    if (attempt < apiKeys.length - 1 && !error.message.includes("quotaExceeded")) {
        return fetchWithFailover(endpoint, params, attempt + 1);
    }
    throw error;
  }
};

/**
 * Fetch songs from YouTube Data API v3 based on a search query.
 */
export const fetchYouTubeCategory = async (query, maxResults = 20) => {
  try {
    const endpoint = `/search?part=snippet&maxResults=${maxResults}&q=${encodeURIComponent(query + ' -shorts')}&type=video&videoCategoryId=10`;
    const data = await fetchWithFailover(endpoint);
    
    return data.items.map(item => {

      let cleanTitle = item.snippet.title;
      cleanTitle = cleanTitle.replace(/\[.*?\]|\(.*?\)/g, "").trim();

      const txt = document.createElement("textarea");
      txt.innerHTML = cleanTitle;
      cleanTitle = txt.value;

      return {
        id: `yt_${item.id.videoId}`,
        title: cleanTitle,
        artist: item.snippet.channelTitle,
        cover: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        videoId: item.id.videoId,
        isYouTube: true,
      };
    });
  } catch (error) {
    console.error(`Error fetching YouTube category [${query}]:`, error);
    return [];
  }
};
