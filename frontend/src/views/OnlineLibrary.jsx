import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ArrowLeft, X, Sparkles, Mic,
  ChevronLeft, ChevronRight, Play, Pause, Flame, Clock, Radio,
  RefreshCw, Heart, Music2, Disc3, Zap, Guitar, Headphones,
  Tv, Compass, LayoutGrid, List, Loader2
} from 'lucide-react';
import {
  fetchYouTubeCategory,
  fetchYouTubeTrendingMusic,
  fetchYouTubeLikedSongs,
  fetchYouTubeRecommendations,
  fetchYouTubeMoodTracks
} from '../services/youtube';
import SongImage from '../components/SongImage';
import PlayingVisualizer from '../components/PlayingVisualizer';
import { usePlayer } from '../context/usePlayer';
import { useVoiceSearch } from '../hooks/useVoiceSearch';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { SongCardSkeleton, OnlineLibrarySkeleton } from '../components/Skeleton';

const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const IndiaFlag = ({ className }) => (
  <span className={cn("inline-flex items-center justify-center w-4 h-3 rounded-[2px] overflow-hidden shadow-xs border border-black/10 shrink-0 leading-none", className)}>
    <span className="flex flex-col w-full h-full">
      <span className="h-1/3 bg-[#FF9933] w-full" />
      <span className="h-1/3 bg-white w-full flex items-center justify-center relative">
        <span className="w-0.5 h-0.5 rounded-full bg-[#000080]" />
      </span>
      <span className="h-1/3 bg-[#138808] w-full" />
    </span>
  </span>
);

const MOOD_FILTERS = [
  {
    id: 'all',
    label: 'All',
    icon: Compass,
    query: null,
    gradient: 'from-emerald-500/15 via-teal-500/5 to-transparent',
    accentColor: 'text-emerald-500 dark:text-emerald-400',
    description: 'Trending tracks, recommendations, and listening history'
  },
  {
    id: 'trending',
    label: 'Trending in India',
    icon: Flame,
    isIndia: true,
    query: 'Trending Music Songs India 2025 Official Hits',
    gradient: 'from-amber-500/15 via-orange-500/5 to-transparent',
    accentColor: 'text-amber-500 dark:text-amber-400',
    description: 'Top music charts, viral songs, and most streamed tracks in India'
  },
  {
    id: 'bollywood',
    label: 'Bollywood',
    icon: Tv,
    query: 'Bollywood top hit romantic dance songs official audio 2025',
    gradient: 'from-rose-500/15 via-pink-500/5 to-transparent',
    accentColor: 'text-rose-500 dark:text-rose-400',
    description: 'Blockbuster Bollywood songs, romantic melodies & party hits'
  },
  {
    id: 'lofi',
    label: 'Lo-Fi Chill',
    icon: Headphones,
    query: 'Lofi hip hop chill beats relax study aesthetic songs',
    gradient: 'from-violet-500/15 via-purple-500/5 to-transparent',
    accentColor: 'text-purple-500 dark:text-purple-400',
    description: 'Relaxing lo-fi beats and calm soundscapes for focus and study'
  },
  {
    id: 'pop',
    label: 'Global Pop',
    icon: Sparkles,
    query: 'Top Pop music chart songs hits official audio 2025',
    gradient: 'from-cyan-500/15 via-blue-500/5 to-transparent',
    accentColor: 'text-cyan-500 dark:text-cyan-400',
    description: 'International chart-topping pop singles and radio favorites'
  },
  {
    id: 'workout',
    label: 'Workout EDM',
    icon: Zap,
    query: 'Workout motivation music edm electronic dance bass gym songs',
    gradient: 'from-yellow-500/15 via-amber-500/5 to-transparent',
    accentColor: 'text-yellow-500 dark:text-yellow-400',
    description: 'High-energy electronic dance beats and heavy bass workouts'
  },
  {
    id: 'hiphop',
    label: 'Hip-Hop & Rap',
    icon: Disc3,
    query: 'Hip Hop rap bangers trap songs official audio 2025',
    gradient: 'from-red-500/15 via-orange-500/5 to-transparent',
    accentColor: 'text-red-500 dark:text-red-400',
    description: 'Hip-hop anthems, rap flows, and trap tracks'
  },
  {
    id: 'acoustic',
    label: 'Acoustic',
    icon: Guitar,
    query: 'Acoustic indie chill guitar songs unplugged melodies',
    gradient: 'from-teal-500/15 via-emerald-500/5 to-transparent',
    accentColor: 'text-teal-500 dark:text-teal-400',
    description: 'Acoustic guitar melodies, indie chill, and singer-songwriter songs'
  },
];

