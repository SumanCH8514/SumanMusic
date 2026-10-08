import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Heart, Play, Pause, Clock, MoreHorizontal, ListMusic, LayoutGrid, List, Music2, Trash2, Music, Globe, Lock, Share2, PlayCircle, ArrowLeft, Square, EyeOff, Loader2, HardDrive } from 'lucide-react';
import { usePlayer } from '../context/usePlayer';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePlaylists } from '../context/PlaylistContext';
import PlayingVisualizer from '../components/PlayingVisualizer';
import SongImage from '../components/SongImage';
import ArtistAvatar from '../components/ArtistAvatar';
import { useInViewEnrichment } from '../hooks/useInViewEnrichment';
import { cleanArtistName, isValidArtistName, isGenericImage } from '../services/artistService';
import { getOfflineTracks, isTrackOffline } from '../lib/offlineStorage';
import { LibrarySkeleton } from '../components/Skeleton';

const filters = ['Tracks', 'Offline', 'Recent', 'Artists', 'Albums', 'Playlists', 'Liked'];
const PAGE_SIZE = 30;

const SongItem = React.memo(({ 
    song, index, showIndex, viewMode = 'list', currentSong, isPlaying, activeFilter, 
    selectedPlaylist, selectedAlbum, selectedArtist, 
    playSong, playQueue, enrichMetadata, setOptionsSong 
}) => {
    const enrichmentRef = useInViewEnrichment(song, enrichMetadata);
    const isCurrent = currentSong?.id === song.id;

    const handleClick = () => {
      if (activeFilter === 'Playlists' && selectedPlaylist) {
        playQueue(selectedPlaylist.songs, song);
      } else if (activeFilter === 'Albums' && selectedAlbum) {
        playQueue(selectedAlbum.songs, song);
      } else if (activeFilter === 'Artists' && selectedArtist) {
        playQueue(selectedArtist.songs, song);
      } else {
        playSong(song);
      }
    };

    if (viewMode === 'grid') {
      return (
        <motion.div 
          layout
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.02 * (index % PAGE_SIZE) }}
          ref={enrichmentRef}
          key={song.id} 
          className={cn(
            "group/card relative flex flex-col gap-2.5 p-3 rounded-2xl border transition-all duration-300 cursor-pointer select-none",
            isCurrent
              ? "bg-primary/10 border-primary/40 shadow-[0_0_20px_rgba(var(--primary-rgb),0.15)] ring-1 ring-primary/30"
              : "bg-bg-surface/40 hover:bg-bg-surface border-border-main/10 hover:border-border-main/25 hover:shadow-xl"
          )}
          onClick={handleClick}
        >
          <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-bg-surface shadow-md">
            <SongImage 
              src={song.thumbnail || song.cover} 
              alt={song.title} 
              className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105" 
            />

            <div className={cn(
              "absolute bottom-2.5 right-2.5 transition-all duration-200 shadow-xl",
              isCurrent 
                ? "opacity-100 translate-y-0" 
                : "opacity-0 translate-y-2 group-hover/card:opacity-100 group-hover/card:translate-y-0"
            )}>
              <div className="w-10 h-10 bg-primary text-black rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform">
                {isCurrent && isPlaying ? (
                  <Pause className="w-4 h-4 fill-black text-black" />
                ) : (
                  <Play className="w-4 h-4 ml-0.5 fill-black text-black" />
                )}
              </div>
            </div>

            {isCurrent && !isPlaying && (
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-primary text-black text-[10px] font-black uppercase tracking-wider shadow-md">
                Paused
              </div>
            )}
          </div>

          <div className="flex items-start justify-between gap-1.5 min-w-0 px-0.5">
            <div className="min-w-0 flex-1">
              <h3 className={cn(
                "text-sm font-bold truncate transition-colors",
                isCurrent ? "text-primary font-black" : "text-text-primary group-hover/card:text-primary"
              )}>
                {song.title}
              </h3>
              <p className="text-xs text-text-secondary truncate mt-0.5 font-medium flex items-center gap-1">
                {song.artist || "Unknown Artist"}
                {isTrackOffline(song.id) && (
                  <HardDrive className="w-3 h-3 text-primary shrink-0" title="Saved offline" />
                )}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOptionsSong(song);
              }}
              className="p-1 rounded-lg text-text-secondary opacity-0 group-hover/card:opacity-100 hover:text-text-primary hover:bg-black/10 dark:hover:bg-white/10 transition-all shrink-0 mt-0.5"
              title="More options"
              aria-label="More options"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div 
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.03 * (index % PAGE_SIZE) }}
        ref={enrichmentRef}
        key={song.id} 
        className={cn(
          "flex group cursor-pointer transition-all duration-300 border border-transparent items-center gap-4 hover:bg-white/5 p-3 rounded-2xl md:hover:bg-bg-surface/80",
          isCurrent && "bg-primary/5 md:bg-primary/5 border-primary/20"
        )}
        onClick={handleClick}
      >
         {showIndex ? (
           <div className="w-6 text-center text-sm font-medium text-text-secondary pr-1">
             {index + 1}
           </div>
         ) : (
           <div className={cn(
              "rounded-xl overflow-hidden bg-bg-surface shadow-md relative shrink-0",
              "w-12 h-12"
            )}>
              <SongImage src={song.thumbnail || song.cover} alt={song.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              {isCurrent && isPlaying ? (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                   <PlayingVisualizer className="h-5 gap-[2px]" />
                </div>
              ) : (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                   <Play className="w-6 h-6 text-white fill-current" />
                </div>
              )}
           </div>
         )}
         <div className="flex-1 min-w-0 py-1">
            <p className={cn(
              "font-bold truncate text-base mb-0.5",
              isCurrent ? "text-primary" : "text-text-primary"
            )}>{song.title}</p>
            <p className="text-xs text-text-secondary truncate font-medium opacity-80 flex items-center gap-1.5">
              {song.artist}
              {isTrackOffline(song.id) && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-primary bg-primary/10 px-1 py-0.2 rounded shrink-0">
                  <HardDrive className="w-2.5 h-2.5" />
                  Offline
                </span>
              )}
            </p>
         </div>
         <div className="ml-auto flex items-center gap-2">
            <MoreHorizontal 
              className="w-5 h-5 text-text-secondary opacity-60 hover:opacity-100 transition-opacity cursor-pointer hover:text-text-primary" 
              onClick={(e) => {
                e.stopPropagation();
                setOptionsSong(song);
              }}
            />
          </div>
      </motion.div>
    );
}, (prev, next) => {
    return (
        prev.song.id === next.song.id &&
        prev.song.album === next.song.album &&
        prev.isPlaying === next.isPlaying &&
        (prev.currentSong?.id === next.currentSong?.id) &&
        prev.index === next.index &&
        prev.showIndex === next.showIndex &&
        prev.activeFilter === next.activeFilter &&
        prev.viewMode === next.viewMode
    );
});

