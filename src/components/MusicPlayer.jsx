import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../context/ToastContext';
import {
  Play, Pause, SkipBack, SkipForward, Repeat, Shuffle,
  Volume2, VolumeX, Maximize2, ChevronDown, MoreHorizontal,
  ListMusic, Share2, Heart, Loader2, ListPlus, PlusCircle,
  Download, FolderPlus, Disc, User, Info, X, RefreshCw, ChevronRight, CheckCircle, Mic, Mic2
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePlayer } from '../context/usePlayer';
import { usePlaylists } from '../context/PlaylistContext';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import PlayingVisualizer from './PlayingVisualizer';
import SongImage from './SongImage';

const formatTime = (time) => {
  if (isNaN(time)) return "0:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const WaveVisualizer = memo(() => {
  return (
    <div className="absolute inset-x-0 bottom-0 h-64 pointer-events-none z-0 overflow-hidden opacity-30">
      <svg className="w-full h-full" viewBox="0 0 1440 320" preserveAspectRatio="none">
        <motion.path
          d="M0 160 C 320 300 420 10 720 160 C 1020 310 1120 20 1440 160 V 320 H 0 Z"
          initial={{ d: "M0 160 C 320 300 420 10 720 160 C 1020 310 1120 20 1440 160 V 320 H 0 Z" }}
          animate={{
            d: [
              "M0 160 C 320 300 420 10 720 160 C 1020 310 1120 20 1440 160 V 320 H 0 Z",
              "M0 160 C 320 20 420 310 720 160 C 1020 10 1120 300 1440 160 V 320 H 0 Z",
              "M0 160 C 320 300 420 10 720 160 C 1020 310 1120 20 1440 160 V 320 H 0 Z"
            ]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          fill="url(#wave-gradient)"
          className="opacity-50"
        />
        <defs>
          <linearGradient id="wave-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.2" />
            <stop offset="50%" stopColor="var(--color-primary)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.2" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
});

const DynamicBackground = memo(({ cover }) => (
  <>
    <div
      className="absolute inset-0 z-0 opacity-100 blur-[80px] pointer-events-none scale-[2] transform-gpu will-change-[filter,transform]"
      style={{
        backgroundImage: `url(${cover})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover'
      }}
    />
    <div className="absolute inset-0 z-0 bg-bg-base/60 bg-gradient-to-b from-bg-base/20 via-transparent to-bg-base/90 pointer-events-none" />
  </>
));

const UpNextPanel = memo(({ queue, activeSong, playSong, activeItemRef }) => (
  <div className="hidden md:flex flex-col w-[320px] h-[62vh] glass-premium rounded-[3rem] p-8 border border-border-main/5 relative overflow-hidden group">
    <div className="absolute inset-0 bg-gradient-to-br from-text-primary/5 to-transparent pointer-events-none" />
    <h3 className="text-text-secondary/40 text-[10px] font-black uppercase tracking-[0.4em] mb-10 relative z-10">Up Next</h3>
    <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth overscroll-contain mask-fade-v space-y-7 relative z-10 pr-2 pb-20">
      {queue?.map((song, i) => (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          key={song.id}
          ref={activeSong?.id === song.id ? activeItemRef : null}
          className={cn(
            "flex items-center gap-5 group/item cursor-pointer",
            activeSong?.id === song.id && "bg-primary/5 p-2 -m-2 rounded-2xl border border-primary/20 shadow-[0_0_15px_rgba(var(--primary-rgb),0.05)]"
          )}
          onClick={() => playSong(song)}
        >
          <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 shadow-2xl group-hover/item:scale-110 transition-transform duration-500 bg-bg-surface flex items-center justify-center relative">
            <SongImage
              src={song.thumbnail || song.cover}
              alt={song.title}
              className="w-full h-full object-cover"
            />
            {activeSong?.id === song.id && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                 <PlayingVisualizer className="h-3 gap-[1px]" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn("text-[15px] font-bold truncate transition-colors", activeSong?.id === song.id ? "text-primary" : "text-text-primary group-hover/item:text-primary")}>{song.title}</p>
            <p className="text-[11px] text-text-secondary/30 font-bold truncate uppercase tracking-widest mt-1">{song.artist}</p>
          </div>
        </motion.div>
      ))}
    </div>
  </div>
));

const PlayerHero = memo(({ activeSong, likedSongs, toggleLike }) => (
  <div className="flex-1 flex flex-col justify-end md:justify-center w-full max-w-2xl min-h-0 pt-2 pb-2 md:py-8 relative">
    <div className="relative w-full flex-1 min-h-0 flex items-center justify-center mb-6 md:mb-8 group px-8 md:px-0">
      <div className="absolute inset-0 bg-primary/25 blur-[120px] rounded-full opacity-40 group-hover:opacity-70 transition-opacity duration-1000 hidden md:block" />
      <motion.div
        key={activeSong.id + 'artwork'}
        className="relative z-10 w-full h-full max-w-[500px] md:max-w-[440px] flex items-center justify-center"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <SongImage
          src={activeSong.cover}
          alt={activeSong.title}
          className="rounded-md shadow-2xl md:rounded-[3.5rem] md:shadow-[0_50px_100px_rgba(0,0,0,0.4)] dark:md:shadow-[0_50px_100px_rgba(0,0,0,0.7)] md:border md:border-border-main/10 group-hover:rotate-2 group-hover:scale-105 transition-all duration-700 ease-out"
          style={{ width: '100%', height: '100%', maxWidth: '100%', maxHeight: '100%', objectFit: 'cover', aspectRatio: '1/1' }}
        />
      </motion.div>
    </div>

    <div className="w-full px-8 md:px-0 relative z-10 text-left md:text-center mt-auto flex-shrink-0">
      <motion.div
        key={activeSong.id + 'info'}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex items-center justify-between md:flex-col md:items-center gap-2 md:gap-3"
      >
        <div className="flex flex-col gap-1 md:gap-3 min-w-0 pr-4 md:pr-0">
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight truncate w-full">
            {activeSong.title}
          </h2>
          <div className="flex items-center gap-3 text-text-secondary/60 text-base md:text-sm font-normal tracking-tight truncate w-full md:justify-center">
            <span className="truncate">{activeSong.artist}</span>
            <div className="w-1.5 h-1.5 rounded-full bg-border-main/20 hidden md:block" />
            <Heart
              className={cn(
                "w-7 h-7 transition-all cursor-pointer hover:scale-125 active:scale-90 hidden md:block",
                likedSongs.includes(activeSong.id) ? "text-primary fill-current drop-shadow-[0_0_10px_rgba(29,185,84,0.5)]" : "text-text-secondary/20 hover:text-text-primary"
              )}
              onClick={(e) => {
                e.stopPropagation();
                toggleLike(activeSong);
              }}
            />
          </div>
        </div>

        {/* Mobile Like Button (Right-aligned) */}
        <div className="flex-shrink-0 md:hidden ml-4">
          <Heart
            className={cn(
              "w-7 h-7 transition-all cursor-pointer active:scale-90",
              likedSongs.includes(activeSong.id) ? "text-primary fill-current drop-shadow-[0_0_10px_rgba(29,185,84,0.5)]" : "text-text-secondary/70"
            )}
            onClick={(e) => {
              e.stopPropagation();
              toggleLike(activeSong);
            }}
          />
        </div>
      </motion.div>
    </div>
  </div>
));

const LyricLine = memo(({ text, isActive, onClick }) => {
  return (
    <motion.p
      initial={false}
      animate={{
        opacity: isActive ? 1 : 0.25,
        scale: isActive ? 1.05 : 1,
        color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
        filter: isActive ? 'blur(0px)' : 'blur(1px)'
      }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      className={cn(
        "text-xl md:text-2xl font-black text-center px-4 transition-all duration-700",
        isActive ? "drop-shadow-[0_0_20px_rgba(29,185,84,0.4)]" : "hover:opacity-100 cursor-pointer"
      )}
      onClick={onClick}
    >
      {text}
    </motion.p>
  );
});
const LyricsPanel = memo(({
  isLyricsLoading, lyrics, activeIndex, lyricsContainerRef, handleLyricsScroll,
  seek, duration, activeSong, setIsAutoScrollEnabled, isExpanded, onToggle,
  subTab, setSubTab
}) => (
  <motion.div
    layout
    initial={false}
    animate={{
      width: isExpanded ? "360px" : "80px",
      height: "62vh"
    }}
    transition={{ type: "spring", damping: 30, stiffness: 200 }}
    className="hidden md:flex flex-col glass-premium rounded-[3rem] p-8 border border-border-main/5 relative overflow-hidden group cursor-pointer"
    onClick={() => !isExpanded && onToggle()}
  >
    <div className="absolute inset-0 bg-gradient-to-bl from-white/5 to-transparent pointer-events-none" />

    <div className={cn(
      "flex items-center justify-between mb-10 relative z-10",
      !isExpanded && "flex-col gap-10 mt-4"
    )}>
      <div className={cn("flex items-center gap-8", !isExpanded && "flex-col gap-10")}>
        <button
          className={cn(
            "text-[11px] font-black uppercase tracking-[0.4em] transition-all",
            isExpanded && subTab === 'lyrics' ? "text-text-primary" : "text-text-secondary/40",
            !isExpanded && "rotate-90"
          )}
          onClick={(e) => {
            e.stopPropagation();
            if (isExpanded) {
              setSubTab('lyrics');
            } else {
              onToggle();
            }
          }}
        >
          {isExpanded ? "Lyrics" : <ListMusic className="w-5 h-5 -rotate-90" />}
        </button>
        {isExpanded && (
          <button
            className={cn(
              "text-[11px] font-black uppercase tracking-[0.3em] transition-all",
              subTab === 'credits' ? "text-text-primary" : "text-text-secondary/20 hover:text-text-secondary/40"
            )}
            onClick={(e) => {
              e.stopPropagation();
              setSubTab('credits');
            }}
          >
            Credits
          </button>
        )}
      </div>

      {isExpanded && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="p-2 hover:bg-bg-surface/50 rounded-full text-text-secondary/20 hover:text-text-primary transition-all active:scale-90"
          title="Collapse"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </div>

    {isExpanded && (
      <div className="flex-1 overflow-hidden relative z-10">
        <AnimatePresence mode="wait">
          {subTab === 'lyrics' ? (
            <motion.div
              key="lyrics"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full flex flex-col"
            >
              <div
                ref={lyricsContainerRef}
                onScroll={handleLyricsScroll}
                className="flex-1 overflow-y-auto no-scrollbar scroll-smooth overscroll-contain mask-fade-v space-y-12 pr-2 pb-20"
              >
                {isLyricsLoading ? (
                  <div className="flex flex-col items-center justify-center h-full gap-5">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <p className="text-text-secondary/20 text-[10px] font-black uppercase tracking-[0.4em]">Retrieving</p>
                  </div>
                ) : lyrics.length > 0 ? (
                  lyrics.map((line, i) => (
                    <LyricLine
                      key={i}
                      text={line.text}
                      isActive={activeIndex === i}
                      onClick={() => {
                        line.time > 0 && seek((line.time / duration) * 100);
                        setIsAutoScrollEnabled(true);
                      }}
                    />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6 gap-8">
                    <p className="text-text-secondary/30 text-lg font-bold">No lyrics currently synced</p>
                    <button
                      onClick={() => window.open(`https://genius.com/search?q=${encodeURIComponent(`${activeSong.artist} ${activeSong.title}`)}`, '_blank')}
                      className="px-8 py-3 rounded-full border border-border-main/10 text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary/40 hover:text-text-primary hover:bg-bg-surface transition-all shadow-xl"
                    >
                      Find on Genius
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="credits"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={{
                initial: { opacity: 0 },
                animate: { opacity: 1, transition: { staggerChildren: 0.1 } },
                exit: { opacity: 0 }
              }}
              className="h-full flex flex-col"
            >
              <div className="flex-1 overflow-y-auto no-scrollbar mask-fade-v pt-4 pb-20 space-y-10">
                <motion.div
                  variants={{
                    initial: { opacity: 0, y: 10 },
                    animate: { opacity: 1, y: 0 }
                  }}
                  className="space-y-2"
                >
                  <p className="text-[9px] font-black uppercase tracking-[0.4em] text-text-secondary/20">Performed by</p>
                  <p className="text-2xl font-black text-text-primary">{activeSong.artist}</p>
                </motion.div>

                {activeSong.album && (
                  <motion.div
                    variants={{
                      initial: { opacity: 0, y: 10 },
                      animate: { opacity: 1, y: 0 }
                    }}
                    className="space-y-2"
                  >
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-text-secondary/20">Album</p>
                    <p className="text-lg font-bold text-text-primary/80">{activeSong.album}</p>
                  </motion.div>
                )}

                <div className="grid grid-cols-2 gap-8">
                  {activeSong.year && (
                    <motion.div
                      variants={{
                        initial: { opacity: 0, y: 10 },
                        animate: { opacity: 1, y: 0 }
                      }}
                      className="space-y-2"
                    >
                      <p className="text-[9px] font-black uppercase tracking-[0.4em] text-text-secondary/20">Released</p>
                      <p className="text-sm font-bold text-text-secondary/60">{activeSong.year}</p>
                    </motion.div>
                  )}
                  {activeSong.genre && (
                    <motion.div
                      variants={{
                        initial: { opacity: 0, y: 10 },
                        animate: { opacity: 1, y: 0 }
                      }}
                      className="space-y-2"
                    >
                      <p className="text-[9px] font-black uppercase tracking-[0.4em] text-text-secondary/20">Genre</p>
                      <p className="text-sm font-bold text-text-secondary/60">{activeSong.genre}</p>
                    </motion.div>
                  )}
                </div>

                <motion.div
                  variants={{
                    initial: { opacity: 0, y: 10 },
                    animate: { opacity: 1, y: 0 }
                  }}
                  className="pt-10 space-y-8"
                >
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-white/5 to-transparent mb-10" />

                  <div className="space-y-6">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-[0.4em] text-text-secondary/20">Service by</p>
                      <p className="text-sm font-bold text-text-secondary/60">SumanOnline.Com</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-[0.4em] text-text-secondary/20">Developed by</p>
                      <p className="text-sm font-bold text-text-secondary/60">Suman Chakrabortty</p>
                    </div>
                  </div>

                  <button
                    onClick={() => window.open(`https://genius.com/search?q=${encodeURIComponent(`${activeSong.artist} ${activeSong.title}`)}`, '_blank')}
                    className="w-full py-4 rounded-2xl border border-border-main/10 bg-bg-surface/50 hover:bg-bg-surface transition-all text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary/60 hover:text-text-primary flex items-center justify-center gap-3 active:scale-[0.98] mt-10"
                  >
                    View detailed credits on Genius
                  </button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )}

    {!isExpanded && (
      <div className="absolute inset-x-0 bottom-10 flex justify-center z-10">
        <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_10px_rgba(29,185,84,0.5)]" />
      </div>
    )}
  </motion.div>
));

const TimeDisplay = memo(({ currentTime, duration }) => (
  <div className="flex justify-between text-[11px] font-medium text-text-secondary/50 tracking-wide mt-1.5">
    <span>{formatTime(currentTime)}</span>
    <span>{formatTime(duration)}</span>
  </div>
));

const ProgressBar = memo(({ progress, seek }) => (
  <div
    className="relative w-full h-6 flex items-center cursor-pointer group touch-none"
    onClick={(e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      seek(((e.clientX - rect.left) / rect.width) * 100);
    }}
  >
    <div className="w-full h-[2px] bg-border-main/20 rounded-full relative">
      <motion.div
        className="absolute h-full bg-primary rounded-full flex justify-end items-center"
        style={{ width: `${progress}%` }}
        transition={{ type: "spring", bounce: 0, duration: 0.3 }}
      >
        <div className="w-3 h-3 bg-primary rounded-full scale-100 md:scale-0 group-hover:scale-100 transition-transform -mr-1.5 absolute right-0" />
      </motion.div>
    </div>
  </div>
));

const PlaybackControls = memo(({
  isShuffle, setIsShuffle, playPrevious, togglePlay, isBuffering, isPlaying, playNext, repeatMode, setRepeatMode
}) => (
  <div className="flex items-center justify-between w-full px-0">
    <Shuffle
      className={cn("w-[22px] h-[22px] transition-colors cursor-pointer", isShuffle ? "text-primary" : "text-text-secondary/40 hover:text-text-primary")}
      onClick={() => setIsShuffle(!isShuffle)}
    />
    <div className="flex items-center gap-7 md:gap-10">
      <SkipBack className="w-8 h-8 text-text-primary fill-current hover:text-primary transition-colors cursor-pointer active:scale-90" onClick={playPrevious} />

      <button
        className="group relative"
        onClick={togglePlay}
        disabled={isBuffering}
      >
        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block" />
        <div className="relative w-[72px] h-[72px] md:w-16 md:h-16 rounded-full bg-text-primary flex items-center justify-center shadow-xl group-active:scale-95 transition-transform overflow-hidden">
          {isBuffering ? (
            <Loader2 className="w-8 h-8 text-bg-surface animate-spin" />
          ) : isPlaying ? (
            <Pause className="text-bg-surface w-8 h-8 fill-current" />
          ) : (
            <Play className="text-bg-surface w-8 h-8 fill-current ml-1" />
          )}
        </div>
      </button>

      <SkipForward className="w-8 h-8 text-text-primary fill-current hover:text-primary transition-colors cursor-pointer active:scale-90" onClick={playNext} />
    </div>
    <Repeat
      className={cn("w-[22px] h-[22px] transition-colors cursor-pointer", repeatMode !== 'none' ? "text-primary" : "text-text-secondary/40 hover:text-text-primary")}
      onClick={() => setRepeatMode(repeatMode === 'none' ? 'all' : repeatMode === 'all' ? 'one' : 'none')}
    />
  </div>
));

const MusicPlayer = () => {
  const { user } = useAuth();
  const {
    songs,
    queue,
    currentSong,
    isPlaying,
    progress,
    currentTime,
    duration,
    togglePlay,
    playNext,
    playPrevious,
    playSong,
    seek,
    volume,
    setVolume,
    isShuffle,
    setIsShuffle,
    repeatMode,
    setRepeatMode,
    isBuffering,
    optionsSong,
    setOptionsSong,
    likedSongs,
    toggleLike,
    lyrics,
    isLyricsLoading,
    isFullScreen,
    setIsFullScreen
  } = usePlayer();

  const [activeTab, setActiveTab] = useState('upnext');
  const { showToast } = useToast();
  const [prevVolume, setPrevVolume] = useState(1.0);
  const { playlists, createPlaylist, addSongToPlaylist } = usePlaylists();
  const [isPlaylistPickerOpen, setIsPlaylistPickerOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showNewPlaylistInput, setShowNewPlaylistInput] = useState(false);
  const [isTabCollapsed, setIsTabCollapsed] = useState(true);
  const [isLyricsExpanded, setIsLyricsExpanded] = useState(false);
  const [lyricsSubTab, setLyricsSubTab] = useState('lyrics');
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverX, setHoverX] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const isAppRoute = location.pathname.startsWith('/app');

  const relatedSongs = useMemo(() => {
    if (!currentSong || !songs) return [];
    const primaryArtist = currentSong.artist.split(/\s*,\s*|\s*&\s*|\s+and\s+/i)[0].trim().toLowerCase();

    return songs.filter(song =>
      song.id !== currentSong.id &&
      song.title !== currentSong.title &&
      (song.artist.toLowerCase().includes(primaryArtist) || currentSong.artist.toLowerCase().includes(song.artist.toLowerCase()))
    ).slice(0, 30);
  }, [currentSong, songs]);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  const toggleMute = () => {
    if (volume > 0) {
      setPrevVolume(volume);
      setVolume(0);
    } else {
      setVolume(prevVolume || 0.7);
    }
  };

  const handleOptionClick = (msg) => {
    showToast(msg);
    setOptionsSong(null);
  };

  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const lyricsContainerRef = useRef(null);
  const queueContainerRef = useRef(null);
  const activeQueueItemRef = useRef(null);
  const autoScrollTimeoutRef = useRef(null);

  // Calculate active lyric index once per render
  const activeIndex = useMemo(() => {
    if (!lyrics.length) return -1;
    // Apply a small offset (e.g., -150ms) to compensate rendering lag
    const adjustedTime = currentTime + 0.15;
    return lyrics.findIndex((line, i) => {
      const nextLine = lyrics[i + 1];
      return adjustedTime >= line.time && (!nextLine || adjustedTime < nextLine.time);
    });
  }, [lyrics, currentTime]);

  // Auto-scroll lyrics
  useEffect(() => {
    if (activeTab === 'lyrics' && lyrics.length > 0 && lyricsContainerRef.current && isAutoScrollEnabled) {
      // On desktop, we always scroll. On mobile, we only scroll if not collapsed.
      const isMobile = window.innerWidth < 768;
      if (isMobile && isTabCollapsed) return;

      if (activeIndex !== -1) {
        const element = lyricsContainerRef.current.children[activeIndex];
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [activeIndex, activeTab, lyrics, isAutoScrollEnabled, isTabCollapsed]);

  const handleLyricsScroll = useCallback(() => {
    if (!isAutoScrollEnabled) {
      if (autoScrollTimeoutRef.current) clearTimeout(autoScrollTimeoutRef.current);
      autoScrollTimeoutRef.current = setTimeout(() => {
        setIsAutoScrollEnabled(true);
      }, 3000);
      return;
    }

    setIsAutoScrollEnabled(false);
    autoScrollTimeoutRef.current = setTimeout(() => {
      setIsAutoScrollEnabled(true);
    }, 3000);
  }, [isAutoScrollEnabled]);

  const activeSong = currentSong;

  // Auto-scroll queue to active song
  useEffect(() => {
    if (activeTab === 'upnext' && activeQueueItemRef.current) {
      const isMobile = window.innerWidth < 768;
      // On desktop expanded or mobile tab content
      if (!isMobile || !isTabCollapsed) {
        activeQueueItemRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }
    }
  }, [currentSong?.id, activeTab, isTabCollapsed, isFullScreen]);


  if (location.pathname === '/' || location.pathname.includes('admin-panel') || location.pathname === '/app/profile') return null;

  return (
    <>
      {currentSong && (
        <>
          {/* Mini Player */}
          <motion.div
            drag={isDesktop ? false : "x"}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, { offset, velocity }) => {
              if (isDesktop) return;
              if (offset.x > 100 || velocity.x > 500) {
                playPrevious();
              } else if (offset.x < -100 || velocity.x < -500) {
                playNext();
              }
            }}
            className={cn(
              "fixed left-0 right-0 h-20 bg-bg-surface border-t border-border-main/10 px-3 md:px-6 flex items-center justify-between z-[90] transition-all duration-300 md:h-20 md:bg-bg-surface/95 md:backdrop-blur-lg",
              !isDesktop && "cursor-grab active:cursor-grabbing",
              "bottom-0 border-b border-border-main/10 md:border-b-0",
              isFullScreen ? "opacity-0 pointer-events-none md:opacity-100 md:pointer-events-auto" : "opacity-100"
            )}
          >
            {/* Top Progress Line (Interactive) */}
            <div
              className="absolute top-0 left-0 right-0 h-4 -mt-2 z-10 group cursor-pointer flex items-center touch-none hidden md:flex"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percentage = Math.max(0, Math.min(1, x / rect.width));
                setHoverTime(percentage * duration);
                setHoverX(x);
              }}
              onMouseLeave={() => setHoverTime(null)}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                seek(((e.clientX - rect.left) / rect.width) * 100);
              }}
            >
              <div className="w-full h-[2px] bg-border-main/20 relative transition-all duration-200 group-hover:h-[4px]">
                <motion.div
                  className="absolute left-0 top-0 bottom-0 bg-primary"
                  style={{ width: `${progress}%` }}
                  transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-primary rounded-full scale-0 group-hover:scale-100 transition-transform duration-200 shadow-lg translate-x-1/2" />
                </motion.div>
              </div>
              <AnimatePresence>
                {hoverTime !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full mb-2 -translate-x-1/2 bg-[#282828] text-white/90 text-[11px] font-bold px-2 py-1 rounded shadow-xl pointer-events-none whitespace-nowrap"
                    style={{ left: hoverX }}
                  >
                    {formatTime(hoverTime)}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-border-main/10 overflow-hidden md:hidden">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              />
            </div>

            {/* Mobile Mini Player */}
            <div className="flex md:hidden items-center justify-between w-full h-full gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0" onClick={() => setIsFullScreen(true)}>
                <motion.div
                  className="w-14 h-14 rounded-md overflow-hidden bg-bg-base border border-border-main/5 flex-shrink-0"
                  animate={{
                    scale: isPlaying ? [1, 1.05, 1] : 1,
                    boxShadow: isPlaying ? "0 0 20px rgba(29, 185, 84, 0.2)" : "none"
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <SongImage src={activeSong.cover} alt={activeSong.title} className="w-full h-full object-cover" />
                </motion.div>
                <div className="min-w-0 leading-tight">
                  <h4 className="text-text-primary font-medium text-sm truncate">{activeSong.title}</h4>
                  <p className="text-text-secondary text-xs truncate">{activeSong.artist}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0 text-text-primary">
                <button className="w-8 h-8 rounded-full bg-text-primary flex items-center justify-center" onClick={togglePlay} disabled={isBuffering}>
                  {isBuffering ? <Loader2 className="w-4 h-4 text-bg-surface animate-spin" /> : isPlaying ? <Pause className="text-bg-surface w-4 h-4 fill-current" /> : <Play className="text-bg-surface w-4 h-4 fill-current" />}
                </button>
                <SkipForward className="w-5 h-5 text-text-secondary hover:text-text-primary transition-colors cursor-pointer" onClick={playNext} />
              </div>
            </div>

            {/* Desktop Mini Player */}
            <div className="hidden md:flex items-center justify-between w-full h-full gap-6 px-4">
              {/* Section 1: Track Info (Left) */}
              <div className="flex items-center gap-4 min-w-[320px] max-w-[400px] shrink-0 overflow-hidden group/art">
                <div className="w-12 h-12 rounded-sm bg-bg-base overflow-hidden flex-shrink-0 cursor-pointer relative flex items-center justify-center group-hover/art:after:content-[''] group-hover/art:after:absolute group-hover/art:after:inset-0 group-hover/art:after:bg-black/40 transition-all shadow-[0_4px_10px_rgba(0,0,0,0.5)]" onClick={() => setIsFullScreen(true)}>
                  <SongImage src={activeSong.cover} alt={activeSong.title} className="w-full h-full object-cover group-hover/art:scale-105 transition-all duration-700 ease-out absolute inset-0 z-0" />
                  <div className="relative z-10 opacity-0 group-hover/art:opacity-100 transition-opacity">
                    <Maximize2 className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="min-w-0 leading-tight flex-1">
                  <h4 className="text-text-primary font-bold text-[15px] truncate hover:underline cursor-pointer" onClick={() => setIsFullScreen(true)}>{activeSong.title}</h4>
                  <p className="text-text-secondary text-[13px] font-medium truncate mt-0.5 hover:text-text-primary transition-colors cursor-pointer">{activeSong.artist}</p>
                </div>
              </div>

              {/* Section 2: Controls & Time (Center) */}
              <div className="flex flex-col items-center flex-1 min-w-0 justify-center gap-1">
                <div className="flex items-center gap-8">
                  <SkipBack className="w-5 h-5 text-text-secondary hover:text-text-primary cursor-pointer fill-current active:scale-95 transition-transform" onClick={playPrevious} />
                  <button
                    onClick={togglePlay}
                    disabled={isBuffering}
                    className="active:scale-95 transition-transform p-3 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    {isBuffering ? <Loader2 className="w-8 h-8 text-text-primary animate-spin" /> : isPlaying ? <Pause className="text-text-primary w-8 h-8 fill-current" /> : <Play className="text-text-primary w-8 h-8 fill-current ml-0.5" />}
                  </button>
                  <SkipForward className="w-5 h-5 text-text-secondary hover:text-text-primary cursor-pointer fill-current active:scale-95 transition-transform" onClick={playNext} />
                </div>
                <span className="text-[11px] text-zinc-500 font-bold font-mono tracking-widest uppercase">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              {/* Section 3: Extra Actions (Right) */}
              <div className="flex items-center justify-end gap-1 min-w-[350px] shrink-0 pr-2">
                <div className="flex items-center mr-4">
                  <Heart
                    className={cn(
                      "w-5 h-5 transition-all cursor-pointer mr-2",
                      likedSongs.includes(activeSong.id) ? "text-primary fill-current scale-110" : "text-text-secondary hover:text-text-primary"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLike(activeSong);
                    }}
                  />
                  <MoreHorizontal 
                    className="w-5 h-5 text-text-secondary hover:text-text-primary cursor-pointer" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setOptionsSong(optionsSong?.id === activeSong.id ? null : activeSong);
                    }} 
                  />
                </div>

                <button className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors active:scale-95" onClick={() => setRepeatMode(repeatMode === 'none' ? 'all' : repeatMode === 'all' ? 'one' : 'none')}>
                  <Repeat className={cn("w-5 h-5", repeatMode !== 'none' ? "text-primary drop-shadow-[0_0_8px_rgba(29,185,84,0.4)]" : "text-text-secondary hover:text-text-primary")} />
                </button>
                <button className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors active:scale-95" onClick={() => setIsShuffle(!isShuffle)}>
                  <Shuffle className={cn("w-5 h-5", isShuffle ? "text-primary drop-shadow-[0_0_8px_rgba(29,185,84,0.4)]" : "text-text-secondary hover:text-text-primary")} />
                </button>

                <div className="flex items-center gap-2 w-[140px] group/vol mx-2">
                  <button onClick={toggleMute} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors active:scale-95 text-text-secondary hover:text-text-primary">
                    {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <div
                    className="flex-1 h-[3px] bg-border-main/20 rounded-full cursor-pointer relative"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setVolume(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
                    }}
                  >
                    <div className="absolute inset-0 -top-2 -bottom-2 bg-transparent" /> {/* Larger hit target */}
                    <div className="h-full bg-text-primary rounded-full transition-all group-hover/vol:bg-primary" style={{ width: `${volume * 100}%` }} />
                    <div
                      className="absolute top-1/2 -mt-1.5 w-3 h-3 bg-text-primary rounded-full opacity-0 group-hover/vol:opacity-100 shadow-md transition-opacity"
                      style={{ left: `${volume * 100}%`, transform: 'translateX(-50%)' }}
                    />
                  </div>
                </div>

                <button onClick={() => setIsFullScreen(!isFullScreen)} className="p-2 ml-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors active:scale-95" aria-label="Expand player">
                  {isFullScreen ? <ChevronDown className="w-6 h-6 text-text-primary" /> : <ChevronRight className="w-6 h-6 text-text-primary -rotate-90" />}
                </button>
              </div>
            </div>
          </motion.div>

          {/* Fullscreen Player */}
          <AnimatePresence mode="wait">
            {/* --- MOBILE FULLSCREEN PLAYER --- */}
            {isFullScreen && !isDesktop && (
              <motion.div
                key="mobile-expanded"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed inset-0 z-[60] flex flex-col overflow-y-auto md:hidden no-scrollbar"
                style={{
                  backgroundColor: '#000000',
                  '--bg-base': '#000000',
                  '--bg-surface': '#121212',
                  '--text-primary': '#ffffff',
                  '--text-secondary': '#a7a7a7',
                  '--border-main': 'rgba(255, 255, 255, 0.1)',
                  '--color-bg-base': '#000000',
                  '--color-bg-surface': '#121212',
                  '--color-text-primary': '#ffffff',
                  '--color-text-secondary': '#a7a7a7',
                  '--color-border-main': 'rgba(255, 255, 255, 0.1)'
                }}
              >
                {/* Mobile Close Button (Highest Z-Index) */}
                <AnimatePresence>
                  {isTabCollapsed && !optionsSong && !isPlaylistPickerOpen && (
                    <motion.button 
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      onClick={() => setIsFullScreen(false)} 
                      className="fixed top-4 left-4 p-2 text-text-primary hover:bg-bg-surface/50 rounded-full transition-all active:scale-90 z-[100] md:hidden"
                      aria-label="Close player"
                    >
                      <ChevronDown className="w-9 h-9 drop-shadow-lg" />
                    </motion.button>
                  )}
                </AnimatePresence>

                {/* Main Viewport */}
                <div className="h-[100dvh] md:h-screen flex flex-col pt-4 md:pt-8 px-0 md:px-8 pb-0 relative z-10 overflow-hidden">
                  <DynamicBackground cover={activeSong.cover} />

                  <div className="relative z-20 flex flex-col h-full w-full min-h-0">
                    <div className="flex items-center justify-between mb-2 md:mb-4 flex-shrink-0 px-4 md:px-0 relative z-[10]">
                      <div className="w-10 md:hidden" /> {/* Spacer for the absolute close button */}
                      <div className="text-center space-y-1 mx-auto">
                        <p className="text-[9px] font-black tracking-[0.4em] text-text-secondary/30 uppercase">Playing from</p>
                        <p className="text-xs font-black text-text-primary tracking-[0.1em] uppercase">My Personal Library</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className={cn(
                            "p-2 rounded-full transition-all duration-300 md:hidden",
                            (lyrics.length > 0 || isLyricsLoading) ? "text-text-primary hover:bg-white/5 active:scale-95" : "text-text-primary/20 cursor-default"
                          )}
                          onClick={() => {
                            if (lyrics.length > 0 || isLyricsLoading) {
                              setActiveTab('lyrics');
                              setIsTabCollapsed(false);
                              setTimeout(() => document.getElementById('mobile-tab-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
                            }
                          }}
                        >
                          {isLyricsLoading ? (
                            <Loader2 className="w-6 h-6 text-text-primary animate-spin" />
                          ) : (
                            <ListMusic className="w-6 h-6" />
                          )}
                        </button>
                        <MoreHorizontal 
                          className="w-6 h-6 text-text-primary cursor-pointer hover:bg-bg-surface/50 rounded-full p-1" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setOptionsSong(optionsSong?.id === activeSong.id ? null : activeSong);
                          }} 
                        />
                      </div>
                    </div>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 lg:gap-24 items-center justify-items-center min-h-0 w-full max-w-7xl mx-auto px-0 md:px-8 pb-4">
                      <div className="hidden md:flex justify-self-end">
                        <UpNextPanel queue={queue} activeSong={activeSong} playSong={playSong} activeItemRef={activeQueueItemRef} />
                      </div>

                      <PlayerHero activeSong={activeSong} likedSongs={likedSongs} toggleLike={toggleLike} />

                      <div className="hidden md:flex justify-self-start">
                        <LyricsPanel
                          isLyricsLoading={isLyricsLoading}
                          lyrics={lyrics}
                          activeIndex={activeIndex}
                          lyricsContainerRef={lyricsContainerRef}
                          handleLyricsScroll={handleLyricsScroll}
                          seek={seek}
                          duration={duration}
                          activeSong={activeSong}
                          setIsAutoScrollEnabled={setIsAutoScrollEnabled}
                          isExpanded={isLyricsExpanded}
                          onToggle={() => setIsLyricsExpanded(!isLyricsExpanded)}
                          subTab={lyricsSubTab}
                          setSubTab={setLyricsSubTab}
                        />
                      </div>
                    </div>

                    {/* Footer Controls (Desktop optimized) */}
                    <div className="w-full max-w-5xl mx-auto pb-4 md:pb-0 relative z-30 px-8 md:px-0 flex-shrink-0">
                      <div className="flex flex-col gap-6 md:gap-4 w-full">
                        {/* Progress Bar */}
                        <div className="w-full">
                          <ProgressBar progress={progress} seek={seek} />
                          <TimeDisplay currentTime={currentTime} duration={duration} />
                        </div>

                        {/* Playback Buttons */}
                        <PlaybackControls
                          isShuffle={isShuffle}
                          setIsShuffle={setIsShuffle}
                          playPrevious={playPrevious}
                          togglePlay={togglePlay}
                          isBuffering={isBuffering}
                          isPlaying={isPlaying}
                          playNext={playNext}
                          repeatMode={repeatMode}
                          setRepeatMode={setRepeatMode}
                        />
                      </div>
                    </div>

                    {/* Mobile Bottom Tabs */}
                    <div className="flex items-center justify-between w-full px-12 pb-6 pt-2 relative z-30 md:hidden flex-shrink-0">
                      <button
                        onClick={() => {
                          setActiveTab('upnext');
                          setIsTabCollapsed(false);
                        }}
                        className="text-[15px] font-bold text-white/60 hover:text-white transition-colors cursor-pointer"
                      >
                        Up next
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab('lyrics');
                          setIsTabCollapsed(false);
                        }}
                        className="text-[15px] font-bold text-white/60 hover:text-white transition-colors cursor-pointer"
                      >
                        Lyrics
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab('related');
                          setIsTabCollapsed(false);
                        }}
                        className="text-[15px] font-bold text-white/60 hover:text-white transition-colors cursor-pointer"
                      >
                        Related
                      </button>
                    </div>

                    {/* Wave Visualizer Background */}
                    <WaveVisualizer />
                  </div>
                </div>

                {/* Mobile Tab Overlay (YouTube Music Style) */}
                <AnimatePresence>
                  {!isTabCollapsed && (
                    <motion.div
                      key="mobile-tab-overlay"
                      initial={{ y: "100%" }}
                      animate={{ y: 0 }}
                      exit={{ y: "100%" }}
                      transition={{ duration: 0.3, ease: [0.2, 0, 0.6, 1] }}
                      className="fixed inset-0 z-[80] bg-[#1c1c1c] flex flex-col md:hidden overflow-hidden"
                    >
                      {/* Mini Player Header */}
                      <div
                        className="flex items-center gap-3 px-4 py-3 bg-[#1c1c1c] shrink-0 active:bg-white/5 transition-colors"
                        onClick={() => setIsTabCollapsed(true)}
                      >
                        <div className="w-10 h-10 rounded overflow-hidden shadow-md shrink-0 bg-[#2a2a2a] flex items-center justify-center">
                          <SongImage src={activeSong.thumbnail || activeSong.cover} alt={activeSong.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center pt-0.5">
                          <p className="text-white font-bold text-[15px] leading-none mb-1 truncate">{activeSong.title}</p>
                          <p className="text-white/60 text-[13px] leading-none truncate">{activeSong.artist}</p>
                        </div>
                        <div className="flex items-center gap-4 shrink-0 px-2">
                          <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} disabled={isBuffering} className="p-1 active:scale-90 transition-transform">
                            {isBuffering ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : isPlaying ? <Pause className="w-6 h-6 text-white fill-current" /> : <Play className="w-6 h-6 text-white fill-current ml-0.5" />}
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); playNext(); }} className="p-1 active:scale-90 transition-transform">
                            <SkipForward className="w-6 h-6 text-white fill-current" />
                          </button>
                        </div>
                      </div>

                      {/* Tabs Bar */}
                      <div className="flex font-semibold text-[15px] bg-[#1c1c1c] shrink-0 px-1 border-b border-white/5 relative z-20 shadow-sm">
                        {['upnext', 'lyrics', 'related'].map(tab => (
                          <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                              "flex-1 py-3 text-center transition-colors relative font-medium",
                              activeTab === tab ? "text-white" : "text-white/50"
                            )}
                          >
                            {tab === 'upnext' ? 'Up next' : tab === 'lyrics' ? 'Lyrics' : 'Related'}
                            {activeTab === tab && (
                              <motion.div
                                layoutId="mobile-active-tab"
                                className="absolute bottom-0 left-[15%] right-[15%] h-[2px] bg-white rounded-t-full"
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                              />
                            )}
                          </button>
                        ))}
                      </div>

                      {/* Content Area */}
                      <div className="flex-1 bg-[#151515] relative overflow-hidden flex flex-col">
                        <AnimatePresence mode="wait">
                          {activeTab === 'lyrics' && (
                            <motion.div
                              key="lyrics"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="absolute inset-0 overflow-hidden flex flex-col"
                            >
                              {/* Sub-tab Switcher (Lyrics / Credits) */}
                              <div className="flex items-center gap-6 px-6 pt-6 pb-2 shrink-0">
                                <button
                                  onClick={() => setLyricsSubTab('lyrics')}
                                  className={cn(
                                    "text-[10px] font-black uppercase tracking-[0.3em] transition-all",
                                    lyricsSubTab === 'lyrics' ? "text-primary" : "text-white/30"
                                  )}
                                >
                                  LYRICS
                                </button>
                                <button
                                  onClick={() => setLyricsSubTab('credits')}
                                  className={cn(
                                    "text-[10px] font-black uppercase tracking-[0.3em] transition-all",
                                    lyricsSubTab === 'credits' ? "text-primary" : "text-white/30"
                                  )}
                                >
                                  CREDITS
                                </button>
                              </div>

                              <div className="flex-1 overflow-hidden relative">
                                <AnimatePresence mode="wait">
                                  {lyricsSubTab === 'lyrics' ? (
                                    <motion.div
                                      key="mobile-lyrics-list"
                                      ref={lyricsContainerRef}
                                      onScroll={handleLyricsScroll}
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -10 }}
                                      className="h-full overflow-y-auto no-scrollbar scroll-smooth pt-4 pb-40 px-6 space-y-8"
                                    >
                                      {isLyricsLoading ? (
                                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                                          <Loader2 className="w-10 h-10 text-white/50 animate-spin" />
                                        </div>
                                      ) : lyrics.length > 0 ? (
                                        lyrics.map((line, i) => (
                                          <motion.p
                                            key={i}
                                            initial={false}
                                            animate={{ opacity: i === activeIndex ? 1 : 0.4 }}
                                            transition={{ duration: 0.3 }}
                                            className={cn(
                                              "text-xl font-medium text-left transition-all duration-300 leading-snug",
                                              i === activeIndex ? "text-[#ffc800]" : "text-white/50 cursor-pointer hover:opacity-80"
                                            )}
                                            onClick={() => {
                                              line.time > 0 && seek((line.time / duration) * 100);
                                              setIsAutoScrollEnabled(true);
                                            }}
                                          >
                                            {line.text}
                                          </motion.p>
                                        ))
                                      ) : (
                                        <div className="flex flex-col items-center justify-center text-center py-20 gap-4 opacity-50">
                                          <p className="text-lg font-bold text-white">Lyrics unavailable</p>
                                          <button
                                            onClick={() => window.open(`https://genius.com/search?q=${encodeURIComponent(`${activeSong.artist} ${activeSong.title}`)}`, '_blank')}
                                            className="mt-4 px-6 py-2 rounded-full border border-white/20 text-[10px] font-bold hover:bg-white/10 transition-colors uppercase text-white"
                                          >
                                            Search external
                                          </button>
                                        </div>
                                      )}
                                    </motion.div>
                                  ) : (
                                    <motion.div
                                      key="mobile-credits-view"
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -10 }}
                                      className="h-full overflow-y-auto no-scrollbar pt-4 pb-40 px-6 space-y-10"
                                    >
                                      <div className="space-y-2">
                                        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20">PERFORMED BY</p>
                                        <p className="text-2xl font-black text-white">{activeSong.artist}</p>
                                      </div>

                                      {activeSong.album && (
                                        <div className="space-y-2">
                                          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20">ALBUM</p>
                                          <p className="text-lg font-bold text-white/80">{activeSong.album}</p>
                                        </div>
                                      )}

                                      <div className="grid grid-cols-2 gap-8">
                                        {activeSong.year && (
                                          <div className="space-y-2">
                                            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20">RELEASED</p>
                                            <p className="text-sm font-bold text-white/60">{activeSong.year}</p>
                                          </div>
                                        )}
                                        {activeSong.genre && (
                                          <div className="space-y-2">
                                            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20">GENRE</p>
                                            <p className="text-sm font-bold text-white/60">{activeSong.genre}</p>
                                          </div>
                                        )}
                                      </div>

                                      <div className="pt-10 space-y-8">
                                        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/5 to-transparent mb-10" />
                                        <div className="space-y-6">
                                          <div className="space-y-1">
                                            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20">SERVICE BY</p>
                                            <p className="text-sm font-bold text-white/60">SumanOnline.Com</p>
                                          </div>
                                          <div className="space-y-1">
                                            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20">DEVELOPED BY</p>
                                            <p className="text-sm font-bold text-white/60">Suman Chakrabortty</p>
                                          </div>
                                        </div>

                                        <button
                                          onClick={() => window.open(`https://genius.com/search?q=${encodeURIComponent(`${activeSong.artist} ${activeSong.title}`)}`, '_blank')}
                                          className="w-full py-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-[0.3em] text-white/60 hover:text-white flex items-center justify-center gap-3 active:scale-[0.98] mt-10"
                                        >
                                          VIEW DETAILED CREDITS ON GENIUS
                                        </button>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            </motion.div>
                          )}

                          {activeTab === 'upnext' && (
                            <motion.div
                              key="upnext"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="absolute inset-0 overflow-y-auto no-scrollbar scroll-smooth p-2 pb-32 space-y-1"
                            >
                              {queue?.map((song) => (
                                <div
                                  key={song.id}
                                  ref={currentSong?.id === song.id ? activeQueueItemRef : null}
                                  className={cn(
                                    "flex items-center gap-4 p-3 rounded-xl transition-colors cursor-pointer",
                                    currentSong?.id === song.id ? "bg-white/5" : "active:bg-white/5"
                                  )}
                                  onClick={() => playSong(song)}
                                >
                                  <div className="w-[44px] h-[44px] rounded-lg overflow-hidden flex-shrink-0 relative shadow-sm">
                                    <SongImage src={song.thumbnail || song.cover} alt={song.title} className="w-full h-full object-cover" />
                                    {currentSong?.id === song.id && isPlaying && (
                                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                        <PlayingVisualizer className="h-2.5 gap-[1px]" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className={cn("text-[15px] font-medium truncate leading-tight flex items-center gap-2", currentSong?.id === song.id ? "text-white" : "text-white/90")}>
                                      {song.title}
                                    </p>
                                    <p className="text-[13px] text-white/50 truncate mt-0.5">{song.artist}</p>
                                  </div>
                                  <div className="ml-auto flex-shrink-0 p-1">
                                    <MoreHorizontal className="w-5 h-5 text-white/50 active:text-white" onClick={(e) => { e.stopPropagation(); setOptionsSong(song); }} />
                                  </div>
                                </div>
                              ))}
                            </motion.div>
                          )}

                          {activeTab === 'related' && (
                            <motion.div
                              key="related"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="absolute inset-0 overflow-y-auto no-scrollbar scroll-smooth p-2 pb-32 space-y-1"
                            >
                              {relatedSongs.length > 0 ? (
                                relatedSongs.map((song) => (
                                  <div
                                    key={song.id}
                                    className="flex items-center gap-4 p-3 rounded-xl transition-colors cursor-pointer active:bg-white/5 hover:bg-white/5"
                                    onClick={() => playSong(song)}
                                  >
                                    <div className="w-[44px] h-[44px] rounded-lg overflow-hidden flex-shrink-0 relative shadow-sm">
                                      <SongImage src={song.thumbnail || song.cover} alt={song.title} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-[15px] font-medium truncate leading-tight flex items-center gap-2 text-text-primary">
                                        {song.title}
                                      </p>
                                      <p className="text-[13px] text-text-secondary/50 truncate mt-0.5">{song.artist}</p>
                                    </div>
                                    <div className="ml-auto flex-shrink-0 p-1">
                                      <MoreHorizontal className="w-5 h-5 text-text-secondary/50 active:text-text-primary" onClick={(e) => { e.stopPropagation(); setOptionsSong(song); }} />
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="p-8 text-center mt-10 opacity-50">
                                  <p className="text-white/70 font-bold mb-2">No related tracks found</p>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Sync Button Overlay */}
                        <AnimatePresence>
                          {activeTab === 'lyrics' && !isAutoScrollEnabled && (
                            <motion.button
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 20 }}
                              onClick={() => setIsAutoScrollEnabled(true)}
                              className="absolute bottom-8 right-6 bg-bg-surface/50 backdrop-blur-md border border-border-main/20 text-text-primary px-5 py-2.5 rounded-full text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl z-[80] active:scale-95 transition-all flex items-center gap-2 group"
                            >
                              <RefreshCw className="w-3.5 h-3.5 group-active:rotate-180 transition-transform duration-500" />
                              Sync
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {isFullScreen && isDesktop && (
              <motion.div
                key="desktop-expanded"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                style={{ willChange: "opacity" }}
                className="fixed top-16 md:left-64 right-0 bottom-0 z-[40] hidden md:flex overflow-hidden bg-bg-base"
              >
                {/* Global Expanded Background */}
                <div className="absolute inset-0 z-0" style={{ willChange: "transform" }}>
                  <DynamicBackground cover={activeSong.cover} />
                  <div className="absolute inset-0 bg-bg-surface/80 backdrop-blur-xl pointer-events-none" style={{ willChange: "transform" }} />
                </div>

                <div className="flex w-full h-full p-8 pb-32 gap-12 overflow-hidden mx-auto max-w-[1600px] relative z-10">
                  {/* Close button for desktop */}
                  {!optionsSong && !isPlaylistPickerOpen && (
                    <button 
                      onClick={() => setIsFullScreen(false)} 
                      className="absolute top-4 right-8 p-3 hover:bg-white/5 rounded-full transition-all text-text-primary z-20 group active:scale-90"
                      title="Minimize"
                    >
                      <ChevronDown className="w-8 h-8 group-hover:scale-110 transition-transform" />
                    </button>
                  )}
                  <div className="flex-1 flex flex-col items-center justify-center p-8 relative group max-h-full">
                    <div className="relative w-full max-w-[550px] rounded-[12px] shadow-[0_30px_80px_rgba(0,0,0,0.8)] overflow-hidden flex items-center justify-center group-hover:scale-[1.02] group-hover:rotate-1 transition-all duration-700 ease-out">
                      <SongImage 
                        src={activeSong.cover} 
                        alt={activeSong.title} 
                        className="w-full h-full object-contain max-h-[70vh]" 
                      />
                    </div>
                  </div>

                  {/* Right side: Tabs & Content Panel */}
                  <div className="w-[450px] flex flex-col shrink-0 h-full relative">
                    <div className="flex items-center gap-8 px-6 pt-4 shrink-0 pb-0 border-b border-border-main/10 relative z-10">
                      {['upnext', 'lyrics', 'credits'].map((tab) => (
                        <button key={tab} className="relative py-4 px-2 text-[13px] font-bold uppercase tracking-[0.15em] transition-colors" onClick={() => setActiveTab(tab)}>
                          <span className={activeTab === tab ? "text-text-primary font-black" : "text-text-secondary hover:text-text-primary"}>
                            {tab === 'upnext' ? 'Up Next' : tab === 'lyrics' ? 'Lyrics' : 'Credits'}
                          </span>
                          {activeTab === tab && <motion.div layoutId="desktop-active-tab" className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary rounded-t-sm" />}
                        </button>
                      ))}
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar pt-4 pb-6 relative z-10 mt-2">
                      <AnimatePresence mode="wait">
                        {activeTab === 'upnext' && (
                          <motion.div
                            key="desktop-upnext"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-1"
                          >
                            <div className="px-4 border-t border-transparent pt-4">
                              {queue?.map((song) => (
                                <div 
                                  key={song.id} 
                                  ref={currentSong?.id === song.id ? activeQueueItemRef : null}
                                  className={cn("flex items-center gap-4 p-3 rounded-xl transition-colors cursor-pointer group/q", currentSong?.id === song.id ? "bg-primary/20" : "hover:bg-bg-surface/80")} 
                                  onClick={() => playSong(song)}
                                >
                                  <div className="w-[48px] h-[48px] rounded-lg overflow-hidden flex-shrink-0 relative shadow-md">
                                    <SongImage src={song.thumbnail || song.cover} alt={song.title} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/q:opacity-100 transition-opacity">
                                      {currentSong?.id === song.id && isPlaying ? <PlayingVisualizer className="h-3 gap-[1px]" /> : <Play className="w-5 h-5 text-white ml-0.5" />}
                                    </div>
                                    {currentSong?.id === song.id && isPlaying && <div className="absolute inset-0 bg-black/20 flex items-center justify-center group-hover/q:hidden"><PlayingVisualizer className="h-3 gap-[1px]" /></div>}
                                  </div>
                                  <div className="min-w-0 pr-4 flex-1">
                                    <p className={cn("text-[15px] font-bold truncate leading-tight", currentSong?.id === song.id ? "text-primary" : "text-text-primary group-hover/q:text-primary")}>{song.title}</p>
                                    <p className="text-[13px] text-text-secondary truncate mt-1 group-hover/q:text-text-primary/70">{song.artist}</p>
                                  </div>
                                  <div className="flex items-center justify-center pr-2">
                                    <MoreHorizontal className="w-5 h-5 text-text-secondary hover:text-text-primary transition-colors cursor-pointer opacity-0 group-hover/q:opacity-100" onClick={(e) => { e.stopPropagation(); setOptionsSong(song); }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}

                        {activeTab === 'lyrics' && (
                          <motion.div
                            key="desktop-lyrics"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-8 pb-12 pr-6 pl-6 pt-4"
                            ref={lyricsContainerRef}
                          >
                            {isLyricsLoading ? (
                              <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
                                <Loader2 className="w-8 h-8 text-text-primary animate-spin" />
                                <p className="text-sm font-bold text-text-primary uppercase tracking-widest">Loading Lyrics...</p>
                              </div>
                            ) : lyrics.length > 0 ? (
                              lyrics.map((line, i) => (
                                <p
                                  key={i}
                                  onClick={() => { line.time > 0 && seek((line.time / duration) * 100); setIsAutoScrollEnabled(true); }}
                                  className={cn(
                                    "text-[28px] font-black transition-all duration-300 cursor-pointer hover:text-text-primary leading-tight",
                                    i === activeIndex ? "text-text-primary drop-shadow-[0_0_20px_rgba(255,255,255,0.1)] scale-[1.02] origin-left" : "text-text-secondary/30 hover:text-text-secondary/60"
                                  )}
                                >
                                  {line.text}
                                </p>
                              ))
                            ) : (
                              <div className="flex flex-col items-center justify-center text-center py-20 gap-4 opacity-50">
                                <p className="text-xl font-bold text-text-secondary">Lyrics unavailable</p>
                              </div>
                            )}
                          </motion.div>
                        )}

                        {activeTab === 'credits' && (
                          <motion.div
                            key="desktop-credits"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-10 pb-20 pr-8 pl-8 pt-6"
                          >
                            <div className="space-y-4">
                              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-text-secondary/30">Performed by</p>
                              <p className="text-3xl font-black text-text-primary tracking-tight leading-tight">{activeSong.artist}</p>
                            </div>

                            {activeSong.album && (
                              <div className="space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-text-secondary/30">Album</p>
                                <p className="text-xl font-bold text-text-primary/80">{activeSong.album}</p>
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-8 pt-2">
                              {activeSong.year && (
                                <div className="space-y-3">
                                  <p className="text-[10px] font-black uppercase tracking-[0.5em] text-text-secondary/30">Released</p>
                                  <p className="text-base font-bold text-text-secondary/60">{activeSong.year}</p>
                                </div>
                              )}
                              {activeSong.genre && (
                                <div className="space-y-3">
                                  <p className="text-[10px] font-black uppercase tracking-[0.5em] text-text-secondary/30">Genre</p>
                                  <p className="text-base font-bold text-text-secondary/60">{activeSong.genre}</p>
                                </div>
                              )}
                            </div>

                            <div className="pt-8 space-y-8">
                              <div className="h-px w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                              <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-1">
                                  <p className="text-[10px] font-black uppercase tracking-[0.5em] text-text-secondary/30">Service by</p>
                                  <p className="text-sm font-bold text-text-secondary/50">SumanOnline.Com</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[10px] font-black uppercase tracking-[0.5em] text-text-secondary/30">Developed by</p>
                                  <p className="text-sm font-bold text-text-secondary/50">Suman Chakrabortty</p>
                                </div>
                              </div>

                              <button
                                onClick={() => window.open(`https://genius.com/search?q=${encodeURIComponent(`${activeSong.artist} ${activeSong.title}`)}`, '_blank')}
                                className="w-full py-4 rounded-2xl border border-border-main/10 bg-white/5 hover:bg-white/10 transition-all text-[11px] font-bold uppercase tracking-[0.3em] text-text-secondary/60 hover:text-text-primary flex items-center justify-center gap-3 active:scale-[0.98]"
                              >
                                View Detailed Credits on Genius
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Options Menu Bottom Sheet */}
      {optionsSong && (
        <div className="fixed inset-0 md:left-64 z-[70] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOptionsSong(null)} />
          <div className={cn(
            "relative bg-bg-surface rounded-t-3xl pt-2 px-4 shadow-2xl border-t border-border-main/10 animate-in slide-in-from-bottom-full duration-300 pointer-events-auto pb-safe transition-colors mb-0 md:mb-20",
            isAppRoute && "pb-0 md:pb-5"
          )}>
            <div className="w-12 h-1 bg-border-main/20 rounded-full mx-auto mb-4" />

            <div className="flex items-center gap-4 mb-6 border-b border-border-main/10 pb-4">
              <div className="w-14 h-14 rounded overflow-hidden flex-shrink-0">
                <SongImage src={optionsSong.thumbnail || optionsSong.cover} alt={optionsSong.title} className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0 pr-4 flex-1">
                <p className="text-base font-bold text-text-primary truncate">{optionsSong.title}</p>
                <p className="text-sm text-text-secondary truncate">{optionsSong.artist}</p>
              </div>
              <button className="w-8 h-8 rounded-full bg-bg-surface/50 border border-border-main/10 flex items-center justify-center flex-shrink-0" onClick={() => setOptionsSong(null)}>
                <X className="w-5 h-5 text-text-primary" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[60vh] pb-2 space-y-1">
              {[
                { id: 'playNext', icon: ListPlus, label: 'Play next' },
                { id: 'addToQueue', icon: ListMusic, label: 'Add to queue' },
                { id: 'saveLibrary', icon: PlusCircle, label: 'Save to library' },
                { id: 'like', icon: Heart, label: 'Add to liked songs' },
                { id: 'share', icon: Share2, label: 'Share' },
                { id: 'download', icon: Download, label: 'Download' },
                { id: 'savePlaylist', icon: FolderPlus, label: 'Save to playlist' },
                { id: 'album', icon: Disc, label: 'Go to album' },
                { id: 'artist', icon: User, label: 'Go to artist' },
                { id: 'credits', icon: Info, label: 'View song credits' }
              ].map((opt, i) => (
                <button
                  key={i}
                  className="w-full flex items-center gap-4 p-3 hover:bg-bg-surface/80 rounded-xl transition-colors text-left"
                  onClick={async () => {
                    if (opt.id === 'credits') {
                      setIsFullScreen(true);
                      if (isDesktop) {
                        setActiveTab('credits');
                      } else {
                        setIsTabCollapsed(false);
                        setActiveTab('lyrics');
                        setLyricsSubTab('credits');
                      }
                      setOptionsSong(null);
                    } else if (opt.id === 'share') {
                      const shareUrl = `${window.location.origin}/app/library?filter=Tracks&trackId=${encodeURIComponent(optionsSong.id)}`;
                      if (navigator.share) {
                        navigator.share({
                          title: optionsSong.title,
                          text: `Listen to ${optionsSong.title} by ${optionsSong.artist}`,
                          url: shareUrl
                        }).catch(console.error);
                      } else {
                        navigator.clipboard.writeText(shareUrl);
                        handleOptionClick('Link copied to clipboard');
                      }
                    } else if (opt.id === 'download') {
                      window.open(optionsSong.driveUrl, '_blank');
                      handleOptionClick(`Downloading ${optionsSong.title}...`);
                    } else if (opt.id === 'savePlaylist') {
                      setIsPlaylistPickerOpen(true);
                    } else if (opt.id === 'like') {
                      toggleLike(optionsSong);
                      setOptionsSong(null);
                    } else if (opt.id === 'artist') {
                      const primaryArtist = optionsSong.artist.split(/\s*,\s*|\s*&\s*|\s+and\s+/i)[0].trim();
                      navigate(`/app/library?filter=Artists&artist=${encodeURIComponent(primaryArtist)}`);
                      setOptionsSong(null);
                    } else if (opt.id === 'album') {
                      navigate(`/app/library?filter=Albums&album=${encodeURIComponent(optionsSong.album)}`);
                      setOptionsSong(null);
                    } else {
                      handleOptionClick(`${opt.label} functionality coming soon`);
                    }
                  }}
                >
                  <opt.icon className={cn(
                    "w-6 h-6",
                    opt.id === 'like' && likedSongs.includes(optionsSong.id) ? "text-primary fill-current" : "text-text-secondary"
                  )} />
                  <span className="text-base text-text-primary">
                    {opt.id === 'like' && likedSongs.includes(optionsSong.id) ? 'Remove from liked' : opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Playlist Picker Modal */}
      <AnimatePresence>
        {isPlaylistPickerOpen && (
          <div className="fixed inset-0 md:left-64 z-[100] flex items-end md:items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => {
                setIsPlaylistPickerOpen(false);
                setShowNewPlaylistInput(false);
                setNewPlaylistName('');
              }}
            />
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              className="relative w-full max-w-md bg-bg-surface border border-border-main/10 rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden pb-8"
            >
              <div className="flex items-center justify-between p-6 border-b border-border-main/5">
                <h3 className="text-xl font-black text-text-primary">Save to Playlist</h3>
                <button
                  className="p-2 rounded-full hover:bg-bg-surface/50 transition-colors"
                  onClick={() => {
                    setIsPlaylistPickerOpen(false);
                    setShowNewPlaylistInput(false);
                    setNewPlaylistName('');
                  }}
                >
                  <X className="w-5 h-5 text-text-secondary" />
                </button>
              </div>

              <div className="p-4 space-y-2 overflow-y-auto max-h-[50vh] no-scrollbar">
                {playlists.filter(p => p.userId === user?.uid).length === 0 && !showNewPlaylistInput && (
                  <div className="py-10 text-center">
                    <FolderPlus className="w-12 h-12 text-text-secondary/30 mx-auto mb-3" />
                    <p className="text-text-secondary font-medium">No playlists created yet.</p>
                  </div>
                )}

                {playlists.filter(p => p.userId === user?.uid).map(playlist => (
                  <button
                    key={playlist.id}
                    className="w-full flex items-center gap-4 p-4 hover:bg-bg-surface/50 rounded-xl transition-all group"
                    onClick={async () => {
                      await addSongToPlaylist(playlist.id, optionsSong);
                      handleOptionClick(`Added to ${playlist.name}`);
                      setIsPlaylistPickerOpen(false);
                    }}
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-bg-base flex items-center justify-center border border-border-main/5 relative">
                      {playlist.songs && playlist.songs.length > 0 ? (
                        <SongImage src={playlist.songs[0].thumbnail || playlist.songs[0].cover} alt={playlist.name} className="w-full h-full object-cover" />
                      ) : (
                        <ListMusic className="w-6 h-6 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-bold text-text-primary group-hover:text-primary transition-colors">{playlist.name}</p>
                      <p className="text-xs text-text-secondary font-medium">{playlist.songs?.length || 0} songs</p>
                    </div>
                  </button>
                ))}

                {showNewPlaylistInput ? (
                  <div className="p-2 space-y-3">
                    <input
                      autoFocus
                      type="text"
                      id="save-playlist-input"
                      name="save-playlist-input"
                      placeholder="Enter playlist name..."
                      className="w-full bg-bg-base border border-border-main/10 rounded-xl py-4 px-5 text-text-primary placeholder-text-secondary/50 focus:ring-2 focus:ring-primary/50 text-lg font-bold"
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter' && newPlaylistName.trim()) {
                          const plId = await createPlaylist(newPlaylistName);
                          await addSongToPlaylist(plId.id || plId, optionsSong);
                          handleOptionClick(`Created and added to ${newPlaylistName}`);
                          setIsPlaylistPickerOpen(false);
                          setShowNewPlaylistInput(false);
                          setNewPlaylistName('');
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <button
                        className="flex-1 py-3 rounded-xl bg-primary text-black font-black uppercase tracking-widest text-xs disabled:opacity-50"
                        disabled={!newPlaylistName.trim()}
                        onClick={async () => {
                          const plId = await createPlaylist(newPlaylistName);
                          await addSongToPlaylist(plId.id || plId, optionsSong);
                          handleOptionClick(`Created and added to ${newPlaylistName}`);
                          setIsPlaylistPickerOpen(false);
                          setShowNewPlaylistInput(false);
                          setNewPlaylistName('');
                        }}
                      >
                        Create & Add
                      </button>
                      <button
                        className="px-6 py-3 rounded-xl bg-bg-base text-text-primary border border-border-main/10 font-bold text-xs"
                        onClick={() => setShowNewPlaylistInput(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="w-full flex items-center justify-center gap-3 p-5 mt-4 border-2 border-dashed border-border-main/20 rounded-2xl text-text-secondary hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all group"
                    onClick={() => setShowNewPlaylistInput(true)}
                  >
                    <PlusCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    <span className="font-black uppercase tracking-widest text-xs">Create New Playlist</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MusicPlayer;
