/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  arrayUnion, 
  arrayRemove, 
  query, 
  where, 
  or,
  onSnapshot,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';

const PlaylistContext = createContext();

export const PlaylistProvider = ({ children }) => {
  const { user, isGuest } = useAuth();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);

  const [hiddenPlaylistIds, setHiddenPlaylistIds] = useState(() => {
    const key = `suman_music_hidden_playlists_${user?.uid || 'guest'}`;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    if (!user && !isGuest) {
      setTimeout(() => {
        setPlaylists([]);
        setLoading(false);
      }, 0);
      return;
    }

    // Update hidden playlists when user changes
    const key = `suman_music_hidden_playlists_${user?.uid || 'guest'}`;
    const saved = localStorage.getItem(key);
    setTimeout(() => {
      setHiddenPlaylistIds(saved ? JSON.parse(saved) : []);
    }, 0);

    // Define queries
    let q;
    if (isGuest) {
      // For guests, only public playlists
      q = query(collection(db, 'playlists'), where('public', '==', true));
    } else {
      // For authenticated, own playlists OR public playlists
      q = query(collection(db, 'playlists'), or(where('userId', '==', user.uid), where('public', '==', true)));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let playlistData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      if (isGuest) {
        // Merge guest local playlists with public cloud ones
        const savedPlaylists = localStorage.getItem('suman_music_playlists_guest');
        const localPlaylists = savedPlaylists ? JSON.parse(savedPlaylists) : [];
        
        // Avoid adding cloud public playlists that might somehow collide with local IDs
        playlistData = [...localPlaylists, ...playlistData.filter(cp => !localPlaylists.some(lp => lp.id === cp.id))];
      }

      setPlaylists(playlistData);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Snapshot Error:", error);
      if (error.code === 'permission-denied') {
        console.warn("Permission denied: Make sure your Firestore rules allow reading public playlists.");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [user, isGuest]);

  const hidePlaylist = (playlistId) => {
    setHiddenPlaylistIds(prev => {
      const updated = [...new Set([...prev, playlistId])];
      const key = `suman_music_hidden_playlists_${user?.uid || 'guest'}`;
      localStorage.setItem(key, JSON.stringify(updated));
      return updated;
    });
  };

  const unhidePlaylist = (playlistId) => {
    setHiddenPlaylistIds(prev => {
      const updated = prev.filter(id => id !== playlistId);
      const key = `suman_music_hidden_playlists_${user?.uid || 'guest'}`;
      localStorage.setItem(key, JSON.stringify(updated));
      return updated;
    });
  };

  // Filter out hidden playlists that the user doesn't own
  const visiblePlaylists = playlists.filter(pl => 
    pl.userId === user?.uid || !hiddenPlaylistIds.includes(pl.id)
  );

  const createPlaylist = async (name) => {
    if (isGuest) {
      const newPlaylist = {
        id: 'guest-pl-' + Date.now(),
        name,
        songs: [],
        createdAt: new Date().toISOString(),
        userId: user.uid
      };
      setPlaylists(prev => {
        const updated = [...prev, newPlaylist];
        localStorage.setItem('suman_music_playlists_guest', JSON.stringify(updated));
        return updated;
      });
      return newPlaylist;
    }

    const docRef = await addDoc(collection(db, 'playlists'), {
      name,
      userId: user.uid,
      songs: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      public: false
    });
    return docRef.id;
  };

  const sanitizeSong = (song) => {
    const sanitized = { ...song };
    Object.keys(sanitized).forEach(key => {
      if (sanitized[key] === undefined) {
        delete sanitized[key];
      }
    });
    return sanitized;
  };

  const addSongToPlaylist = async (playlistId, song) => {
    const sanitizedSong = sanitizeSong(song);
    
    if (isGuest) {
      setPlaylists(prev => {
        const updated = prev.map(pl => {
          if (pl.id === playlistId) {
            if (pl.songs.some(s => s.id === sanitizedSong.id)) return pl;
            return { ...pl, songs: [...pl.songs, sanitizedSong] };
          }
          return pl;
        });
        localStorage.setItem('suman_music_playlists_guest', JSON.stringify(updated));
        return updated;
      });
      return;
    }

    const playlistRef = doc(db, 'playlists', playlistId);
    await updateDoc(playlistRef, {
      songs: arrayUnion(sanitizedSong),
      updatedAt: serverTimestamp()
    });
  };

  const removeSongFromPlaylist = async (playlistId, song) => {
    if (isGuest) {
      setPlaylists(prev => {
        const updated = prev.map(pl => {
          if (pl.id === playlistId) {
            return { ...pl, songs: pl.songs.filter(s => s.id !== song.id) };
          }
          return pl;
        });
        localStorage.setItem('suman_music_playlists_guest', JSON.stringify(updated));
        return updated;
      });
      return;
    }

    const playlistRef = doc(db, 'playlists', playlistId);
    await updateDoc(playlistRef, {
      songs: arrayRemove(song),
      updatedAt: serverTimestamp()
    });
  };

  const updatePlaylist = async (playlistId, updates) => {
    if (isGuest) {
      setPlaylists(prev => {
        const updated = prev.map(pl => {
          if (pl.id === playlistId) {
            return { ...pl, ...updates };
          }
          return pl;
        });
        localStorage.setItem('suman_music_playlists_guest', JSON.stringify(updated));
        return updated;
      });
      return;
    }

    const playlistRef = doc(db, 'playlists', playlistId);
    await updateDoc(playlistRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  };

  const deletePlaylist = async (playlistId) => {
    if (isGuest) {
      setPlaylists(prev => {
        const updated = prev.filter(pl => pl.id !== playlistId);
        localStorage.setItem('suman_music_playlists_guest', JSON.stringify(updated));
        return updated;
      });
      return;
    }

    await deleteDoc(doc(db, 'playlists', playlistId));
  };

  const value = {
    playlists: visiblePlaylists,
    allPlaylists: playlists, // and raw list if needed
    hiddenPlaylistIds,
    loading,
    createPlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist,
    deletePlaylist,
    updatePlaylist,
    hidePlaylist,
    unhidePlaylist
  };

  return (
    <PlaylistContext.Provider value={value}>
      {children}
    </PlaylistContext.Provider>
  );
};

export const usePlaylists = () => useContext(PlaylistContext);
