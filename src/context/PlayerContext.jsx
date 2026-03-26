/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
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
import { doc, setDoc } from 'firebase/firestore';
import { useMediaSession } from '../hooks/useMediaSession';
import { usePlayerSync } from '../hooks/usePlayerSync';
import { usePlayerMetadata } from '../hooks/usePlayerMetadata';

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
  const [isFullScreen, setIsFullScreenInternal] = useState(!!searchParams.get('v'));


  useEffect(() => {
    setIsFullScreenInternal(!!searchParams.get('v'));
  }, [searchParams]);

  const setIsFullScreen = useCallback((expanded) => {
    setIsFullScreenInternal(expanded);
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
    initYouTube,
    getAudioInstance
  } = useAudio();

  const { activeKey, isLoading: loadingGDrive } = useGDrive();
  const wakeLock = useRef(null);

  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator && !wakeLock.current) {
      try {
        wakeLock.current = await navigator.wakeLock.request('screen');
        wakeLock.current.addEventListener('release', () => {
          wakeLock.current = null;
        });
      } catch (err) {
        console.warn('Wake Lock request failed:', err);
      }
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLock.current) {
      wakeLock.current.release();
      wakeLock.current = null;
    }
  }, []);



  const { lyrics, isLyricsLoading, enrichMetadata } = usePlayerMetadata({
    currentSong, setCurrentSong, songs, setSongs, setQueue, isFullScreen, showToast
  });

  usePlayerSync({
    user, isGuest, likedSongs, setLikedSongs, currentSong, queue, currentTime, isPlaying, setSongs,
    isShuffle, repeatMode, librarySource, pause
  });


  useEffect(() => {
    if (isPlaying) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isPlaying) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [isPlaying, requestWakeLock, releaseWakeLock]);

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

      fetchedSongs.sort((a, b) => {
        const timeA = new Date(a.createdTime || 0).getTime();
        const timeB = new Date(b.createdTime || 0).getTime();
        return timeB - timeA;
      });

      if (fetchedSongs.length > 0) {
        setSongs(fetchedSongs);
        setQueue(fetchedSongs);
        
        fetchedSongs.forEach(song => enrichMetadata(song));
      } else {
        setError("No songs found in the specified Drive folder or API not configured.");
      }
    } catch (err) {
      setError("Failed to fetch songs from Google Drive.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
          setSource(restoredSong.url, restoredSong.isYouTube ? restoredSong.videoId : null);
          
          const savedTime = localStorage.getItem('suman_music_last_time');
          if (savedTime && !urlSongId) { // Only restore time if it's not a direct shared link
            const time = parseFloat(savedTime);
            if (time > 0) {
              const onLoaded = () => {
                const audio = getAudioInstance();
                audio.currentTime = time;
                audio.removeEventListener('loadedmetadata', onLoaded);
              };
              getAudioInstance().addEventListener('loadedmetadata', onLoaded);
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
  }, [songs, hasRestored, isLoading, searchParams, setSource, getAudioInstance]);

  useEffect(() => {
    if (!activeKey) return;

    const updateUrl = (song) => {
      let newUrl = song.url;
      if (song.isPersonal && personalDriveToken) {
        if (newUrl.includes('&key=')) {
          newUrl = newUrl.replace(/&key=[^&]+/, `&access_token=${personalDriveToken}`);
        } else if (newUrl.includes('&access_token=')) {
          newUrl = newUrl.replace(/&access_token=[^&]+/, `&access_token=${personalDriveToken}`);
        }
      } else {
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
      const audio = getAudioInstance();
      if (audio && audio.src && audio.src.includes('googleapis.com')) {
        setSource(updatedCurrent.url, updatedCurrent.isYouTube ? updatedCurrent.videoId : null);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setSource(song.url, song.isYouTube ? song.videoId : null);
    play();
  }, [songs, setSource, play]);

  const playQueue = useCallback((newQueue, startSong) => {
    const song = startSong || newQueue[0];
    setQueue(newQueue);
    setCurrentSong(song);
    setSource(song.url, song.isYouTube ? song.videoId : null);
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
    setSource(nextSong.url, nextSong.isYouTube ? nextSong.videoId : null);
    play();
  }, [currentSong, queue, isShuffle, repeatMode, setSource, play, pause]);

  const playPrevious = useCallback(() => {
    if (queue.length === 0) return;
    
    const currentIndex = queue.findIndex(s => s.id === currentSong.id);
    let prevIndex = (currentIndex - 1 + queue.length) % queue.length;
    
    const prevSong = queue[prevIndex];
    setCurrentSong(prevSong);
    setSource(prevSong.url, prevSong.isYouTube ? prevSong.videoId : null);
    play();
  }, [currentSong, queue, setSource, play]);

  useEffect(() => {
    const audio = getAudioInstance();
    const handleEnded = () => {
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play().catch(e => console.warn("Failed to replay:", e));
      } else {
        playNext();
      }
    };

    audio.addEventListener('ended', handleEnded);
    window.addEventListener('youtube-song-ended', handleEnded);
    return () => {
      audio.removeEventListener('ended', handleEnded);
      window.removeEventListener('youtube-song-ended', handleEnded);
    };
  }, [repeatMode, playNext, getAudioInstance]);
  


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
    } catch {
      showToast("Failed to reconnect Google Drive.", "error");
    }
  };


  useMediaSession({ 
    currentSong, isPlaying, currentTime, duration, 
    play, pause, playNext, playPrevious, seek 
  });

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
      initYouTube,
      refreshSongs: loadSongs
    }}>
      {showExpiryModal && <ExpiryModal />}
      {children}
    </PlayerContext.Provider>
  );
};

