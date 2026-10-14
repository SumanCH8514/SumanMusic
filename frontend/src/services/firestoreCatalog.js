import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

const CHUNK_SIZE = 250;

export const saveCatalogToFirestore = async (scope = 'inbuilt', songs = [], version = null) => {
  if (!db || !auth?.currentUser || !Array.isArray(songs) || songs.length === 0) return false;

  try {
    const metaRef = doc(db, 'catalogs', `${scope}_meta`);
    const totalChunks = Math.ceil(songs.length / CHUNK_SIZE);
    const now = Date.now();

    await setDoc(metaRef, {
      scope,
      version: version || `v_${now}`,
      count: songs.length,
      chunksCount: totalChunks,
      updatedAt: now
    }, { merge: true });

    for (let i = 0; i < totalChunks; i++) {
      const chunkSongs = songs.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      const chunkRef = doc(db, 'catalogs', `${scope}_chunk_${i}`);
      await setDoc(chunkRef, {
        chunkIndex: i,
        songs: chunkSongs,
        updatedAt: now
      });
    }

    return true;
  } catch (err) {
    if (err?.code !== 'permission-denied') {
      console.warn('Firestore catalog save skipped:', err?.message);
    }
    return false;
  }
};

export const getCatalogFromFirestore = async (scope = 'inbuilt') => {
  if (!db) return null;

  try {
    const metaRef = doc(db, 'catalogs', `${scope}_meta`);
    const metaSnap = await getDoc(metaRef);

    if (!metaSnap.exists()) return null;

    const meta = metaSnap.data();
    const chunksCount = meta.chunksCount || 1;
    let allSongs = [];

    for (let i = 0; i < chunksCount; i++) {
      const chunkRef = doc(db, 'catalogs', `${scope}_chunk_${i}`);
      const chunkSnap = await getDoc(chunkRef);
      if (chunkSnap.exists()) {
        const data = chunkSnap.data();
        if (Array.isArray(data.songs)) {
          allSongs.push(...data.songs);
        }
      }
    }

    return {
      songs: allSongs,
      version: meta.version,
      updatedAt: meta.updatedAt
    };
  } catch {
    return null;
  }
};
