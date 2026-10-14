import { ENV } from '../config/env';
import { getCachedSongs, saveCachedSongs, getCatalogueMeta } from '../lib/indexedDbStorage';
import { getCatalogFromFirestore, saveCatalogToFirestore } from './firestoreCatalog';

export const invalidateGDriveCache = async () => {
  try {
    await fetch(`${ENV.BACKEND_URL}/api/catalog/sync`, { method: 'POST' });
  } catch {}
};

export const fetchPersonalSongsFromDrive = async (accessToken, forceRefresh = false) => {
  if (!accessToken) return [];

  if (!forceRefresh) {
    try {
      const cached = await getCachedSongs('personal');
      if (Array.isArray(cached) && cached.length > 0) {
        return cached;
      }
    } catch {}
  }

  const fields = "files(id,name,mimeType,size,webContentLink,thumbnailLink,videoMediaMetadata,createdTime)";
  const q = "(name contains '.mp3' or name contains '.m4a' or name contains '.MP3' or name contains '.M4A') and trashed = false";
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=${fields}`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) throw new Error("Unauthorized (Token Expired)");
      throw new Error(`Google Drive API error ${response.status}`);
    }
    const data = await response.json();
    const musicFiles = data.files.filter(file => {
      const name = file.name.toLowerCase();
      return name.endsWith('.mp3') || name.endsWith('.m4a');
    });

    const musicSongs = musicFiles.map(file => {
      let rawName = file.name.replace(/\.[^/.]+$/, "");
      rawName = rawName.replace(/SumanOnline\.Com/gi, "");
      rawName = rawName.replace(/_/g, " ").replace(/\s+/g, " ").trim();
      rawName = rawName.replace(/^[\s\-_|]+|[\s\-_|]+$/g, "");

      let artist = "Unknown Artist";
      let title = rawName;
      const midDelimiters = [" - ", " | ", " – ", " -", "- ", "-", "|"];
      for (const d of midDelimiters) {
        if (rawName.includes(d)) {
          const parts = rawName.split(d).filter(p => p.trim().length > 0);
          if (parts.length >= 2) {
            title = parts[0].trim();
            artist = parts[1].trim();
            break;
          }
        }
      }

      let durationStr = "0:00";
      if (file.videoMediaMetadata && file.videoMediaMetadata.durationMillis) {
        const seconds = Math.floor(file.videoMediaMetadata.durationMillis / 1000);
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        durationStr = `${mins}:${secs.toString().padStart(2, '0')}`;
      }

      const streamingUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&access_token=${accessToken}`;

      return {
        id: file.id,
        title: title.trim(),
        artist: artist.trim(),
        url: streamingUrl,
        driveUrl: file.webContentLink,
        duration: durationStr,
        size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
        thumbnail: file.thumbnailLink,
        isPersonal: true,
        createdTime: file.createdTime
      };
    });

    if (musicSongs.length > 0) {
      saveCachedSongs('personal', musicSongs).catch(() => {});
    }
    return musicSongs;
  } catch (error) {
    console.error("Error fetching personal songs from Drive:", error);
    if (error.message.includes("Token Expired")) throw error;
    return [];
  }
};

const revalidateInbuiltCatalogue = async (meta = null) => {
  try {
    let backendUrl = `${ENV.BACKEND_URL}/api/gdrive/songs`;
    if (meta?.version) {
      backendUrl += `?v=${encodeURIComponent(meta.version)}`;
    }

    const response = await fetch(backendUrl);

    if (response.status === 304) {
      return null;
    }

    if (response.ok) {
      const backendSongs = await response.json();
      if (Array.isArray(backendSongs) && backendSongs.length > 0) {
        const etag = response.headers.get('ETag') || `"${Date.now()}_${backendSongs.length}"`;
        const version = response.headers.get('X-Catalog-Version') || `v_${Date.now()}`;

        await saveCachedSongs('inbuilt', backendSongs, version, etag);
        saveCatalogToFirestore('inbuilt', backendSongs, version).catch(() => {});

        window.dispatchEvent(new CustomEvent('sumanmusic-catalog-updated', {
          detail: { scope: 'inbuilt', songs: backendSongs, version }
        }));

        return backendSongs;
      }
    }
  } catch {}
  return null;
};

export const syncInbuiltCatalogue = async () => {
  try {
    const backendUrl = `${ENV.BACKEND_URL}/api/gdrive/songs?refresh=true`;
    const response = await fetch(backendUrl);
    if (response.ok) {
      const backendSongs = await response.json();
      if (Array.isArray(backendSongs) && backendSongs.length > 0) {
        const etag = response.headers.get('ETag') || `"${Date.now()}_${backendSongs.length}"`;
        const version = response.headers.get('X-Catalog-Version') || `v_${Date.now()}`;

        await saveCachedSongs('inbuilt', backendSongs, version, etag);
        saveCatalogToFirestore('inbuilt', backendSongs, version).catch(() => {});

        window.dispatchEvent(new CustomEvent('sumanmusic-catalog-updated', {
          detail: { scope: 'inbuilt', songs: backendSongs, version }
        }));

        return backendSongs;
      }
    }
  } catch (err) {
    console.error("Manual sync failed:", err);
  }
  return null;
};

export const fetchSongsFromDrive = async (_apiKey = null, _accessToken = null, forceRefresh = false) => {
  if (!forceRefresh) {
    try {
      const cachedSongs = await getCachedSongs('inbuilt');
      if (Array.isArray(cachedSongs) && cachedSongs.length > 0) {
        getCatalogueMeta('inbuilt').then(meta => {
          revalidateInbuiltCatalogue(meta);
        });
        return cachedSongs;
      }
    } catch {}
  }

  try {
    const freshSongs = await revalidateInbuiltCatalogue(null);
    if (freshSongs && freshSongs.length > 0) {
      return freshSongs;
    }
  } catch {}

  try {
    const firestoreData = await getCatalogFromFirestore('inbuilt');
    if (firestoreData && Array.isArray(firestoreData.songs) && firestoreData.songs.length > 0) {
      saveCachedSongs('inbuilt', firestoreData.songs, firestoreData.version).catch(() => {});
      return firestoreData.songs;
    }
  } catch {}

  return [];
};
