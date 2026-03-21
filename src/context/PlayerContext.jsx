import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchSongsFromDrive, fetchPersonalSongsFromDrive } from '../services/googleDrive';
import { fetchExternalMetadata } from '../services/metadata';
import { fetchLyrics, parseLrc } from '../services/lyrics';
import { useAudio } from '../hooks/useAudio';
import { useGDrive } from './GDriveContext';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { AlertTriangle, HardDrive, RefreshCw, X } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';

export const PlayerContext = createContext();

export const PlayerProvider = ({ children }) => {
  const [songs, setSongs] = useState([]);
  const [queue, setQueue] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [isShuffle, setIsShuffle] = useState(() => localStorage.getItem('suman_music_shuffle') === 'true');
  const [repeatMode, setRepeatMode] = useState(() => localStorage.getItem('suman_music_repeat') || 'none');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [optionsSong, setOptionsSong] = useState(null);
  const [librarySource, setLibrarySource] = useState(() => localStorage.getItem('suman_music_library_source') || 'inbuilt');
  const [lyrics, setLyrics] = useState([]);
  const [isLyricsLoading, setIsLyricsLoading] = useState(false);
  const [isLyricsRequested, setIsLyricsRequested] = useState(false);
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [likedSongs, setLikedSongs] = useState(() => {
    const saved = localStorage.getItem('suman_music_liked');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return parsed.map(item => typeof item === 'string' ? item : item.id);
    } catch {
      return [];
    }
  });
  const { user, isGuest, personalDriveToken, disconnectPersonalDrive, connectPersonalDrive } = useAuth();
  
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const isFullScreen = !!searchParams.get('v');
  const setIsFullScreen = useCallback((expanded) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (expanded && currentSong?.id) {
        next.set('v', currentSong.id);
      } else {
        next.delete('v');
      }
      return next;
    }, { replace: true });
  }, [currentSong?.id, setSearchParams]);

  const {
    isPlaying,
    currentTime,
    duration,
    progress,
    volume,
    setVolume,
    setSource,
    play,
    pause,
    toggle: togglePlay,
    seek,
    isBuffering,
    audioInstance
  } = useAudio();

  const { activeKey, isLoading: loadingGDrive } = useGDrive();

  const loadSongs = useCallback(async () => {
    if (loadingGDrive) return;
    setIsLoading(true);
    setError(null);
    try {
      let fetchedSongs = [];
      let ibSongs = [];
      let pdSongs = [];

      try {
        if (librarySource === 'inbuilt' || librarySource === 'hybrid') {
          ibSongs = await fetchSongsFromDrive(activeKey);
        }
      } catch (e) {
        console.warn("Failed fetching inbuilt songs", e);
      }

      try {
        if ((librarySource === 'personal' || librarySource === 'hybrid') && personalDriveToken) {
          pdSongs = await fetchPersonalSongsFromDrive(personalDriveToken);
        }
      } catch (e) {
        console.warn("Failed fetching personal songs", e);
        if (e.message.includes("Token Expired")) {
          disconnectPersonalDrive();
          setError("Google Drive session expired. Please reconnect.");
          showToast("Google Drive session expired.", "error");
          setShowExpiryModal(true);
        }
      }

      if (librarySource === 'hybrid') {
        fetchedSongs = [...ibSongs, ...pdSongs];
      } else if (librarySource === 'personal') {
        fetchedSongs = pdSongs;
      } else {
        fetchedSongs = ibSongs;
      }

      if (fetchedSongs.length > 0) {
        setSongs(fetchedSongs);
        setQueue(fetchedSongs); // Default queue to all songs
        
        fetchedSongs.forEach(async (song) => {
          try {
            const metadata = await fetchExternalMetadata(song.artist, song.title);
            if (metadata) {
              setSongs(prevSongs => {
                const songIndex = prevSongs.findIndex(s => s.id === song.id);
                if (songIndex === -1) return prevSongs;

                const updatedSongs = [...prevSongs];
                updatedSongs[songIndex] = {
                  ...updatedSongs[songIndex],
                  title: metadata.title || updatedSongs[songIndex].title,
                  artist: metadata.artist || updatedSongs[songIndex].artist,
                  album: metadata.album,
                  year: metadata.year,
                  genre: metadata.genre,
                  cover: metadata.cover || updatedSongs[songIndex].cover
                };
                
                return updatedSongs;
              });

              setQueue(prevQueue => {
                const songIndex = prevQueue.findIndex(s => s.id === song.id);
                if (songIndex === -1) return prevQueue;

                const updatedQueue = [...prevQueue];
                updatedQueue[songIndex] = {
                  ...updatedQueue[songIndex],
                  title: metadata.title || updatedQueue[songIndex].title,
                  artist: metadata.artist || updatedQueue[songIndex].artist,
                  album: metadata.album,
                  year: metadata.year,
                  genre: metadata.genre,
                  cover: metadata.cover || updatedQueue[songIndex].cover
                };
                return updatedQueue;
              });

              setCurrentSong(prevCurrent => {
                if (prevCurrent?.id === song.id) {
                  return {
                    ...prevCurrent,
                    title: metadata.title || prevCurrent.title,
                    artist: metadata.artist || prevCurrent.artist,
                    album: metadata.album,
                    year: metadata.year,
                    genre: metadata.genre,
                    cover: metadata.cover || prevCurrent.cover
                  };
                }
                return prevCurrent;
              });
            }
          } catch (enrichErr) {
            console.error("Failed to enrich metadata for song:", song.title, enrichErr);
          }
        });
      } else {
        setError("No songs found in the specified Drive folder or API not configured.");
      }
    } catch (err) {
      setError("Failed to fetch songs from Google Drive.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [setSource, activeKey, loadingGDrive, librarySource, personalDriveToken, disconnectPersonalDrive, showToast]);

  const [hasRestored, setHasRestored] = useState(false);
  useEffect(() => {
    if (songs.length > 0 && !hasRestored && !isLoading) {
      const urlSongId = searchParams.get('v');
      const lastSongId = urlSongId || localStorage.getItem('suman_music_last_song_id');
      const lastQueueIds = localStorage.getItem('suman_music_last_queue_ids');


      if (lastSongId) {
        const restoredSong = songs.find(s => s.id === lastSongId);
        if (restoredSong) {
          setCurrentSong(restoredSong);
          setSource(restoredSong.url);
          
          const savedTime = localStorage.getItem('suman_music_last_time');
          if (savedTime && !urlSongId) { // Only restore time if it's not a direct shared link
            const time = parseFloat(savedTime);
            if (time > 0) {
              const onLoaded = () => {
                audioInstance.currentTime = time;
                audioInstance.removeEventListener('loadedmetadata', onLoaded);
              };
              audioInstance.addEventListener('loadedmetadata', onLoaded);
            }
          }
          
          if (lastQueueIds) {
            try {
              const ids = JSON.parse(lastQueueIds);
              const restoredQueue = ids.map(id => songs.find(s => s.id === id)).filter(Boolean);
              if (restoredQueue.length > 0) {
                setQueue(restoredQueue);
              }
            } catch (e) {
              console.warn("Failed to restore queue", e);
            }
          }
        }
      }
      setHasRestored(true);
    }
  }, [songs, hasRestored, isLoading, searchParams, setSource, audioInstance]);

  useEffect(() => {
    if (!activeKey) return;

    const updateUrl = (song) => {
      let newUrl = song.url;
      if (song.isPersonal && personalDriveToken) {
        // Only use access token for personal songs
        if (newUrl.includes('&key=')) {
          newUrl = newUrl.replace(/&key=[^&]+/, `&access_token=${personalDriveToken}`);
        } else if (newUrl.includes('&access_token=')) {
          newUrl = newUrl.replace(/&access_token=[^&]+/, `&access_token=${personalDriveToken}`);
        }
      } else {
        // Use API key for inbuilt/public songs
        if (newUrl.includes('&access_token=')) {
          newUrl = newUrl.replace(/&access_token=[^&]+/, `&key=${activeKey}`);
        } else if (newUrl.includes('&key=')) {
          newUrl = newUrl.replace(/&key=[^&]+/, `&key=${activeKey}`);
        }
      }
      return { ...song, url: newUrl };
    };

    setSongs(prev => prev.map(updateUrl));
    setQueue(prev => prev.map(updateUrl));
    if (currentSong) {
      const updatedCurrent = updateUrl(currentSong);
      setCurrentSong(updatedCurrent);
      if (audioInstance.src && audioInstance.src.includes('googleapis.com')) {
        setSource(updatedCurrent.url);
      }
    }
  }, [activeKey, personalDriveToken]);

  useEffect(() => {
    let ignore = false;
    
    const init = async () => {
      if (!ignore) {
        await loadSongs();
      }
    };

    init();

    return () => {
      ignore = true;
    };
  }, [loadSongs]);

  const playSong = useCallback((song) => {
    setCurrentSong(song);
    setQueue(songs); 
    setSource(song.url);
    play();
  }, [songs, setSource, play]);

  const playQueue = useCallback((newQueue, startSong) => {
    setQueue(newQueue);
    setCurrentSong(startSong || newQueue[0]);
    setSource((startSong || newQueue[0]).url);
    play();
  }, [setSource, play]);

  const playNext = useCallback(() => {
    if (queue.length === 0) return;
    
    const currentIndex = queue.findIndex(s => s.id === currentSong.id);
    let nextIndex;
    
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      nextIndex = (currentIndex + 1) % queue.length;
      if (nextIndex === 0 && repeatMode === 'none') {
        pause();
        return;
      }
    }
    
    const nextSong = queue[nextIndex];
    setCurrentSong(nextSong);
    setSource(nextSong.url);
    play();
  }, [currentSong, queue, isShuffle, repeatMode, setSource, play, pause]);

  const playPrevious = useCallback(() => {
    if (queue.length === 0) return;
    
    const currentIndex = queue.findIndex(s => s.id === currentSong.id);
    let prevIndex = (currentIndex - 1 + queue.length) % queue.length;
    
    const prevSong = queue[prevIndex];
    setCurrentSong(prevSong);
    setSource(prevSong.url);
    play();
  }, [currentSong, queue, setSource, play]);

  useEffect(() => {
    const handleEnded = () => {
      if (repeatMode === 'one') {
        audioInstance.currentTime = 0;
        audioInstance.play();
      } else {
        playNext();
      }
    };

    audioInstance.addEventListener('ended', handleEnded);
    return () => audioInstance.removeEventListener('ended', handleEnded);
  }, [repeatMode, playNext, audioInstance]);
  
  useEffect(() => {
    localStorage.setItem('suman_music_liked', JSON.stringify(likedSongs));
  }, [likedSongs]);

  useEffect(() => {
    localStorage.setItem('suman_music_shuffle', isShuffle.toString());
  }, [isShuffle]);

  useEffect(() => {
    localStorage.setItem('suman_music_library_source', librarySource);
  }, [librarySource]);

  useEffect(() => {
    localStorage.setItem('suman_music_repeat', repeatMode);
  }, [repeatMode]);


  useEffect(() => {
    if (isFullScreen && currentSong?.id) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        if (next.get('v') !== currentSong.id) {
          next.set('v', currentSong.id);
          return next;
        }
        return prev; // No change
      }, { replace: true });
    }
  }, [currentSong?.id, isFullScreen, setSearchParams]);

  useEffect(() => {
    if (currentSong?.id) {
      localStorage.setItem('suman_music_last_song_id', currentSong.id);
    }
  }, [currentSong]);

  useEffect(() => {
    if (queue.length > 0) {
      const ids = queue.map(s => s.id).filter(id => id && !id.startsWith('placeholder'));
      if (ids.length > 0) {
        localStorage.setItem('suman_music_last_queue_ids', JSON.stringify(ids));
      }
    }
  }, [queue]);

  useEffect(() => {
    if (currentTime > 0 && isPlaying) {
      localStorage.setItem('suman_music_last_time', currentTime.toString());
    }
  }, [currentTime, isPlaying]);
  
  useEffect(() => {
    if (!currentSong || currentSong.isPlaceholder || !isFullScreen) {
      setLyrics([]);
      return;
    }

    const loadLyrics = async () => {
      setIsLyricsLoading(true);
      try {
        const data = await fetchLyrics(currentSong.artist, currentSong.title, currentSong.album);
        if (data && data.syncedLyrics) {
          setLyrics(parseLrc(data.syncedLyrics));
        } else if (data && data.plainLyrics) {
          // Fallback to plain lyrics as a single item with time 0 if not synced
          setLyrics([{ time: 0, text: data.plainLyrics }]);
        } else {
          setLyrics([]);
        }
      } catch (err) {
        console.error("Failed to load lyrics:", err);
        setLyrics([]);
      } finally {
        setIsLyricsLoading(false);
      }
    };

    loadLyrics();
  }, [currentSong?.id, isFullScreen]);

  const prevUserUid = useRef(user?.uid);

  // Handle logout or account switch: pause music and clear state
  useEffect(() => {
    if (prevUserUid.current !== user?.uid) {
      if (prevUserUid.current) {
        pause();
        setCurrentSong(null);
        setQueue([]);
        setSongs([]);
        setLyrics([]);
        localStorage.removeItem('suman_music_last_song_id');
        localStorage.removeItem('suman_music_last_queue_ids');
        localStorage.removeItem('suman_music_last_time');
      }
      prevUserUid.current = user?.uid;
    }
  }, [user?.uid, pause]);

  useEffect(() => {
    if ('mediaSession' in navigator && currentSong) {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artist,
        album: currentSong.album || '',
        artwork: [
          { src: currentSong.cover || '/logo512.png', sizes: '96x96', type: 'image/png' },
          { src: currentSong.cover || '/logo512.png', sizes: '128x128', type: 'image/png' },
          { src: currentSong.cover || '/logo512.png', sizes: '192x192', type: 'image/png' },
          { src: currentSong.cover || '/logo512.png', sizes: '256x256', type: 'image/png' },
          { src: currentSong.cover || '/logo512.png', sizes: '384x384', type: 'image/png' },
          { src: currentSong.cover || '/logo512.png', sizes: '512x512', type: 'image/png' },
        ],
      });
    }
  }, [currentSong]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  useEffect(() => {
    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession && duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: duration,
          playbackRate: 1,
          position: currentTime
        });
      } catch (e) {
        console.warn("Failed to set MediaSession position state", e);
      }
    }
  }, [currentTime, duration]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', play);
      navigator.mediaSession.setActionHandler('pause', pause);
      navigator.mediaSession.setActionHandler('previoustrack', playPrevious);
      navigator.mediaSession.setActionHandler('nexttrack', playNext);
      navigator.mediaSession.setActionHandler('seekbackward', () => seek(Math.max(0, currentTime - 10)));
      navigator.mediaSession.setActionHandler('seekforward', () => seek(Math.min(duration, currentTime + 10)));
      
      try {
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime !== undefined) {
            seek(details.seekTime);
          }
        });
      } catch (error) {
        console.warn('The "seekto" media session action is not supported.');
      }
    }
    
    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('seekbackward', null);
        navigator.mediaSession.setActionHandler('seekforward', null);
        navigator.mediaSession.setActionHandler('seekto', null);
      }
    };
  }, [play, pause, playPrevious, playNext, seek, currentTime, duration]);

  useEffect(() => {
    if (!user || isGuest) return;

    const userRef = doc(db, 'users', user.uid);
    
    // Initial sync / migration
    const syncInitial = async () => {
      try {
        const docSnap = await getDoc(userRef);
        let cloudLikedIds = [];
        if (docSnap.exists() && docSnap.data().likedSongs) {
          // Migration: handles both string IDs and old object format
          cloudLikedIds = docSnap.data().likedSongs.map(item => 
            typeof item === 'string' ? item : item.id
          );
        }

        // Migration: Merge local IDs into cloud
        const localIds = likedSongs.map(item => typeof item === 'string' ? item : item.id);
        const merged = Array.from(new Set([...cloudLikedIds, ...localIds]));
        
        if (merged.length > cloudLikedIds.length) {
          await setDoc(userRef, { likedSongs: merged }, { merge: true });
        }
        setLikedSongs(merged);
      } catch (err) {
        console.error("Error syncing favorites with cloud:", err);
      }
    };

    syncInitial();

    // Real-time listener from other devices
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists() && doc.data().likedSongs) {
        const cloudIds = doc.data().likedSongs.map(item => 
          typeof item === 'string' ? item : item.id
        );
        // Only update if different to avoid loops
        setLikedSongs(prev => {
          if (JSON.stringify(prev) === JSON.stringify(cloudIds)) return prev;
          return cloudIds;
        });
      }
    });

    return () => unsubscribe();
  }, [user?.uid, isGuest]);

  const toggleLike = useCallback(async (songOrId) => {
    const songId = typeof songOrId === 'string' ? songOrId : songOrId.id;
    const newLiked = [...likedSongs];
    const isLiked = newLiked.includes(songId);
    let updated;
    
    if (isLiked) {
      updated = newLiked.filter(id => id !== songId);
    } else {
      updated = [...newLiked, songId];
    }

    setLikedSongs(updated);

    if (user && !isGuest) {
      try {
        await setDoc(doc(db, 'users', user.uid), { likedSongs: updated }, { merge: true });
      } catch (err) {
        console.error("Failed to sync like to Firebase:", err);
      }
    }
  }, [likedSongs, user, isGuest]);

  const handleReconnect = async () => {
    try {
      await connectPersonalDrive();
      setShowExpiryModal(false);
      showToast("Personal Google Drive Reconnected!", "success");
      setTimeout(() => loadSongs(), 500);
    } catch (err) {
      showToast("Failed to reconnect Google Drive.", "error");
    }
  };

  const ExpiryModal = () => (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden pointer-events-auto">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" 
        onClick={() => setShowExpiryModal(false)} 
      />
      <div className="relative w-full max-w-sm bg-[#151515] border border-white/10 rounded-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-5 duration-300 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-blue-500 to-primary animate-pulse" />
        
        <div className="p-6 pt-8 text-center flex flex-col items-center">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
            <div className="relative w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group">
              <HardDrive className="w-8 h-8 group-hover:scale-110 transition-transform" />
              <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-1 border-2 border-[#151515]">
                <AlertTriangle className="w-2.5 h-2.5 text-white" />
              </div>
            </div>
          </div>
          
          <h2 className="text-xl font-black text-white mb-2">Session Expired</h2>
          <p className="text-sm text-zinc-400 font-medium leading-relaxed px-4">
            Your connection to Google Drive has expired. Re-authenticate to access your personal tracks.
          </p>
          
          <div className="w-full flex flex-col gap-2 mt-8">
            <button 
              onClick={handleReconnect}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-primary text-black font-black text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_10px_20px_-10px_rgba(255,255,255,0.2)]"
            >
              <RefreshCw className="w-4 h-4 animate-[spin_3s_linear_infinite]" />
              Reconnect Google Drive
            </button>
            <button 
              onClick={() => setShowExpiryModal(false)}
              className="w-full py-3 text-xs font-bold text-zinc-500 hover:text-white transition-colors"
            >
              Remind me later
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <PlayerContext.Provider value={{
      songs,
      queue,
      currentSong,
      isPlaying,
      progress,
      currentTime,
      duration,
      volume,
      isShuffle,
      repeatMode,
      isLoading,
      error,
      togglePlay,
      playSong,
      playQueue,
      playNext,
      playPrevious,
      seek,
      setVolume,
      setIsShuffle,
      setRepeatMode,
      isBuffering,
      optionsSong,
      setOptionsSong,
      librarySource,
      setLibrarySource,
      likedSongs,
      toggleLike,
      lyrics,
      isLyricsLoading,
      isLyricsRequested,
      setIsLyricsRequested,
      isFullScreen,
      setIsFullScreen,
      refreshSongs: loadSongs
    }}>
      {showExpiryModal && <ExpiryModal />}
      {children}
    </PlayerContext.Provider>
  );
};

