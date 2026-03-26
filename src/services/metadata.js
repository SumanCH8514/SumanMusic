import { apiFetch } from '../lib/api';

const CORS_PROXY = 'https://api.codetabs.com/v1/proxy?quest=';


export const fetchExternalMetadata = async (artist, title) => {
  if (!artist || !title || artist === "Unknown Artist") return null;

  const query = encodeURIComponent(`${artist} ${title}`);
  const targetUrl = `https://itunes.apple.com/search?term=${query}&entity=song&limit=1`;
  const proxiedUrl = `${CORS_PROXY}${encodeURIComponent(targetUrl)}`;

  try {
    const response = await apiFetch(proxiedUrl);
    if (!response.ok) throw new Error("Metadata API unreachable");
    
    const data = await response.json();
    
    if (data.resultCount > 0) {
      const result = data.results[0];
      return {
        title: result.trackName,
        artist: result.artistName,
        album: result.collectionName,
        cover: result.artworkUrl100 ? result.artworkUrl100.replace("100x100bb", "600x600bb") : null,
        thumbnail: result.artworkUrl100 ? result.artworkUrl100.replace("100x100bb", "300x300bb") : null,
        genre: result.primaryGenreName,
        year: result.releaseDate ? new Date(result.releaseDate).getFullYear() : null,
      };
    }
    return null;
  } catch (error) {
    console.warn("External metadata fetch failed:", error);
    return null;
  }
};
