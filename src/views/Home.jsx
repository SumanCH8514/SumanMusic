import { Search, MoreVertical, Play, Clock, Settings, LayoutGrid, List, Heart } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '../context/usePlayer';
import { cn } from '../lib/utils';
import PlayingVisualizer from '../components/PlayingVisualizer';
import SongImage from '../components/SongImage';
import { motion } from 'framer-motion';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

const Home = () => {
  const navigate = useNavigate();
  const { songs, playSong, currentSong, isPlaying, isLoading, setOptionsSong } = usePlayer();
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  const [searchQuery, setSearchQuery] = useState('');

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-text-secondary font-medium text-sm">Synchronizing with Drive...</p>
      </div>
    );
  }

  // Split collaborations to get individual artists for variety
  const allArtists = songs.reduce((acc, song) => {
    const rawArtist = song.artist || 'Unknown Artist';
    const splitArr = rawArtist.split(/\s*,\s*|\s*&\s*|\s+and\s+/i)
      .map(name => name.trim())
      .filter(name => name.length > 0);
    splitArr.forEach(a => acc.add(a));
    return acc;
  }, new Set());

  const albumArtists = Array.from(allArtists).slice(0, 8);

  return (
    <div className="flex flex-col gap-8 pb-48">
      {/* Search Header Mobile */}
      <div className="md:hidden flex items-center justify-between">
        <motion.h1
          key={getGreeting()}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-3xl font-black text-text-primary tracking-tight bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text text-transparent"
        >
          {getGreeting()}
        </motion.h1>
        <div className="flex gap-4">
          <Clock
            className="w-6 h-6 text-text-secondary cursor-pointer hover:text-primary transition-colors"
            onClick={() => navigate('/app/library?filter=Recent')}
          />
          <Heart
            className="w-6 h-6 text-text-secondary cursor-pointer hover:text-primary transition-colors"
            onClick={() => navigate('/app/library?filter=Liked')}
          />
        </div>
      </div>

      <div className="md:hidden relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary">
          <Search className="w-full h-full" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && searchQuery.trim()) {
              navigate(`/app/search?q=${encodeURIComponent(searchQuery.trim())}`);
            }
          }}
          placeholder="Artists, songs, or podcasts"
          className="w-full bg-bg-surface border border-border-main/10 rounded-md py-3 pl-12 pr-4 text-sm text-text-primary placeholder:text-text-secondary focus:ring-1 focus:ring-primary/50"
        />
      </div>

      {/* Featured Albums Horizontal Scroll */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-text-primary">Your Drive Library</h2>
          <span
            onClick={() => navigate('/app/library')}
            className="text-xs font-bold text-text-secondary uppercase tracking-wider cursor-pointer hover:text-text-primary"
          >
            Show all
          </span>
        </div>
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
          {albumArtists.map((artist, i) => {
            const firstSong = songs.find(s => s.artist?.includes(artist));
            if (!firstSong) return null;

            return (
              <div
                key={i}
                className="flex-shrink-0 w-36 group cursor-pointer"
                onClick={() => playSong(firstSong)}
              >
                <div className="aspect-square rounded-md overflow-hidden bg-bg-surface mb-2 relative shadow-lg border border-border-main/5">
                  <SongImage src={firstSong.cover} alt={artist} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-xl translate-y-2 group-hover:translate-y-0 transition-transform">
                      <Play className="w-5 h-5 fill-current text-black" />
                    </div>
                  </div>
                </div>
                <p className="text-xs font-bold text-text-primary truncate">{artist}</p>
                <p className="text-[10px] text-text-secondary truncate">From your Drive</p>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-text-primary">Recently from Drive</h2>
          <div
            className="p-1.5 rounded-lg hover:bg-bg-surface transition-colors cursor-pointer text-text-secondary hover:text-text-primary border border-border-main/5"
            onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
          >
            {viewMode === 'list' ? <LayoutGrid className="w-5 h-5" /> : <List className="w-5 h-5" />}
          </div>
        </div>

        <div className={cn(
          viewMode === 'list'
            ? "grid grid-cols-2 md:grid-cols-3 gap-3"
            : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
        )}>
          {songs.slice(0, 21).map((song) => (
            viewMode === 'list' ? (
              <div
                key={song.id}
                className={cn(
                  "flex items-center gap-3 bg-bg-surface/40 hover:bg-bg-surface/80 rounded transition-all group cursor-pointer border border-border-main/5",
                  currentSong?.id === song.id && "bg-bg-surface/80 border-primary/20"
                )}
                onClick={() => playSong(song)}
              >
                <div className="w-12 h-12 flex-shrink-0 relative">
                  <SongImage src={song.cover} alt={song.title} className="w-full h-full object-cover rounded-l overflow-hidden" />
                  {currentSong?.id === song.id && isPlaying && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                      <PlayingVisualizer className="h-4" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 pr-2 py-2">
                  <p className={cn("text-xs font-bold line-clamp-2 leading-tight", currentSong?.id === song.id ? "text-primary" : "text-text-primary")}>{song.title}</p>
                  <p className="text-[10px] text-text-secondary truncate mt-0.5">{song.artist}</p>
                </div>
                <MoreVertical 
                  className="w-4 h-4 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:text-text-primary shrink-0" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setOptionsSong(song);
                  }}
                />
              </div>
            ) : (
              <div
                key={song.id}
                className="flex flex-col gap-3 p-3 rounded-2xl bg-bg-surface/40 hover:bg-bg-surface/60 border border-border-main/5 group cursor-pointer transition-all duration-300"
                onClick={() => playSong(song)}
              >
                <div className="w-full aspect-square rounded-xl overflow-hidden bg-bg-surface shadow-lg relative shrink-0 border border-border-main/5">
                  <SongImage src={song.cover} alt={song.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  {currentSong?.id === song.id && isPlaying && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                      <PlayingVisualizer className="h-8" />
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between gap-1">
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm font-bold line-clamp-2 leading-snug", currentSong?.id === song.id ? "text-primary" : "text-text-primary")}>{song.title}</p>
                    <p className="text-[10px] text-text-secondary truncate uppercase mt-0.5 tracking-wider font-semibold">{song.artist}</p>
                  </div>
                  <MoreVertical 
                    className="w-4 h-4 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:text-text-primary shrink-0" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setOptionsSong(song);
                    }}
                  />
                </div>
              </div>
            )
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
