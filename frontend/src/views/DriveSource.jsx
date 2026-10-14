import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Cloud, Download, Play, Pause, MoreVertical, Shuffle, 
  SkipForward, SkipBack, Heart, HardDrive, RotateCw, LayoutGrid, 
  List, Sparkles, Music2, FolderSync, CheckCircle2, X 
} from 'lucide-react';
import { usePlayer } from '../context/usePlayer';
import { cn } from '../lib/utils';
import PlayingVisualizer from '../components/PlayingVisualizer';
import SongImage from '../components/SongImage';
import { LibrarySkeleton } from '../components/Skeleton';
import { isTrackOffline } from '../lib/offlineStorage';
import { useInViewEnrichment } from '../hooks/useInViewEnrichment';

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const DriveGridCard = React.memo(({ song, idx, currentSong, isPlaying, playSong, enrichMetadata }) => {
  const isCurrent = currentSong?.id === song.id;
  const enrichmentRef = useInViewEnrichment(song, enrichMetadata);

  return (
    <motion.div 
      ref={enrichmentRef}
      key={song.id}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.02 * (idx % 20) }}
      onClick={() => playSong(song)}
      className={cn(
        "group relative flex flex-col p-3 rounded-2xl border transition-all duration-300 cursor-pointer select-none",
        isCurrent 
          ? "bg-primary/10 border-primary/40 shadow-lg shadow-primary/10 ring-1 ring-primary/30"
          : "bg-bg-surface/50 hover:bg-bg-surface border-border-main/10 hover:border-border-main/25 hover:shadow-xl"
      )}
    >
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-bg-base mb-2.5 shadow-md">
        <SongImage 
          src={song.thumbnail || song.cover} 
          alt={song.title} 
          title={song.title}
          artist={song.artist}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
        />
        <div className={cn(
          "absolute bottom-2 right-2 transition-all duration-200 shadow-xl",
          isCurrent 
            ? "opacity-100 translate-y-0" 
            : "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0"
        )}>
          <div className="w-9 h-9 bg-primary text-black rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
            {isCurrent && isPlaying ? (
              <Pause className="w-4 h-4 fill-black" />
            ) : (
              <Play className="w-4 h-4 ml-0.5 fill-black" />
            )}
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <h3 className={cn("text-xs font-bold truncate", isCurrent ? "text-primary" : "text-text-primary group-hover:text-primary")}>
          {song.title}
        </h3>
        <p className="text-[11px] text-text-secondary truncate mt-0.5 flex items-center gap-1 font-medium">
          {song.artist || "Unknown Artist"}
          {isTrackOffline(song.id) && <HardDrive className="w-3 h-3 text-primary shrink-0" />}
        </p>
      </div>
    </motion.div>
  );
});