const Library = () => {
  const { songs, playSong, playQueue, currentSong, isPlaying, setOptionsSong, likedSongs, enrichMetadata, isLoading } = usePlayer();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { playlists, deletePlaylist, updatePlaylist, hidePlaylist } = usePlaylists();
  const [activeFilter, setActiveFilter] = useState(searchParams.get('filter') || 'Tracks');
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('suman_music_library_view_mode') || 'grid';
  });
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [showEntityMenu, setShowEntityMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [artistInfo, setArtistInfo] = useState(null);
  const [loadingArtistInfo, setLoadingArtistInfo] = useState(false);
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [listScrollPos, setListScrollPos] = useState(0);
  const activeFilterRef = useRef(null);
  
  const [visibleTracks, setVisibleTracks] = useState(PAGE_SIZE);
  const [visibleArtists, setVisibleArtists] = useState(PAGE_SIZE);
  const [visibleAlbums, setVisibleAlbums] = useState(PAGE_SIZE);
  const [visiblePlaylistItems, setVisiblePlaylistItems] = useState(PAGE_SIZE);
  const [visibleRecent, setVisibleRecent] = useState(PAGE_SIZE);
  const [visibleLiked, setVisibleLiked] = useState(PAGE_SIZE);
  const [offlineUpdatedVersion, setOfflineUpdatedVersion] = useState(0);

  useEffect(() => {
    const onOfflineUpdated = () => setOfflineUpdatedVersion(v => v + 1);
    window.addEventListener('sumanmusic-offline-updated', onOfflineUpdated);
    return () => window.removeEventListener('sumanmusic-offline-updated', onOfflineUpdated);
  }, []);

  const offlineTracks = useMemo(() => {
    return activeFilter === 'Offline' ? getOfflineTracks() : [];
  }, [activeFilter, offlineUpdatedVersion]);

  const loadMoreRef = useRef(null);

  useEffect(() => {
    if (activeFilterRef.current) {
      activeFilterRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [activeFilter]);


  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  React.useEffect(() => {
    const filter = searchParams.get('filter');

    if (filter && filters.includes(filter)) {
      setActiveFilter(filter);
    }
  }, [searchParams]);

  const artistList = useMemo(() => {
    const artists = songs.reduce((acc, song) => {
      const rawArtist = song.artist || 'Unknown Artist';
      const individualArtists = rawArtist.split(/\s*,\s*|\s*&\s*|\s+and\s+|\s+feat\.?\s+|\s+ft\.?\s+/i)
        .map(name => cleanArtistName(name))
        .filter(name => isValidArtistName(name));

      individualArtists.forEach(artistName => {
        if (!acc[artistName]) {
          acc[artistName] = {
            name: artistName,
            songs: [],
            cover: !isGenericImage(song.cover) ? song.cover : null
          };
        }
        if (!acc[artistName].cover && !isGenericImage(song.cover)) {
          acc[artistName].cover = song.cover;
        }
        if (!acc[artistName].songs.find(s => s.id === song.id)) {
          acc[artistName].songs.push(song);
        }
      });
      return acc;
    }, {});
    return Object.values(artists).sort((a, b) => a.name.localeCompare(b.name));
  }, [songs]);

  const albumList = useMemo(() => {
    const albums = songs.reduce((acc, song) => {
      const albumName = song.album || 'Unknown Album';
      const artistName = song.artist || 'Unknown Artist';
      
      if (!acc[albumName]) {
        acc[albumName] = {
          name: albumName,
          artists: new Set(),
          songs: [],
          cover: song.cover
        };
      }
      
      const individualArtists = artistName.split(/\s*,\s*|\s*&\s*|\s+and\s+/i)
        .map(name => name.trim())
        .filter(name => name.length > 0);
      
      individualArtists.forEach(artist => acc[albumName].artists.add(artist));
      acc[albumName].songs.push(song);
      return acc;
    }, {});

    return Object.values(albums).map(album => ({
      ...album,
      artist: Array.from(album.artists).join(', ')
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [songs]);

  const sortedSongs = useMemo(() => {
    return [...songs].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  }, [songs]);

  React.useEffect(() => {
    const idParam = searchParams.get('id');
    const nameParam = searchParams.get('name');
    const trackIdParam = searchParams.get('trackId');
    const filter = searchParams.get('filter');
    const artistParam = searchParams.get('artist');
    const albumParam = searchParams.get('album');

    if (filter === 'Playlists') {
      if (idParam || nameParam) {
        const playlist = playlists.find(p => p.id === idParam || p.name === nameParam);
        if (playlist && playlist.id !== selectedPlaylist?.id) {
          setSelectedPlaylist(playlist);
          document.querySelector('.overflow-y-auto')?.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else if (selectedPlaylist !== null) {
        setSelectedPlaylist(null);
      }
    } else if (selectedPlaylist !== null) {
      setSelectedPlaylist(null);
    }

    if (filter === 'Artists') {
      if (artistParam) {
        const artist = artistList.find(a => a.name === artistParam);
        if (artist && artist.name !== selectedArtist?.name) {
          setSelectedArtist(artist);
          document.querySelector('.overflow-y-auto')?.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else if (selectedArtist !== null) {
        setSelectedArtist(null);
      }
    } else if (selectedArtist !== null) {
      setSelectedArtist(null);
    }

    if (filter === 'Albums') {
      if (albumParam) {
        const album = albumList.find(a => a.name === albumParam && (!artistParam || a.artist === artistParam));
        if (album && album.name !== selectedAlbum?.name) {
          setSelectedAlbum(album);
          document.querySelector('.overflow-y-auto')?.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else if (selectedAlbum !== null) {
        setSelectedAlbum(null);
      }
    } else if (selectedAlbum !== null) {
      setSelectedAlbum(null);
    }

    if (trackIdParam && filter === 'Tracks') {
      const song = songs.find(s => s.id === trackIdParam);
      if (song && currentSong?.id !== song.id) {
        playSong(song);
        showToast("Shared song loaded! Tap play to start listening.");
      }
    }
  }, [searchParams, artistList, albumList, playlists, songs, playSong, currentSong, selectedPlaylist, selectedArtist, selectedAlbum]);

  React.useEffect(() => {
    if (!selectedArtist && !selectedAlbum && !selectedPlaylist && listScrollPos > 0) {
      setTimeout(() => {
        const scrollContainer = document.querySelector('.overflow-y-auto');
        if (scrollContainer) scrollContainer.scrollTo({ top: listScrollPos });
      }, 10);
    }
  }, [selectedArtist, selectedAlbum, selectedPlaylist, listScrollPos]);

  React.useEffect(() => {
    const fetchArtistDetails = async (name) => {
      setLoadingArtistInfo(true);
      setIsBioExpanded(false);
      
      const tryFetch = async (searchName) => {
        try {
          const res = await fetch(`https://www.theaudiodb.com/api/v1/json/2/search.php?s=${encodeURIComponent(searchName)}`);
          const data = await res.json();
          return data.artists && data.artists.length > 0 ? data.artists[0] : null;
        } catch (err) {
          console.error(`Error fetching artist info for ${searchName}:`, err);
          return null;
        }
      };

      let info = await tryFetch(name);
      
      if (!info && name.includes('.')) {
        info = await tryFetch(name.replace(/\./g, ''));
      }
      
      if (!info && name.includes('.')) {
        info = await tryFetch(name.replace(/\./g, '. ').replace(/\s\s+/g, ' ').trim());
      }

      setArtistInfo(info);
      setLoadingArtistInfo(false);
    };

    if (activeFilter === 'Artists' && selectedArtist) {
      fetchArtistDetails(selectedArtist.name);
    } else {
      setArtistInfo(null);
    }
  }, [selectedArtist, activeFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisibleTracks(PAGE_SIZE);
      setVisibleArtists(PAGE_SIZE);
      setVisibleAlbums(PAGE_SIZE);
      setVisiblePlaylistItems(PAGE_SIZE);
      setVisibleRecent(PAGE_SIZE);
      setVisibleLiked(PAGE_SIZE);
    }, 0);
    const scrollContainer = document.querySelector('.overflow-y-auto');
    if (scrollContainer) scrollContainer.scrollTo({ top: 0 });
    return () => clearTimeout(timer);
  }, [activeFilter, selectedArtist, selectedAlbum, selectedPlaylist]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        if (activeFilter === 'Tracks') setVisibleTracks(prev => prev + PAGE_SIZE);
        else if (activeFilter === 'Artists') setVisibleArtists(prev => prev + PAGE_SIZE);
        else if (activeFilter === 'Albums') setVisibleAlbums(prev => prev + PAGE_SIZE);
        else if (activeFilter === 'Recent') setVisibleRecent(prev => prev + PAGE_SIZE);
        else if (activeFilter === 'Liked') setVisibleLiked(prev => prev + PAGE_SIZE);
        else if (activeFilter === 'Playlists' && selectedPlaylist) setVisiblePlaylistItems(prev => prev + PAGE_SIZE);
        else if (activeFilter === 'Playlists') setVisiblePlaylistItems(prev => prev + PAGE_SIZE);
      }
    }, { threshold: 0.1 });

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [activeFilter, selectedPlaylist]);

  const renderSong = (song, index, showIndex = false) => (
    <SongItem 
      key={song.id} 
      song={song} 
      index={index} 
      showIndex={showIndex} 
      viewMode={viewMode}
      currentSong={currentSong}
      isPlaying={isPlaying}
      activeFilter={activeFilter}
      selectedPlaylist={selectedPlaylist}
      selectedAlbum={selectedAlbum}
      selectedArtist={selectedArtist}
      playSong={playSong}
      playQueue={playQueue}
      enrichMetadata={enrichMetadata}
      setOptionsSong={setOptionsSong}
    />
  );

  if (isLoading && (!songs || songs.length === 0)) {
    return <LibrarySkeleton viewMode={viewMode} />;
  }

  return (
    <div className="flex flex-col gap-8 pb-48 pt-4">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("flex items-center justify-between", (selectedArtist || selectedAlbum || selectedPlaylist) && "hidden md:flex")}
      >
        <h1 className="text-3xl md:text-4xl font-black text-text-primary tracking-tight">Library.</h1>
        <div className="flex items-center gap-3">
           <button 
            onClick={() => navigate('/app/search')}
            className="p-3 rounded-full bg-bg-surface border border-border-main/10 text-text-secondary hover:text-primary transition-all hover:scale-110 active:scale-95 shadow-lg"
           >
              <Search className="w-5 h-5" />
           </button>
           <div className="w-[1px] h-6 bg-border-main/10 mx-1" />
           <button 
              className="p-3 rounded-full bg-bg-surface border border-border-main/10 text-text-secondary hover:text-primary transition-all hover:scale-110 active:scale-95 shadow-lg"
              onClick={() => {
                const next = viewMode === 'list' ? 'grid' : 'list';
                setViewMode(next);
                localStorage.setItem('suman_music_library_view_mode', next);
              }}
              title={viewMode === 'list' ? "Switch to Grid View" : "Switch to List View"}
              aria-label={viewMode === 'list' ? "Switch to Grid View" : "Switch to List View"}
            >
              {viewMode === 'list' ? <LayoutGrid className="w-5 h-5" /> : <List className="w-5 h-5" />}
            </button>
        </div>
      </motion.div>

      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4 -mx-1 px-1">
         {filters.map(filter => (
           <button 
             key={filter}
             ref={activeFilter === filter ? activeFilterRef : null}
             onClick={() => {
               const scrollContainer = document.querySelector('.overflow-y-auto');
               if (scrollContainer) scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
               setSearchParams({ filter });
               setSelectedArtist(null);
               setSelectedAlbum(null);
               setSelectedPlaylist(null);
               setListScrollPos(0);
             }}
             className={cn(
               "px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm",
               activeFilter === filter 
                ? "bg-primary text-black shadow-primary/20" 
                : "bg-bg-surface text-text-secondary hover:text-text-primary border border-border-main/10 hover:border-primary/30"
             )}
           >
             {filter}
           </button>
         ))}
      </div>

      <div className={cn(
        viewMode === 'list' ? "space-y-4" : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
      )}>
         {(activeFilter === 'Tracks' || activeFilter === 'All') && !selectedArtist && !selectedAlbum ? (
            <>
              {sortedSongs.slice(0, visibleTracks).map((song, i) => renderSong(song, i))}
              {sortedSongs.length > visibleTracks && (
                <div ref={loadMoreRef} className="col-span-full h-32 w-full flex flex-col items-center justify-center gap-3 py-10 opacity-60">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary">Loading more tracks...</p>
                </div>
              )}
            </>
         ) : activeFilter === 'Offline' ? (
            offlineTracks.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20 gap-3 text-center">
                <Music2 className="w-12 h-12 text-text-secondary/40" />
                <p className="text-base font-bold text-text-primary">No offline tracks yet</p>
                <p className="text-xs text-text-secondary max-w-xs">
                  Save tracks for offline playback from the song options menu to listen anywhere without internet.
                </p>
              </div>
            ) : (
              <>
                {offlineTracks.map((song, i) => renderSong(song, i))}
              </>
            )
         ) : activeFilter === 'Recent' ? (
            <>
              {[...songs]
                .sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime))
                .slice(0, visibleRecent)
                .map((song, i) => renderSong(song, i))}
              {songs.length > visibleRecent && (
                <div ref={loadMoreRef} className="col-span-full h-32 w-full flex flex-col items-center justify-center gap-3 py-10 opacity-60">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary">Loading more tracks...</p>
                </div>
              )}
            </>
         ) : activeFilter === 'Playlists' ? (
          selectedPlaylist ? (
            <div className="col-span-full space-y-4">
              <motion.button 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => {
                  setSearchParams(prev => {
                    const next = new URLSearchParams(prev);
                    next.delete('id');
                    return next;
                  });
                }}
                className="flex items-center gap-2 text-text-secondary hover:text-primary font-bold text-sm mb-8 transition-all group w-fit"
              >
                <div className="p-2 rounded-full bg-bg-surface border border-border-main/10 group-hover:border-primary/50 transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                </div>
                Back to Playlists
              </motion.button>
              
              <div className="relative flex flex-col items-center mb-8 pt-4">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-64 h-64 rounded-3xl overflow-hidden bg-bg-base shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-center shrink-0 border border-white/5 relative mb-8"
                >
                  {selectedPlaylist.songs?.length > 0 ? (
                    <SongImage src={selectedPlaylist.songs[0].thumbnail || selectedPlaylist.songs[0].cover} alt={selectedPlaylist.name} className="w-full h-full object-cover" />
                  ) : (
                    <Music2 className="w-24 h-24 text-primary/20" />
                  )}
                </motion.div>

                <div className="text-center w-[90vw] md:w-full mx-auto px-2 md:px-4 overflow-hidden">
                  <motion.h2 className="text-2xl md:text-4xl font-black text-text-primary mb-2 truncate">
                    {selectedPlaylist.name}
                  </motion.h2>
                  <motion.div className="flex flex-col items-center gap-1 text-sm text-text-secondary font-bold w-full">
                    <span className="truncate w-full max-w-[80vw]">Playlist • {selectedPlaylist.createdAt?.seconds ? new Date(selectedPlaylist.createdAt.seconds * 1000).getFullYear() : '2024'}</span>
                    <span className="truncate w-full max-w-[80vw]">{selectedPlaylist.songs?.length || 0} songs • {(selectedPlaylist.songs?.length || 0) * 4} minutes</span>
                  </motion.div>
                </div>
                
                <div className="flex items-center gap-6 mt-10">
                  <button className="p-4 rounded-full bg-bg-surface/50 text-text-primary hover:text-primary transition-all">
                    <Heart className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={() => {
                      if (selectedPlaylist.songs?.length > 0) {
                        playQueue(selectedPlaylist.songs, selectedPlaylist.songs[0]);
                      }
                    }}
                    className="w-16 h-16 rounded-full bg-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-xl"
                  >
                    <Play className="w-8 h-8 text-black fill-current ml-1" />
                  </button>
                  <button 
                    onClick={() => setShowEntityMenu(true)}
                    className="p-4 rounded-full bg-bg-surface/50 text-text-primary hover:text-primary transition-all active:scale-95"
                  >
                    <MoreHorizontal className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className={cn(viewMode === 'list' ? "space-y-1" : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4")}>
                {selectedPlaylist.songs?.length > 0 ? (
                  <>
                    {selectedPlaylist.songs.slice(0, visiblePlaylistItems).map((song, i) => renderSong(song, i, true))}
                    {selectedPlaylist.songs.length > visiblePlaylistItems && (
                      <div ref={loadMoreRef} className="col-span-full h-32 w-full flex flex-col items-center justify-center gap-3 py-10 opacity-60">
                        <Loader2 className="w-6 h-6 text-primary animate-spin" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary">Loading more tracks...</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center text-text-secondary col-span-full">
                    <Music className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-sm font-bold">This playlist is empty</p>
                  </div>
                )}
              </div>
            </div>
          ) : playlists.length > 0 ? (
            <>
              {playlists.slice(0, visiblePlaylistItems).map((playlist) => (
                <div 
                  key={playlist.id} 
                  className={cn(
                    "flex group cursor-pointer transition-all duration-300",
                    viewMode === 'list' 
                      ? "items-center gap-4 hover:bg-bg-surface/50 p-2 rounded-2xl" 
                      : "flex-col gap-3 p-3 rounded-2xl bg-bg-surface/30 hover:bg-bg-surface/60 border border-border-main/5 hover:border-primary/20 backdrop-blur-sm"
                  )}
                  onClick={() => {
                    const scrollContainer = document.querySelector('.overflow-y-auto');
                    if (scrollContainer) setListScrollPos(scrollContainer.scrollTop);
                    setSearchParams(prev => {
                      const next = new URLSearchParams(prev);
                      next.set('filter', 'Playlists');
                      next.set('id', playlist.id);
                      return next;
                    });
                  }}
                >
                   <div className={cn(
                     "rounded-xl overflow-hidden bg-bg-surface shadow-lg relative shrink-0 flex items-center justify-center",
                     viewMode === 'list' ? "w-16 h-16" : "w-full aspect-square"
                   )}>
                      {playlist.songs?.[0]?.cover ? (
                        <SongImage src={playlist.songs[0].thumbnail || playlist.songs[0].cover} alt={playlist.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      ) : (
                        <Music2 className="w-8 h-8 text-primary" />
                      )}
                   </div>
                   <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                         <p className={cn(
                           "font-bold truncate text-text-primary",
                           viewMode === 'list' ? "text-base" : "text-sm"
                         )}>{playlist.name}</p>
                         {playlist.userId === user?.uid && (
                           playlist.public ? 
                             <Globe className="w-3 h-3 text-primary opacity-60" /> : 
                             <Lock className="w-3 h-3 text-text-secondary opacity-40" />
                         )}
                      </div>
                      <p className="text-[10px] text-text-secondary truncate uppercase mt-0.5 tracking-wider font-semibold">
                        {playlist.userId === user?.uid ? 'My Playlist' : 'Public Playlist'} • {playlist.songs?.length || 0} songs
                      </p>
                   </div>
                   <div className="ml-auto">
                      {playlist.userId === user?.uid ? (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete ${playlist.name}?`)) {
                              deletePlaylist(playlist.id);
                            }
                          }}
                          className="p-2 rounded-lg hover:bg-red-500/10 text-text-secondary hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                          title="Delete Playlist"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Hide ${playlist.name} from your library?`)) {
                              hidePlaylist(playlist.id);
                              showToast(`${playlist.name} hidden`);
                            }
                          }}
                          className="p-2 rounded-lg hover:bg-white/10 text-text-secondary hover:text-text-primary transition-all opacity-0 group-hover:opacity-100"
                          title="Hide Playlist"
                        >
                          <EyeOff className="w-4 h-4" />
                        </button>
                      )}
                   </div>
                </div>
              ))}
              {playlists.length > visiblePlaylistItems && (
                <div ref={loadMoreRef} className="col-span-full h-32 w-full flex flex-col items-center justify-center gap-3 py-10 opacity-60">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary">Loading more playlists...</p>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center text-text-secondary col-span-full">
              <Music className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-sm font-bold">No Playlists Found</p>
              <p className="text-xs mt-1">Create your first playlist from the player menu!</p>
            </div>
          )
        ) : activeFilter === 'Artists' ? (
          selectedArtist ? (
            <div className="col-span-full space-y-4">
              <motion.button 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => {
                  setSearchParams(prev => {
                    const next = new URLSearchParams(prev);
                    next.delete('artist');
                    return next;
                  });
                }}
                className="flex items-center gap-2 text-text-secondary hover:text-primary font-bold text-sm mb-8 transition-all group w-fit"
              >
                <div className="p-2 rounded-full bg-bg-surface border border-border-main/10 group-hover:border-primary/50 transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                </div>
                Back to Artists
              </motion.button>
              <div className="relative flex flex-col items-center mb-10 pt-4">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-56 h-56 rounded-full overflow-hidden bg-bg-surface shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-center shrink-0 border border-white/5 relative mb-8 group"
                >
                  <ArtistAvatar 
                    artistName={selectedArtist.name} 
                    fallbackCover={artistInfo?.strArtistThumb || selectedArtist.thumbnail || selectedArtist.cover} 
                    className={cn(
                      "w-full h-full object-cover transition-all duration-700",
                      loadingArtistInfo ? "scale-110 blur-sm opacity-50" : "scale-100 blur-0 opacity-100"
                    )} 
                  />
                  {loadingArtistInfo && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                    </div>
                  )}
                </motion.div>

                <div className="text-center w-full max-w-2xl mx-auto px-4 overflow-hidden">
                  <motion.h2 className="text-3xl md:text-5xl font-black text-text-primary mb-3 tracking-tight">
                    {selectedArtist.name}
                  </motion.h2>
                  <motion.div className="flex flex-col items-center gap-2 text-sm text-text-secondary font-bold">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                        {artistInfo?.strGenre || 'Artist'}
                      </span>
                      <span>•</span>
                      <span>{selectedArtist.songs.length} Tracks</span>
                    </div>
                  </motion.div>

                  {(artistInfo?.strBiographyEN || artistInfo?.strBiography) && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 relative"
                    >
                      <p className={cn(
                        "text-sm text-text-secondary leading-relaxed text-center transition-all duration-500",
                        !isBioExpanded && "line-clamp-3"
                      )} style={!isBioExpanded ? { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : {}}>
                        {artistInfo.strBiographyEN || artistInfo.strBiography}
                      </p>
                      <button 
                        onClick={() => setIsBioExpanded(!isBioExpanded)}
                        className="mt-2 text-xs font-bold text-primary hover:underline transition-all"
                      >
                        {isBioExpanded ? 'Read Less' : 'Read More'}
                      </button>
                    </motion.div>
                  )}
                </div>
                
                <div className="flex items-center gap-6 mt-10">
                  <button className="p-4 rounded-full bg-bg-surface/50 text-text-primary hover:text-primary transition-all active:scale-95 border border-white/5">
                    <Heart className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={() => {
                      if (selectedArtist.songs.length > 0) {
                        playQueue(selectedArtist.songs, selectedArtist.songs[0]);
                      }
                    }}
                    className="w-20 h-20 rounded-full bg-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-[0_10px_30px_rgba(255,255,255,0.3)] group"
                  >
                    <Play className="w-10 h-10 text-black fill-current ml-1 group-hover:scale-110 transition-transform" />
                  </button>
                  <button 
                    onClick={() => setShowEntityMenu(true)}
                    className="p-4 rounded-full bg-bg-surface/50 text-text-primary hover:text-primary transition-all active:scale-95 border border-white/5"
                  >
                    <MoreHorizontal className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className={cn(viewMode === 'list' ? "space-y-4" : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4")}>
                {selectedArtist.songs.slice(0, visibleTracks).map(renderSong)}
                {selectedArtist.songs.length > visibleTracks && (
                  <div ref={loadMoreRef} className="col-span-full h-32 w-full flex flex-col items-center justify-center gap-3 py-10 opacity-60">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary">Loading more tracks...</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {artistList.slice(0, visibleArtists).map((artist) => (
                <div 
                  key={artist.name} 
                  className={cn(
                    "flex group cursor-pointer transition-all duration-300",
                    viewMode === 'list' ? "items-center gap-4 hover:bg-bg-surface/50 p-2 rounded-2xl" : "flex-col gap-3 p-3 rounded-2xl bg-bg-surface/40 hover:bg-bg-surface/60 border border-border-main/5"
                  )}
                  onClick={() => {
                    const scrollContainer = document.querySelector('.overflow-y-auto');
                    if (scrollContainer) setListScrollPos(scrollContainer.scrollTop);
                    setSearchParams(prev => {
                      const next = new URLSearchParams(prev);
                      next.set('filter', 'Artists');
                      next.set('artist', artist.name);
                      return next;
                    });
                  }}
                >
                   <div className={cn(
                     "rounded-full overflow-hidden bg-bg-surface shadow-lg relative shrink-0",
                     viewMode === 'list' ? "w-16 h-16" : "w-full aspect-square"
                   )}>
                       <ArtistAvatar artistName={artist.name} fallbackCover={artist.cover} />
                   </div>
                   <div className="flex-1 min-w-0">
                      <p className={cn(
                        "font-bold truncate text-text-primary",
                        viewMode === 'list' ? "text-base" : "text-sm"
                      )}>{artist.name}</p>
                      <p className="text-[10px] text-text-secondary truncate uppercase mt-0.5 tracking-wider font-semibold">Artist • {artist.songs.length} songs</p>
                   </div>
                </div>
              ))}
              {artistList.length > visibleArtists && (
                <div ref={loadMoreRef} className="col-span-full h-32 w-full flex flex-col items-center justify-center gap-3 py-10 opacity-60">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary">Loading more artists...</p>
                </div>
              )}
            </>
          )
        ) : activeFilter === 'Albums' ? (
          selectedAlbum ? (
            <div className="col-span-full space-y-4">
              <motion.button 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => {
                  setSearchParams(prev => {
                    const next = new URLSearchParams(prev);
                    next.delete('album');
                    return next;
                  });
                }}
                className="flex items-center gap-2 text-text-secondary hover:text-primary font-bold text-sm mb-8 transition-all group w-fit"
              >
                <div className="p-2 rounded-full bg-bg-surface border border-border-main/10 group-hover:border-primary/50 transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                </div>
                Back to Albums
              </motion.button>
              <div className="relative flex flex-col items-center mb-8 pt-4">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-64 h-64 rounded-3xl overflow-hidden bg-bg-base shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-center shrink-0 border border-white/5 relative mb-8"
                >
                   <SongImage src={selectedAlbum.thumbnail || selectedAlbum.cover} alt={selectedAlbum.name} className="w-full h-full object-cover" />
                </motion.div>

                <div className="text-center w-[90vw] md:w-full mx-auto px-2 md:px-4 overflow-hidden">
                  <motion.h2 className="text-2xl md:text-4xl font-black text-text-primary mb-2 truncate">
                    {selectedAlbum.name}
                  </motion.h2>
                  <motion.div className="flex flex-col items-center gap-1 text-sm text-text-secondary font-bold w-full">
                    <span className="truncate w-full max-w-[80vw]">Album • {selectedAlbum.artist} • {selectedAlbum.year || '2011'}</span>
                    <span className="truncate w-full max-w-[80vw]">{selectedAlbum.songs.length} songs • {selectedAlbum.songs.length * 5} minutes</span>
                  </motion.div>
                </div>
                
                <div className="flex items-center gap-6 mt-10">
                  <button className="p-4 rounded-full bg-bg-surface/50 text-text-primary hover:text-primary transition-all">
                    <Heart className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={() => {
                      if (selectedAlbum.songs.length > 0) {
                        playQueue(selectedAlbum.songs, selectedAlbum.songs[0]);
                      }
                    }}
                    className="w-16 h-16 rounded-full bg-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-xl"
                  >
                    <Play className="w-8 h-8 text-black fill-current ml-1" />
                  </button>
                  <button 
                    onClick={() => setShowEntityMenu(true)}
                    className="p-4 rounded-full bg-bg-surface/50 text-text-primary hover:text-primary transition-all active:scale-95"
                  >
                    <MoreHorizontal className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className={cn(viewMode === 'list' ? "space-y-1" : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4")}>
                {selectedAlbum.songs.slice(0, visibleTracks).map((song, i) => renderSong(song, i, true))}
                {selectedAlbum.songs.length > visibleTracks && (
                  <div ref={loadMoreRef} className="col-span-full h-32 w-full flex flex-col items-center justify-center gap-3 py-10 opacity-60">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary">Loading more tracks...</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {albumList.slice(0, visibleAlbums).map((album) => (
                <div 
                  key={album.name} 
                  className={cn(
                    "flex group cursor-pointer transition-all duration-300",
                    viewMode === 'list' ? "items-center gap-4 hover:bg-bg-surface/50 p-2 rounded-2xl" : "flex-col gap-3 p-3 rounded-2xl bg-bg-surface/40 hover:bg-bg-surface/60 border border-border-main/5"
                  )}
                  onClick={() => {
                    const scrollContainer = document.querySelector('.overflow-y-auto');
                    if (scrollContainer) setListScrollPos(scrollContainer.scrollTop);
                    setSearchParams(prev => {
                      const next = new URLSearchParams(prev);
                      next.set('filter', 'Albums');
                      next.set('album', album.name);
                      return next;
                    });
                  }}
                >
                   <div className={cn(
                     "rounded-xl overflow-hidden bg-bg-surface shadow-lg relative shrink-0",
                     viewMode === 'list' ? "w-16 h-16" : "w-full aspect-square"
                   )}>
                       <SongImage src={album.thumbnail || album.cover} alt={album.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                   </div>
                   <div className="flex-1 min-w-0">
                      <p className={cn(
                        "font-bold truncate text-text-primary",
                        viewMode === 'list' ? "text-base" : "text-sm"
                      )}>{album.name}</p>
                      <p className="text-[10px] text-text-secondary truncate uppercase mt-0.5 tracking-wider font-semibold">Album • {album.artist}</p>
                   </div>
                </div>
              ))}
              {albumList.length > visibleAlbums && (
                <div ref={loadMoreRef} className="col-span-full h-32 w-full flex flex-col items-center justify-center gap-3 py-10 opacity-60">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary">Loading more albums...</p>
                </div>
              )}
            </>
          )
        ) : activeFilter === 'Liked' ? (
          <div className="col-span-full space-y-4">
             {likedSongs.length > 0 ? (
               <>
                 <div className={cn(viewMode === 'list' ? "space-y-4" : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4")}>
                   {likedSongs.slice(0, visibleLiked).map(id => songs.find(s => s.id === id)).filter(Boolean).map((song, i) => renderSong(song, i))}
                 </div>
                 {likedSongs.length > visibleLiked && (
                   <div ref={loadMoreRef} className="col-span-full h-32 w-full flex flex-col items-center justify-center gap-3 py-10 opacity-60">
                     <Loader2 className="w-6 h-6 text-primary animate-spin" />
                     <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary">Loading more tracks...</p>
                   </div>
                 )}
               </>
             ) : (
               <div className="flex flex-col items-center justify-center py-20 text-center text-text-secondary col-span-full">
                 <Heart className="w-12 h-12 mb-4 opacity-20" />
                 <p className="text-sm font-bold">No Liked Songs Yet</p>
                 <p className="text-xs mt-1">Heart your favorite tracks to see them here!</p>
               </div>
             )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center text-text-secondary col-span-full">
            <ListMusic className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm font-bold">No {activeFilter} found.</p>
            <p className="text-xs mt-1">This feature is currently under development.</p>
          </div>
        )}
      </div>
      <AnimatePresence>
        {showEntityMenu && (selectedPlaylist || selectedAlbum || selectedArtist) && (
          <div className="fixed inset-0 z-[100] flex flex-col justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
              onClick={() => setShowEntityMenu(false)} 
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative bg-bg-surface rounded-t-3xl pt-2 px-4 shadow-2xl border-t border-border-main/10 pb-safe pb-8"
            >
              <div className="w-12 h-1 bg-border-main/20 rounded-full mx-auto mb-6 mt-2" />
              
              <div className="flex items-center gap-4 mb-6 border-b border-white/5 pb-4">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-900 border border-white/10 shrink-0">
                   <SongImage 
                    src={selectedPlaylist ? (selectedPlaylist.songs?.[0]?.thumbnail || selectedPlaylist.songs?.[0]?.cover) : (selectedAlbum?.thumbnail || selectedAlbum?.cover || selectedArtist?.thumbnail || selectedArtist?.cover)} 
                    alt="Entity cover" 
                    className="w-full h-full object-cover" 
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-black text-text-primary truncate">{selectedPlaylist?.name || selectedAlbum?.name || selectedArtist?.name}</p>
                  <p className="text-sm text-text-secondary font-bold uppercase tracking-wider">
                    {selectedPlaylist ? 'Playlist' : selectedAlbum ? 'Album' : 'Artist'} • {selectedPlaylist ? `${selectedPlaylist.songs?.length || 0} songs` : selectedAlbum ? selectedAlbum.artist : `${selectedArtist?.songs?.length || 0} songs`}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                {selectedPlaylist && selectedPlaylist.userId !== user?.uid && (
                  <button 
                    className="w-full flex items-center gap-4 p-4 hover:bg-white/5 rounded-2xl transition-all"
                    onClick={() => {
                      if (confirm(`Hide "${selectedPlaylist.name}" from your library?`)) {
                        hidePlaylist(selectedPlaylist.id);
                        setSelectedPlaylist(null);
                        setShowEntityMenu(false);
                        showToast('Playlist hidden');
                      }
                    }}
                  >
                    <EyeOff className="w-6 h-6 text-primary" />
                    <span className="text-base font-bold text-text-primary">Hide Playlist</span>
                  </button>
                )}
                {selectedPlaylist && selectedPlaylist.userId === user?.uid && (
                  <>
                    <button 
                      className="w-full flex items-center gap-4 p-4 hover:bg-white/5 rounded-2xl transition-all"
                      onClick={() => {
                        updatePlaylist(selectedPlaylist.id, { public: !selectedPlaylist.public });
                        setSelectedPlaylist(prev => ({ ...prev, public: !prev.public }));
                        showToast(`Playlist is now ${!selectedPlaylist.public ? 'Public' : 'Private'}`);
                        setShowEntityMenu(false);
                      }}
                    >
                      {selectedPlaylist.public ? <Lock className="w-6 h-6 text-primary" /> : <Globe className="w-6 h-6 text-primary" />}
                      <span className="text-base font-bold text-text-primary">
                        Make {selectedPlaylist.public ? 'Private' : 'Public'}
                      </span>
                    </button>
                    
                    <button 
                      className="w-full flex items-center gap-4 p-4 hover:bg-red-500/10 rounded-2xl transition-all text-red-500"
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete "${selectedPlaylist.name}"?`)) {
                          deletePlaylist(selectedPlaylist.id);
                          setSelectedPlaylist(null);
                          setShowEntityMenu(false);
                          showToast('Playlist deleted');
                        }
                      }}
                    >
                      <Trash2 className="w-6 h-6" />
                      <span className="text-base font-bold">Delete Playlist</span>
                    </button>
                  </>
                )}

                {selectedAlbum && (
                  <button 
                    className="w-full flex items-center gap-4 p-4 hover:bg-white/5 rounded-2xl transition-all"
                    onClick={() => {
                      navigate(`/app/library?filter=Artists&artist=${encodeURIComponent(selectedAlbum.artist)}`);
                      setSelectedAlbum(null);
                      setShowEntityMenu(false);
                    }}
                  >
                    <Music2 className="w-6 h-6 text-text-secondary" />
                    <span className="text-base font-bold text-text-primary">Go to Artist</span>
                  </button>
                )}

                <button 
                  className="w-full flex items-center gap-4 p-4 hover:bg-white/5 rounded-2xl transition-all"
                  onClick={() => {
                    let shareUrl = window.location.href;
                    if (selectedPlaylist) {
                      shareUrl = `${window.location.origin}${window.location.pathname}?filter=Playlists&name=${encodeURIComponent(selectedPlaylist.name)}`;
                    } else if (selectedAlbum) {
                      shareUrl = `${window.location.origin}${window.location.pathname}?filter=Albums&album=${encodeURIComponent(selectedAlbum.name)}`;
                    } else if (selectedArtist) {
                      shareUrl = `${window.location.origin}${window.location.pathname}?filter=Artists&artist=${encodeURIComponent(selectedArtist.name)}`;
                    }

                    const shareData = {
                      title: selectedPlaylist?.name || selectedAlbum?.name || selectedArtist?.name,
                      text: `Check out this ${selectedPlaylist ? 'playlist' : selectedAlbum ? 'album' : 'artist'} on SumanMusic!`,
                      url: shareUrl,
                    };

                    if (navigator.share) {
                      navigator.share(shareData);
                    } else {
                      navigator.clipboard.writeText(shareUrl);
                      showToast('Link copied to clipboard');
                    }
                    setShowEntityMenu(false);
                  }}
                >
                  <Share2 className="w-6 h-6 text-text-secondary" />
                  <span className="text-base font-bold text-text-primary">Share</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 40, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 40, x: "-50%" }}
            className="fixed bottom-[110px] left-1/2 z-[110] bg-zinc-900/95 backdrop-blur-xl border border-white/10 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-2 sm:gap-3 whitespace-nowrap max-w-[90vw] overflow-hidden"
          >
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Music className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
            </div>
            <p className="text-xs sm:text-sm font-bold tracking-tight">{toastMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Library;
