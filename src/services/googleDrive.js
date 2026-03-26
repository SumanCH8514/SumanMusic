import { ENV } from '../config/env';
import { apiFetch } from '../lib/api';

export const fetchPersonalSongsFromDrive = async (accessToken) => {
  if (!accessToken) return [];
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

    return musicFiles.map(file => {
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
  } catch (error) {
    console.error("Error fetching personal songs from Drive:", error);
    if (error.message.includes("Token Expired")) throw error;
    return [];
  }
};

export const fetchSongsFromDrive = async (apiKey, accessToken = null) => {
  const { FOLDER_ID } = ENV.GDRIVE;

  if (!apiKey || !FOLDER_ID) {
    console.warn("Google Drive API Key or Folder ID not configured properly.");
    return [];
  }

  const fields = "files(id,name,mimeType,size,webContentLink,thumbnailLink,videoMediaMetadata,createdTime)";
  let allSongs = [];
  let foldersToScan = [{ id: FOLDER_ID, depth: 0 }];
  let scannedFolderIds = new Set();
  const MAX_DEPTH = 3;
  const MAX_FOLDERS = 50;
  let totalFoldersScanned = 0;

  try {
    while (foldersToScan.length > 0 && totalFoldersScanned < MAX_FOLDERS) {
      const { id: folderId, depth } = foldersToScan.shift();
      if (scannedFolderIds.has(folderId)) continue;
      scannedFolderIds.add(folderId);
      totalFoldersScanned++;

      const q = `'${folderId}' in parents and trashed = false`;
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=${fields}&key=${apiKey}`;

      const response = await apiFetch(url);
      if (!response.ok) {
        console.warn(`Error scanning folder ${folderId}: ${response.status}`);
        continue;
      }

      const data = await response.json();
      if (!data.files) continue;

      for (const file of data.files) {
        if (file.mimeType === 'application/vnd.google-apps.folder') {
          if (depth < MAX_DEPTH) {
            foldersToScan.push({ id: file.id, depth: depth + 1 });
          }
          continue;
        }

        const name = file.name.toLowerCase();
        if (name.endsWith('.mp3') || name.endsWith('.m4a')) {
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

          const streamingUrl = accessToken 
            ? `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&access_token=${accessToken}`
            : `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${apiKey}`;

          allSongs.push({
            id: file.id,
            title: title.trim(),
            artist: artist.trim(),
            url: streamingUrl,
            driveUrl: file.webContentLink,
            duration: durationStr,
            size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
            thumbnail: file.thumbnailLink,
            rawMetadata: file.videoMediaMetadata,
            createdTime: file.createdTime,
            isPersonal: false
          });
        }
      }
    }

    return allSongs.filter((song, index, self) =>
      index === self.findIndex((t) => t.id === song.id)
    );
  } catch (error) {
    console.error("Error fetching songs recursively from Drive:", error);
    return allSongs;
  }
};