const DriveListRow = React.memo(({ song, index, currentSong, isPlaying, isLiked, playSong, toggleLike, setOptionsSong, enrichMetadata }) => {
  const isCurrent = currentSong?.id === song.id;
  const enrichmentRef = useInViewEnrichment(song, enrichMetadata);

  return (
    <div 
      ref={enrichmentRef}
      key={song.id}
      onClick={() => playSong(song)}
      className={cn(
        "group relative flex items-center md:grid md:grid-cols-12 gap-4 px-4 sm:px-5 py-3 transition-all duration-200 cursor-pointer select-none",
        isCurrent 
          ? "bg-primary/10 border-l-4 border-l-primary" 
          : "hover:bg-bg-surface/70"
      )}
    >
      <div className="hidden md:flex items-center col-span-1 text-xs font-bold text-text-secondary">
        {isCurrent && isPlaying ? (
          <PlayingVisualizer className="h-3.5" />
        ) : (
          <span className="group-hover:hidden">{index + 1}</span>
        )}
        <Play className="w-3.5 h-3.5 text-primary hidden group-hover:block fill-primary" />
      </div>

      <div className="flex items-center gap-3 col-span-5 min-w-0 flex-1">
        <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 shadow-sm border border-border-main/10">
          <SongImage 
            src={song.thumbnail || song.cover} 
            alt={song.title} 
            title={song.title}
            artist={song.artist}
            className="w-full h-full object-cover" 
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm font-bold truncate", isCurrent ? "text-primary" : "text-text-primary group-hover:text-primary")}>
            {song.title}
          </p>
          <p className="text-xs text-text-secondary truncate font-medium flex items-center gap-1.5 mt-0.5">
            {song.artist || "Unknown Artist"}
            {isTrackOffline(song.id) && (
              <HardDrive className="w-3 h-3 text-primary shrink-0" title="Available offline" />
            )}
          </p>
        </div>
      </div>

      <div className="hidden md:flex items-center col-span-3 text-xs text-text-secondary truncate font-medium">
        {song.album || "—"}
      </div>

      <div className="hidden md:flex items-center justify-center col-span-1 text-xs text-text-secondary tabular-nums">
        <span className="px-2 py-0.5 rounded-md bg-bg-surface border border-border-main/5 text-[10px]">
          {song.size || "—"}
        </span>
      </div>

      <div className="flex items-center justify-end col-span-2 gap-2 text-xs text-text-secondary tabular-nums font-semibold">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            toggleLike(song);
          }}
          className={cn(
            "p-2 rounded-full transition-all cursor-pointer",
            isLiked 
              ? "text-primary opacity-100" 
              : "text-text-secondary opacity-0 group-hover:opacity-100 hover:text-text-primary"
          )}
          title="Like"
        >
          <Heart className={cn("w-3.5 h-3.5", isLiked && "fill-primary")} />
        </button>

        {song.driveUrl && (
          <a 
            href={song.driveUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-2 rounded-full text-text-secondary opacity-0 group-hover:opacity-100 hover:text-primary transition-all"
            title="Open in Google Drive"
          >
            <Download className="w-3.5 h-3.5" />
          </a>
        )}

        <span className="hidden sm:inline w-12 text-right">
          {song.duration || "—"}
        </span>

        <button 
          onClick={(e) => {
            e.stopPropagation();
            setOptionsSong(song);
          }}
          className="p-2 rounded-full text-text-secondary opacity-0 group-hover:opacity-100 hover:text-text-primary transition-all cursor-pointer"
          title="More Options"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

const DriveSource = () => {
  const { 
    songs, playSong, playQueue, currentSong, isPlaying, togglePlay, 
    playNext, playPrevious, seek, currentTime, duration, progress, 
    error, refreshSongs, setOptionsSong, isLoading, likedSongs, 
    toggleLike, isSyncing, syncLibrary, enrichMetadata 
  } = usePlayer();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState('list');

  const totalSizeMB = useMemo(() => {
    return songs.reduce((acc, song) => {
      const match = (song.size || '').match(/([\d.]+)\s*MB/i);
      if (match) return acc + parseFloat(match[1]);
      return acc;
    }, 0);
  }, [songs]);

  const totalSizeFormatted = useMemo(() => {
    if (totalSizeMB > 1024) {
      return `${(totalSizeMB / 1024).toFixed(2)} GB`;
    }
    return `${totalSizeMB.toFixed(1)} MB`;
  }, [totalSizeMB]);

  const filteredSongs = useMemo(() => {
    let result = songs;
    if (activeTab === 'recent') {
      result = [...songs].sort((a, b) => new Date(b.createdTime || 0) - new Date(a.createdTime || 0));
    } else if (activeTab === 'offline') {
      result = songs.filter(s => isTrackOffline(s.id));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(s =>
        (s.title || '').toLowerCase().includes(q) ||
        (s.artist || '').toLowerCase().includes(q) ||
        (s.album || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [songs, activeTab, searchQuery]);

  const activeHeroSong = currentSong || songs[0] || null;

  const handleProgressBarClick = (e) => {
    if (!duration || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    seek(ratio * duration);
  };

  const handleShuffleAll = () => {
    if (!songs || songs.length === 0) return;
    const shuffled = [...songs].sort(() => Math.random() - 0.5);
    playQueue(shuffled, shuffled[0]);
  };

  if (isLoading && (!songs || songs.length === 0)) {
    return <LibrarySkeleton viewMode={viewMode} />;
  }

  if (error && (!songs || songs.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-20 px-4 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
          <Cloud className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-text-primary mb-2">Google Drive Connection</h2>
        <p className="text-text-secondary text-sm mb-6 leading-relaxed">
          {error}. Please check your Google Drive API credentials or refresh the source.
        </p>
        <button 
          onClick={() => (syncLibrary ? syncLibrary(true) : refreshSongs())}
          className="bg-primary text-black font-bold px-6 py-2.5 rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 flex items-center gap-2 cursor-pointer"
        >
          <RotateCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
          Reconnect & Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-48 w-full max-w-7xl mx-auto px-2 sm:px-4 md:px-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary shadow-sm">
              <Cloud className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">Drive Cloud</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/15 text-primary border border-primary/20">
                  Direct Stream
                </span>
              </div>
              <p className="text-xs text-text-secondary font-medium">
                High-performance private Google Drive audio repository with multi-layer edge caching
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-stretch md:self-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in Drive..."
              className="w-full bg-bg-surface/80 hover:bg-bg-surface border border-border-main/15 focus:border-primary/50 text-xs text-text-primary placeholder:text-text-secondary rounded-full pl-9 pr-8 py-2.5 outline-none transition-all shadow-inner"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary p-0.5 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button 
            onClick={() => (syncLibrary ? syncLibrary(true) : refreshSongs())}
            disabled={isSyncing}
            className="p-2.5 rounded-full bg-bg-surface/80 hover:bg-bg-surface border border-border-main/15 text-text-secondary hover:text-primary transition-all hover:scale-105 active:scale-95 shadow-md disabled:opacity-50 shrink-0 cursor-pointer"
            title="Sync Drive Library"
            aria-label="Sync Drive Library"
          >
            <RotateCw className={cn("w-4 h-4", isSyncing && "animate-spin text-primary")} />
          </button>

          <div className="hidden sm:flex items-center p-1 rounded-full bg-bg-surface/80 border border-border-main/15 shrink-0 shadow-inner">
            <button 
              onClick={() => setViewMode('list')}
              className={cn("p-1.5 rounded-full transition-all", viewMode === 'list' ? "bg-primary text-black shadow-sm" : "text-text-secondary hover:text-text-primary")}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={cn("p-1.5 rounded-full transition-all", viewMode === 'grid' ? "bg-primary text-black shadow-sm" : "text-text-secondary hover:text-text-primary")}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-bg-surface/50 border border-border-main/10 rounded-2xl p-3.5 flex items-center gap-3 backdrop-blur-md">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Music2 className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-text-secondary uppercase font-bold tracking-wider truncate">Library Size</p>
            <p className="text-base font-black text-text-primary truncate">{songs.length} Tracks</p>
          </div>
        </div>

        <div className="bg-bg-surface/50 border border-border-main/10 rounded-2xl p-3.5 flex items-center gap-3 backdrop-blur-md">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <HardDrive className="w-5 h-5 text-blue-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-text-secondary uppercase font-bold tracking-wider truncate">Cloud Storage</p>
            <p className="text-base font-black text-text-primary truncate">{totalSizeFormatted}</p>
          </div>
        </div>

        <div className="bg-bg-surface/50 border border-border-main/10 rounded-2xl p-3.5 flex items-center gap-3 backdrop-blur-md">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-text-secondary uppercase font-bold tracking-wider truncate">Cache Layer</p>
            <p className="text-base font-black text-emerald-400 truncate">IndexedDB Active</p>
          </div>
        </div>

        <div className="bg-bg-surface/50 border border-border-main/10 rounded-2xl p-3.5 flex items-center gap-3 backdrop-blur-md">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
            <FolderSync className="w-5 h-5 text-purple-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-text-secondary uppercase font-bold tracking-wider truncate">Stream Engine</p>
            <p className="text-base font-black text-text-primary truncate">Edge Proxy 320k</p>
          </div>
        </div>
      </div>

      {activeHeroSong && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-bg-surface/90 via-bg-surface/60 to-bg-base/80 border border-border-main/15 shadow-2xl backdrop-blur-xl p-6 sm:p-8">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-24 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-stretch gap-6 sm:gap-8">
            <div className="relative w-44 h-44 sm:w-56 sm:h-56 rounded-2xl overflow-hidden shadow-[0_16px_36px_rgba(0,0,0,0.5)] border border-border-main/20 shrink-0 group">
              <SongImage 
                src={activeHeroSong.thumbnail || activeHeroSong.cover} 
                alt={activeHeroSong.title} 
                title={activeHeroSong.title}
                artist={activeHeroSong.artist}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
              />
              {currentSong?.id === activeHeroSong.id && isPlaying && (
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-1.5 shadow-lg">
                  <PlayingVisualizer className="h-3" />
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Live</span>
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col justify-between items-center md:items-start text-center md:text-left min-w-0 w-full">
              <div className="w-full space-y-2">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                    Google Drive Audio
                  </span>
                  {activeHeroSong.size && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-text-secondary bg-bg-surface border border-border-main/10">
                      {activeHeroSong.size}
                    </span>
                  )}
                  {isTrackOffline(activeHeroSong.id) && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1">
                      <HardDrive className="w-3 h-3" /> Offline
                    </span>
                  )}
                </div>

                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-text-primary tracking-tight line-clamp-2 leading-tight">
                  {activeHeroSong.title}
                </h2>
                
                <p className="text-sm sm:text-base font-semibold text-text-secondary truncate">
                  {activeHeroSong.artist || "Unknown Artist"}
                  {activeHeroSong.album ? ` • ${activeHeroSong.album}` : ""}
                </p>
              </div>

              <div className="w-full space-y-4 pt-4">
                <div className="space-y-1.5 w-full">
                  <div 
                    onClick={handleProgressBarClick}
                    className="group/seek h-2 w-full bg-bg-base/70 rounded-full relative cursor-pointer overflow-hidden border border-border-main/10"
                    title="Click to seek"
                  >
                    <div 
                      className="absolute top-0 left-0 h-full bg-primary transition-all duration-150 rounded-full group-hover/seek:brightness-110" 
                      style={{ width: `${currentSong?.id === activeHeroSong.id ? progress : 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] font-semibold text-text-secondary tabular-nums">
                    <span>{currentSong?.id === activeHeroSong.id ? formatTime(currentTime) : "0:00"}</span>
                    <span>{currentSong?.id === activeHeroSong.id ? formatTime(duration) : (activeHeroSong.duration || "0:00")}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-1">
                  <button 
                    onClick={() => {
                      if (currentSong?.id === activeHeroSong.id) {
                        togglePlay();
                      } else {
                        playSong(activeHeroSong);
                      }
                    }}
                    className="bg-primary text-black font-black px-7 py-3 rounded-full flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/25 cursor-pointer"
                  >
                    {currentSong?.id === activeHeroSong.id && isPlaying ? (
                      <>
                        <Pause className="w-4 h-4 fill-black" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-black ml-0.5" />
                        <span>Play Now</span>
                      </>
                    )}
                  </button>

                  <button 
                    onClick={handleShuffleAll}
                    className="bg-bg-surface hover:bg-bg-surface/80 text-text-primary font-bold px-5 py-3 rounded-full border border-border-main/15 hover:border-border-main/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                  >
                    <Shuffle className="w-4 h-4 text-primary" />
                    <span>Shuffle All</span>
                  </button>

                  <button 
                    onClick={playPrevious}
                    className="p-3 rounded-full bg-bg-surface hover:bg-bg-surface/80 text-text-primary border border-border-main/15 hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer"
                    title="Previous Track"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>

                  <button 
                    onClick={playNext}
                    className="p-3 rounded-full bg-bg-surface hover:bg-bg-surface/80 text-text-primary border border-border-main/15 hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer"
                    title="Next Track"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>

                  <button 
                    onClick={() => toggleLike(activeHeroSong)}
                    className={cn(
                      "p-3 rounded-full bg-bg-surface hover:bg-bg-surface/80 border border-border-main/15 transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer",
                      likedSongs?.some(s => s.id === activeHeroSong.id) ? "text-primary" : "text-text-secondary hover:text-text-primary"
                    )}
                    title="Like Track"
                  >
                    <Heart className={cn("w-4 h-4", likedSongs?.some(s => s.id === activeHeroSong.id) && "fill-primary")} />
                  </button>

                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setOptionsSong(activeHeroSong);
                    }}
                    className="p-3 rounded-full bg-bg-surface hover:bg-bg-surface/80 text-text-secondary hover:text-text-primary border border-border-main/15 transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                    title="More Options"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-main/10 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <button 
              onClick={() => setActiveTab('all')}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer",
                activeTab === 'all' 
                  ? "bg-primary text-black shadow-md shadow-primary/20" 
                  : "bg-bg-surface/70 text-text-secondary hover:text-text-primary border border-border-main/10"
              )}
            >
              All Drive Tracks ({songs.length})
            </button>
            <button 
              onClick={() => setActiveTab('recent')}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer",
                activeTab === 'recent' 
                  ? "bg-primary text-black shadow-md shadow-primary/20" 
                  : "bg-bg-surface/70 text-text-secondary hover:text-text-primary border border-border-main/10"
              )}
            >
              Recently Added
            </button>
            <button 
              onClick={() => setActiveTab('offline')}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer",
                activeTab === 'offline' 
                  ? "bg-primary text-black shadow-md shadow-primary/20" 
                  : "bg-bg-surface/70 text-text-secondary hover:text-text-primary border border-border-main/10"
              )}
            >
              Saved Offline
            </button>
          </div>

          <div className="text-xs font-medium text-text-secondary self-end sm:self-auto">
            Showing <span className="font-bold text-text-primary">{filteredSongs.length}</span> results
          </div>
        </div>

        {filteredSongs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl bg-bg-surface/30 border border-border-main/10">
            <Search className="w-10 h-10 text-text-secondary/50 mb-3" />
            <p className="text-base font-bold text-text-primary">No tracks found</p>
            <p className="text-xs text-text-secondary mt-1">Try adjusting your search query or tab filter.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredSongs.map((song, idx) => (
              <DriveGridCard
                key={song.id}
                song={song}
                idx={idx}
                currentSong={currentSong}
                isPlaying={isPlaying}
                playSong={playSong}
                enrichMetadata={enrichMetadata}
              />
            ))}
          </div>
        ) : (
          <div className="bg-bg-surface/40 rounded-2xl border border-border-main/10 overflow-hidden shadow-xl backdrop-blur-md">
            <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 text-[11px] font-black uppercase tracking-wider text-text-secondary border-b border-border-main/10 bg-bg-surface/60">
              <div className="col-span-1">#</div>
              <div className="col-span-5">Title & Artist</div>
              <div className="col-span-3">Album</div>
              <div className="col-span-1 text-center">Size</div>
              <div className="col-span-2 text-right">Time</div>
            </div>

            <div className="divide-y divide-border-main/5">
              {filteredSongs.map((song, index) => (
                <DriveListRow
                  key={song.id}
                  song={song}
                  index={index}
                  currentSong={currentSong}
                  isPlaying={isPlaying}
                  isLiked={likedSongs?.some(s => s.id === song.id)}
                  playSong={playSong}
                  toggleLike={toggleLike}
                  setOptionsSong={setOptionsSong}
                  enrichMetadata={enrichMetadata}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DriveSource;