const SongCard = ({ song, idx, viewMode = 'grid', currentSong, isPlaying, onPlaySong, showRank = false }) => {
  const isCurrent = currentSong?.id === song.id;

  if (viewMode === 'list') {
    return (
      <div
        onClick={() => onPlaySong(song)}
        className={cn(
          "group flex items-center justify-between px-3 py-2 rounded-xl transition-colors duration-150 cursor-pointer select-none gap-3",
          isCurrent
            ? "bg-primary/10 text-primary"
            : "hover:bg-black/5 dark:hover:bg-white/[0.06] text-text-primary"
        )}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-7 shrink-0 text-center text-xs font-semibold text-text-secondary flex items-center justify-center">
            {isCurrent && isPlaying ? (
              <PlayingVisualizer className="h-3.5 gap-[1px]" isDark={true} />
            ) : (
              <>
                <span className="group-hover:hidden font-mono">
                  {showRank ? `#${idx + 1}` : idx + 1}
                </span>
                <Play className="w-3.5 h-3.5 hidden group-hover:block fill-current text-text-primary ml-0.5" />
              </>
            )}
          </div>

          <div className="relative w-10 h-10 shrink-0 rounded-lg overflow-hidden bg-border-main/10 shadow-xs">
            <SongImage
              src={song.cover || song.thumbnail}
              title={song.title}
              artist={song.artist}
              alt={song.title}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className={cn(
              "text-sm font-semibold truncate transition-colors",
              isCurrent ? "text-primary font-bold" : "text-text-primary group-hover:text-primary"
            )}>
              {song.title}
            </h3>
            <p className="text-xs text-text-secondary truncate mt-0.5 font-medium">
              {song.artist || "YouTube Music"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {song.duration > 0 && (
            <span className="text-xs font-mono text-text-secondary">
              {formatDuration(song.duration)}
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlaySong(song);
            }}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-text-primary transition-opacity"
            aria-label="Play track"
          >
            {isCurrent && isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 ml-0.5 fill-current" />
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => onPlaySong(song)}
      className={cn(
        "group/card relative flex flex-col gap-2.5 p-3 rounded-2xl border transition-all duration-200 cursor-pointer select-none",
        isCurrent
          ? "bg-primary/10 border-primary/40 shadow-[0_0_20px_rgba(var(--primary-rgb),0.15)] ring-1 ring-primary/30"
          : "bg-bg-surface/50 hover:bg-bg-surface border-border-main/10 hover:border-border-main/25 hover:shadow-xl"
      )}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-border-main/10 shadow-sm">
        <SongImage
          src={song.cover || song.thumbnail}
          title={song.title}
          artist={song.artist}
          alt={song.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover/card:scale-105"
        />

        {showRank && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[11px] font-bold text-white shadow-md">
            #{idx + 1}
          </div>
        )}

        <div className="absolute bottom-2 right-2 opacity-0 group-hover/card:opacity-100 transform translate-y-2 group-hover/card:translate-y-0 transition-all duration-200 shadow-xl">
          <div className="w-10 h-10 bg-primary text-black rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95">
            {isCurrent && isPlaying ? (
              <Pause className="w-4 h-4 fill-black text-black" />
            ) : (
              <Play className="w-4 h-4 ml-0.5 fill-black text-black" />
            )}
          </div>
        </div>

        {isCurrent && (
          <div className="absolute bottom-2 left-2 bg-primary px-1.5 py-0.5 rounded-md shadow-md flex items-center gap-1">
            <PlayingVisualizer className="h-2.5 gap-[1px]" isDark={true} />
          </div>
        )}
      </div>

      <div className="min-w-0 px-0.5">
        <h3 className={cn(
          "text-xs sm:text-sm font-semibold truncate transition-colors",
          isCurrent ? "text-primary font-bold" : "text-text-primary group-hover/card:text-primary"
        )}>
          {song.title}
        </h3>
        <p className="text-[11px] text-text-secondary truncate mt-0.5 font-medium">
          {song.artist || "YouTube Music"}
        </p>
      </div>
    </div>
  );
};

const SongCarousel = ({
  title,
  subtitle,
  icon: Icon,
  badgeText,
  badgeIcon: BadgeIcon,
  badgeColor = "primary",
  items = [],
  isLoading = false,
  viewMode = 'grid',
  currentSong,
  isPlaying,
  onPlaySong,
  showRank = false
}) => {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
    }
    return () => {
      if (el) el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [items, checkScroll]);

  const handleScroll = (direction) => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  if (!isLoading && items.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 py-1 group/section">
      <div className="flex items-end justify-between px-1">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="p-1.5 rounded-xl bg-bg-surface/80 border border-border-main/10 text-primary shadow-xs flex items-center justify-center">
              <Icon className="w-4 h-4" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg md:text-xl font-bold text-text-primary tracking-tight">{title}</h2>
              {badgeText && (
                <span className={cn(
                  "inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border",
                  badgeColor === 'primary' ? "bg-primary/10 text-primary border-primary/20" : "bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/20"
                )}>
                  {BadgeIcon && <BadgeIcon />}
                  <span>{badgeText}</span>
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs text-text-secondary font-medium mt-0.5">{subtitle}</p>}
          </div>
        </div>

        {viewMode === 'grid' && (
          <div className="hidden sm:flex items-center gap-1 opacity-80 group-hover/section:opacity-100 transition-opacity">
            <button
              onClick={() => handleScroll('left')}
              disabled={!canScrollLeft}
              className="p-1.5 rounded-lg bg-bg-surface hover:bg-bg-surface/80 border border-border-main/15 text-text-primary disabled:opacity-20 disabled:cursor-not-allowed transition-all active:scale-95 shadow-xs"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleScroll('right')}
              disabled={!canScrollRight}
              className="p-1.5 rounded-lg bg-bg-surface hover:bg-bg-surface/80 border border-border-main/15 text-text-primary disabled:opacity-20 disabled:cursor-not-allowed transition-all active:scale-95 shadow-xs"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {viewMode === 'list' ? (
        <div className="flex flex-col divide-y divide-border-main/5 rounded-2xl bg-bg-surface/40 border border-border-main/10 p-1">
          {isLoading
            ? Array.from({ length: 4 }).map((_, idx) => (
                <div key={`skel-list-${idx}`} className="flex items-center gap-3 p-2.5 skeleton-shimmer rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-border-main/20 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-1/3 bg-border-main/25 rounded" />
                    <div className="h-2.5 w-1/4 bg-border-main/15 rounded" />
                  </div>
                </div>
              ))
            : items.map((song, idx) => (
                <SongCard
                  key={song.id || idx}
                  song={song}
                  idx={idx}
                  viewMode="list"
                  currentSong={currentSong}
                  isPlaying={isPlaying}
                  onPlaySong={onPlaySong}
                  showRank={showRank}
                />
              ))}
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="flex gap-3.5 overflow-x-auto no-scrollbar scroll-smooth py-1 px-1 -mx-1"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {isLoading
            ? Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={`skeleton-${idx}`}
                  className="w-36 sm:w-44 md:w-48 shrink-0 flex flex-col gap-2 p-3 rounded-2xl bg-bg-surface/40 border border-border-main/5 skeleton-shimmer"
                >
                  <div className="aspect-square w-full rounded-xl bg-border-main/20" />
                  <div className="h-3.5 w-3/4 bg-border-main/25 rounded mt-1" />
                  <div className="h-2.5 w-1/2 bg-border-main/15 rounded" />
                </div>
              ))
            : items.map((song, idx) => (
                <div
                  key={song.id || idx}
                  style={{ scrollSnapAlign: 'start' }}
                  className="w-36 sm:w-44 md:w-48 shrink-0"
                >
                  <SongCard
                    song={song}
                    idx={idx}
                    viewMode="grid"
                    currentSong={currentSong}
                    isPlaying={isPlaying}
                    onPlaySong={onPlaySong}
                    showRank={showRank}
                  />
                </div>
              ))}
        </div>
      )}
    </div>
  );
};

const OnlineLibrary = () => {
  const { youtubeAccessToken } = useAuth();
  const { playSong, playQueue, currentSong, isPlaying, recentlyPlayed = [] } = usePlayer();
  const { showToast } = useToast();

  const [viewMode, setViewMode] = useState(() => {
    const saved = localStorage.getItem('suman_music_online_view_mode');
    if (saved) return saved;
    return typeof window !== 'undefined' && window.innerWidth < 768 ? 'list' : 'grid';
  });

  const handleToggleViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem('suman_music_online_view_mode', mode);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const [selectedFilter, setSelectedFilter] = useState('all');
  const [isLoadingFeeds, setIsLoadingFeeds] = useState(true);
  const [isLoadingCategory, setIsLoadingCategory] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [trendingSongs, setTrendingSongs] = useState([]);
  const [recommendedSongs, setRecommendedSongs] = useState([]);
  const [userLikedFeed, setUserLikedFeed] = useState([]);
  const [categoryTracks, setCategoryTracks] = useState([]);

  const genreCache = useRef({});

  const seedArtists = useMemo(() => {
    const artists = new Set();
    if (recentlyPlayed && recentlyPlayed.length > 0) {
      recentlyPlayed.forEach(s => {
        if (s && s.artist && s.artist !== 'Unknown Artist' && s.artist !== 'YouTube') {
          artists.add(s.artist);
        }
      });
    }
    return Array.from(artists).slice(0, 5);
  }, [recentlyPlayed]);

  const seedArtistsRef = useRef(seedArtists);
  useEffect(() => {
    seedArtistsRef.current = seedArtists;
  }, [seedArtists]);

  const loadFeeds = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) {
      setIsRefreshing(true);
      genreCache.current = {};
    } else {
      setIsLoadingFeeds(true);
    }

    try {
      const ytToken = localStorage.getItem('suman_music_youtube_token') || youtubeAccessToken;
      const userFeedPromise = ytToken ? fetchYouTubeLikedSongs(50) : Promise.resolve([]);
      const trendingPromise = fetchYouTubeTrendingMusic(20);
      const recommendedPromise = fetchYouTubeRecommendations(seedArtistsRef.current, 20);

      const [userFeed, trending, recommended] = await Promise.allSettled([
        userFeedPromise,
        trendingPromise,
        recommendedPromise
      ]);

      if (userFeed.status === 'fulfilled' && userFeed.value.length > 0) {
        setUserLikedFeed(userFeed.value);
      }
      if (trending.status === 'fulfilled' && trending.value.length > 0) {
        setTrendingSongs(trending.value);
      }
      if (recommended.status === 'fulfilled' && recommended.value.length > 0) {
        setRecommendedSongs(recommended.value);
      }
    } catch (_) {
    } finally {
      setIsLoadingFeeds(false);
      setIsRefreshing(false);
    }
  }, [youtubeAccessToken]);

  useEffect(() => {
    if (selectedFilter === 'all') {
      setCategoryTracks([]);
      return;
    }

    if (selectedFilter === 'trending') {
      if (trendingSongs.length > 0) {
        setCategoryTracks(trendingSongs);
        return;
      }
    }

    if (genreCache.current[selectedFilter] && genreCache.current[selectedFilter].length > 0) {
      setCategoryTracks(genreCache.current[selectedFilter]);
      return;
    }

    const currentFilterObj = MOOD_FILTERS.find(f => f.id === selectedFilter);
    if (!currentFilterObj || !currentFilterObj.query) return;

    let isMounted = true;
    const fetchCategory = async () => {
      setIsLoadingCategory(true);
      try {
        const tracks = await fetchYouTubeMoodTracks(currentFilterObj.query, 30);
        if (isMounted) {
          setCategoryTracks(tracks);
          genreCache.current[selectedFilter] = tracks;
        }
      } catch (err) {
        console.warn(`Error fetching ${selectedFilter} tracks:`, err);
      } finally {
        if (isMounted) setIsLoadingCategory(false);
      }
    };

    fetchCategory();
    return () => { isMounted = false; };
  }, [selectedFilter, trendingSongs]);

  useEffect(() => {
    loadFeeds();
  }, [loadFeeds]);

  const { isListening, startListening, stopListening, isSupported } = useVoiceSearch({
    onResult: (transcript) => {
      setSearchQuery(transcript);
      handleSearch(transcript);
      showToast(`Searching: ${transcript}`, "success");
    },
    onError: (error) => {
      if (error === 'not-allowed') {
        showToast("Microphone permission denied", "error");
      } else if (error === 'not-supported') {
        showToast("Voice search not supported in this browser", "error");
      } else {
        showToast(`Voice search error: ${error}`, "error");
      }
    }
  });

  const handleSearch = async (queryText) => {
    const q = (queryText !== undefined ? queryText : searchQuery).trim();
    if (!q) return;

    setIsSearching(true);
    setSearchError(null);

    try {
      const results = await fetchYouTubeCategory(q, 30);
      if (results && results.length > 0) {
        setSearchResults(results);
      } else {
        setSearchError(`No songs found for "${q}"`);
        setSearchResults([]);
      }
    } catch {
      setSearchError("Failed to fetch search results. Please try again.");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchError(null);
  };

  const currentCategoryObj = useMemo(() => {
    return MOOD_FILTERS.find(f => f.id === selectedFilter) || MOOD_FILTERS[0];
  }, [selectedFilter]);

  const [headerPortalTarget, setHeaderPortalTarget] = useState(null);
  useEffect(() => {
    const findTarget = () => {
      const target = document.getElementById('header-search-portal') || document.getElementById('desktop-header-search');
      if (target) {
        setHeaderPortalTarget(target);
        return true;
      }
      return false;
    };
    if (!findTarget()) {
      const timer = setTimeout(findTarget, 50);
      return () => clearTimeout(timer);
    }
  }, []);

  const searchBarNode = (
    <div className="relative w-full max-w-md">
      <div className="relative flex items-center">
        <button
          type="button"
          onClick={() => handleSearch()}
          className="absolute left-3 w-4 h-4 flex items-center justify-center text-text-secondary hover:text-primary transition-colors cursor-pointer z-10"
          aria-label="Submit search"
        >
          <Search className="w-4 h-4 pointer-events-none" />
        </button>
        <input
          type="text"
          id="online-library-search"
          name="online-library-search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search YouTube Music..."
          maxLength={100}
          className="w-full pl-9 pr-20 py-2 bg-bg-surface/80 border border-border-main/15 rounded-full text-xs font-medium text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all shadow-xs"
        />
        <div className="absolute right-2 flex items-center gap-1">
          {isSearching && (
            <Loader2 className="w-3.5 h-3.5 text-primary animate-spin mr-1" />
          )}
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="p-1 rounded-full text-text-secondary hover:text-text-primary transition-colors"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {isSupported && (
            <button
              onClick={isListening ? stopListening : startListening}
              className={cn(
                "p-1.5 rounded-full transition-all active:scale-95",
                isListening
                  ? "bg-red-500 text-white animate-pulse"
                  : "text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5"
              )}
              title={isListening ? "Listening..." : "Voice Search"}
              aria-label="Voice Search"
            >
              <Mic className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-5 pb-32 animate-in fade-in duration-300 max-w-7xl mx-auto w-full px-2 sm:px-4">

      {headerPortalTarget && createPortal(searchBarNode, headerPortalTarget)}

      <div className={cn("pt-2", headerPortalTarget ? "md:hidden" : "block")}>
        {searchBarNode}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 py-1 w-full">
          <div className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-2 min-w-0 pr-1">
            {MOOD_FILTERS.map(filter => {
              const isActive = selectedFilter === filter.id && !searchQuery;
              return (
                <button
                  key={filter.id}
                  onClick={() => {
                    setSelectedFilter(filter.id);
                    if (searchResults.length > 0) clearSearch();
                  }}
                  className={cn(
                    "relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all select-none shrink-0 active:scale-95 border",
                    isActive
                      ? "bg-primary text-black border-primary font-bold shadow-sm"
                      : "bg-bg-surface/80 hover:bg-bg-surface text-text-secondary hover:text-text-primary border-border-main/15"
                  )}
                >
                  {filter.isIndia && <IndiaFlag />}
                  <span>{filter.label}</span>
                </button>
              );
            })}
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0 border-l border-border-main/15 pl-2">
            <div className="flex items-center bg-bg-surface/80 border border-border-main/15 rounded-xl p-0.5 shadow-xs">
              <button
                onClick={() => handleToggleViewMode('grid')}
                className={cn(
                  "p-1.5 rounded-lg transition-all flex items-center justify-center",
                  viewMode === 'grid'
                    ? "bg-primary text-black shadow-xs"
                    : "text-text-secondary hover:text-text-primary"
                )}
                title="Grid View"
                aria-label="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleToggleViewMode('list')}
                className={cn(
                  "p-1.5 rounded-lg transition-all flex items-center justify-center",
                  viewMode === 'list'
                    ? "bg-primary text-black shadow-xs"
                    : "text-text-secondary hover:text-text-primary"
                )}
                title="List View"
                aria-label="List View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={() => loadFeeds(true)}
              disabled={isRefreshing}
              className="p-1.5 rounded-xl bg-bg-surface/80 hover:bg-bg-surface border border-border-main/15 text-text-secondary hover:text-primary transition-all shrink-0 shadow-xs"
              title="Refresh Catalog"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin text-primary")} />
            </button>
          </div>
        </div>
      </div>

      {isSearching ? (
        <div className="space-y-4">
          <div className="h-6 w-48 rounded bg-bg-surface/60 skeleton-shimmer" />
          <div className={cn(
            viewMode === 'list'
              ? "space-y-2.5"
              : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3"
          )}>
            {Array.from({ length: 12 }).map((_, idx) => (
              <SongCardSkeleton key={`search-skel-${idx}`} viewMode={viewMode} />
            ))}
          </div>
        </div>
      ) : searchResults.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-text-primary tracking-tight">Search Results</h2>
              <p className="text-xs text-text-secondary">Matches for "{searchQuery}"</p>
            </div>
            <button 
              onClick={clearSearch} 
              className="flex items-center gap-1.5 py-1.5 px-3 bg-bg-surface hover:bg-bg-surface/80 border border-border-main/15 rounded-xl text-xs font-semibold text-text-primary hover:text-primary transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          </div>

          {viewMode === 'list' ? (
            <div className="flex flex-col divide-y divide-border-main/5 rounded-2xl bg-bg-surface/40 border border-border-main/10 p-1 pb-10">
              {searchResults.map((song, idx) => (
                <SongCard
                  key={song.id || idx}
                  song={song}
                  idx={idx}
                  viewMode="list"
                  currentSong={currentSong}
                  isPlaying={isPlaying}
                  onPlaySong={playSong}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 pb-10">
              {searchResults.map((song, idx) => (
                <SongCard
                  key={song.id || idx}
                  song={song}
                  idx={idx}
                  viewMode="grid"
                  currentSong={currentSong}
                  isPlaying={isPlaying}
                  onPlaySong={playSong}
                />
              ))}
            </div>
          )}
        </div>
      ) : searchError ? (
        <div className="flex flex-col items-center justify-center p-8 bg-bg-surface/80 rounded-2xl border border-red-500/20 text-center gap-3 max-w-md mx-auto shadow-xs">
          <p className="text-xs text-red-500 font-semibold">{searchError}</p>
          <button onClick={() => handleSearch(searchQuery)} className="px-4 py-1.5 bg-primary text-black font-bold rounded-xl text-xs">Try Again</button>
        </div>
      ) : selectedFilter !== 'all' ? (
        <div className="flex flex-col gap-5">
          <div className={cn(
            "relative overflow-hidden rounded-3xl p-6 border border-border-main/15 bg-bg-surface shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4",
            `bg-gradient-to-r ${currentCategoryObj.gradient}`
          )}>
            <div className="space-y-1 relative z-10">
              <div className="flex items-center gap-2">
                {currentCategoryObj.isIndia && <IndiaFlag />}
                <span className={cn("text-[11px] font-bold uppercase tracking-wider", currentCategoryObj.accentColor)}>
                  Genre
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
                {currentCategoryObj.label}
              </h1>
              <p className="text-xs text-text-secondary max-w-xl font-medium">
                {currentCategoryObj.description}
              </p>
            </div>

            <div className="flex items-center gap-2.5 relative z-10 shrink-0">
              {categoryTracks.length > 0 && (
                <button
                  onClick={() => playQueue(categoryTracks, categoryTracks[0])}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-black font-bold rounded-full transition-all shadow-sm hover:scale-105 active:scale-95 text-xs"
                >
                  <Play className="w-3.5 h-3.5 fill-black" />
                  <span>Play Mix</span>
                </button>
              )}
              <button
                onClick={() => setSelectedFilter('all')}
                className="px-4 py-2 bg-bg-surface hover:bg-bg-surface/80 text-text-primary font-semibold rounded-full transition-all active:scale-95 text-xs border border-border-main/20"
              >
                All Feeds
              </button>
            </div>
          </div>

          {isLoadingCategory ? (
            <div className={cn(
              viewMode === 'list'
                ? "space-y-2.5 pb-12"
                : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 pb-12"
            )}>
              {Array.from({ length: 12 }).map((_, idx) => (
                <SongCardSkeleton key={`cat-skel-${idx}`} viewMode={viewMode} />
              ))}
            </div>
          ) : categoryTracks.length > 0 ? (
            viewMode === 'list' ? (
              <div className="flex flex-col divide-y divide-border-main/5 rounded-2xl bg-bg-surface/40 border border-border-main/10 p-1 pb-12">
                {categoryTracks.map((song, idx) => (
                  <SongCard
                    key={song.id || idx}
                    song={song}
                    idx={idx}
                    viewMode="list"
                    currentSong={currentSong}
                    isPlaying={isPlaying}
                    onPlaySong={playSong}
                    showRank={selectedFilter === 'trending'}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 pb-12">
                {categoryTracks.map((song, idx) => (
                  <SongCard
                    key={song.id || idx}
                    song={song}
                    idx={idx}
                    viewMode="grid"
                    currentSong={currentSong}
                    isPlaying={isPlaying}
                    onPlaySong={playSong}
                    showRank={selectedFilter === 'trending'}
                  />
                ))}
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <p className="text-xs text-text-secondary">No tracks available.</p>
              <button onClick={() => loadFeeds(true)} className="px-4 py-1.5 bg-primary text-black font-bold rounded-xl text-xs">Retry</button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-7">

          {userLikedFeed.length > 0 && (
            <SongCarousel
              title="Liked Music"
              subtitle="Tracks from your YouTube Music account"
              icon={Heart}
              badgeText="Your Library"
              badgeColor="red"
              items={userLikedFeed}
              isLoading={isLoadingFeeds}
              viewMode={viewMode}
              currentSong={currentSong}
              isPlaying={isPlaying}
              onPlaySong={playSong}
            />
          )}

          {recentlyPlayed.length > 0 && (
            <SongCarousel
              title="Recently Played"
              subtitle="Jump back into your recent listening"
              icon={Clock}
              badgeText="History"
              badgeColor="primary"
              items={recentlyPlayed}
              isLoading={false}
              viewMode={viewMode}
              currentSong={currentSong}
              isPlaying={isPlaying}
              onPlaySong={playSong}
            />
          )}

          <SongCarousel
            title="Trending in India"
            subtitle="Top music charts and viral tracks"
            icon={Flame}
            badgeText="Top 20"
            badgeIcon={IndiaFlag}
            badgeColor="red"
            items={trendingSongs}
            isLoading={isLoadingFeeds}
            viewMode={viewMode}
            currentSong={currentSong}
            isPlaying={isPlaying}
            onPlaySong={playSong}
            showRank={true}
          />

          <SongCarousel
            title="Made For You"
            subtitle={seedArtists.length > 0 ? `Curated from ${seedArtists.slice(0, 2).join(', ')}` : "Recommended tracks based on your taste"}
            icon={Sparkles}
            badgeText="Personalized"
            badgeColor="primary"
            items={recommendedSongs}
            isLoading={isLoadingFeeds}
            viewMode={viewMode}
            currentSong={currentSong}
            isPlaying={isPlaying}
            onPlaySong={playSong}
          />

          <div className="flex flex-col gap-3 py-1">
            <div className="flex items-center gap-2 px-1">
              <Music2 className="w-4 h-4 text-primary" />
              <div>
                <h2 className="text-lg md:text-xl font-bold text-text-primary tracking-tight">Explore Genres</h2>
                <p className="text-xs text-text-secondary font-medium">Browse popular music categories</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-1">
              {MOOD_FILTERS.filter(f => f.id !== 'all').map(filter => {
                const FilterIcon = filter.icon;
                return (
                  <div
                    key={`genre-card-${filter.id}`}
                    onClick={() => setSelectedFilter(filter.id)}
                    className={cn(
                      "group p-4 rounded-2xl border border-border-main/15 bg-bg-surface bg-gradient-to-br transition-all cursor-pointer hover:border-border-main/30 hover:shadow-md active:scale-95 flex flex-col justify-between min-h-[96px]",
                      filter.gradient
                    )}
                  >
                    <div className="flex items-center justify-between">
                      {filter.isIndia ? <IndiaFlag /> : <FilterIcon className={cn("w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity", filter.accentColor)} />}
                    </div>
                    <div className="mt-2">
                      <h3 className="font-bold text-sm text-text-primary group-hover:text-primary transition-colors">
                        {filter.label}
                      </h3>
                      <p className="text-[11px] text-text-secondary font-medium truncate mt-0.5">
                        {filter.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

export default OnlineLibrary;
