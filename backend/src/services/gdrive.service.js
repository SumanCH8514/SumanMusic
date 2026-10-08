export async function fetchGDriveSongs(keys, folderId) {
  let keyIndex = 0;
  const getActiveKey = () => keys[keyIndex % keys.length];

  const fields = "files(id,name,mimeType,size,webContentLink,thumbnailLink,videoMediaMetadata,createdTime)";
  let allSongs = [];
  let foldersToScan = [{ id: folderId, depth: 0 }];
  let scannedFolderIds = new Set();
  const MAX_DEPTH = 3;
  const MAX_FOLDERS = 50;
  let totalFoldersScanned = 0;

  while (foldersToScan.length > 0 && totalFoldersScanned < MAX_FOLDERS) {
    const { id: currentFolderId, depth } = foldersToScan.shift();
    if (scannedFolderIds.has(currentFolderId)) continue;
    scannedFolderIds.add(currentFolderId);
    totalFoldersScanned++;

    const q = `'${currentFolderId}' in parents and trashed = false`;
    const targetUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=${fields}&key=${getActiveKey()}`;

    let response = await fetch(targetUrl);

    if (response.status === 403 || response.status === 429) {
      keyIndex++;
      const retryUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=${fields}&key=${getActiveKey()}`;
      response = await fetch(retryUrl);
    }

    if (!response.ok) continue;

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
      if (name.endsWith('.mp3') || name.endsWith('.m4a') || name.endsWith('.wav') || name.endsWith('.flac') || name.endsWith('.aac') || name.endsWith('.ogg')) {
        let rawName = file.name.replace(/\.[^/.]+$/, "");
        rawName = rawName.replace(/SumanOnline\.Com/gi, "");
        rawName = rawName.replace(/_/g, " ").replace(/\s+/g, " ").trim();
        rawName = rawName.replace(/^[\s\-_|]+|[\s\-_|]+$/g, "");
        rawName = rawName.replace(/^\d+[\s.\-_]+/, "").trim();

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

        const streamingUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${getActiveKey()}`;

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
}
