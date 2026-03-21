import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, Mic, Play, MoreVertical } from 'lucide-react';
import { usePlayer } from '../context/usePlayer';
import { cn } from '../lib/utils';
import SongImage from '../components/SongImage';

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const { songs, playSong, currentSong, isPlaying, setOptionsSong } = usePlayer();

  // Sync state when URL parameter changes (e.g., searching from Home again)
  useEffect(() => {
    const q = searchParams.get('q');
    if (q !== null && q !== query) {
      setQuery(q);
    }
  }, [searchParams]);

  // Sync URL when local input changes
  const handleQueryChange = (e) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    if (newQuery) {
      setSearchParams({ q: newQuery }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const filteredSongs = (songs || []).filter(song => 
    song.title.toLowerCase().includes(query.toLowerCase()) || 
    song.artist.toLowerCase().includes(query.toLowerCase())
  );

  const categories = [
    { title: "Music", color: "bg-pink-600" },
    { title: "Podcasts", color: "bg-green-700" },
    { title: "Live Events", color: "bg-purple-800" },
    { title: "Made For You", color: "bg-blue-600" },
    { title: "New Releases", color: "bg-red-600" },
    { title: "Hindi", color: "bg-orange-600" },
    { title: "Punjabi", color: "bg-yellow-600" }
  ];

  return (
    <div className="flex flex-col gap-6 pb-48">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Search</h1>
        <Mic className="w-6 h-6 text-text-secondary" />
      </div>

      <div className="relative group">
        <SearchIcon className={cn(
          "absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors",
          query ? "text-primary" : "text-text-secondary"
        )} />
        <input 
          type="text" 
          value={query}
          onChange={handleQueryChange}
          placeholder="What do you want to listen to?" 
          className="w-full bg-bg-surface border border-border-main/10 rounded-md py-3 pl-12 pr-4 text-sm text-text-primary placeholder:text-text-secondary focus:ring-1 focus:ring-primary/50 font-medium"
        />
      </div>

      {query ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <h2 className="text-base font-bold text-text-primary">Songs</h2>
          {filteredSongs.length > 0 ? (
            filteredSongs.map((song) => (
              <div 
                key={song.id} 
                className="flex items-center gap-4 group cursor-pointer"
                onClick={() => playSong(song)}
              >
                <div className="w-12 h-12 rounded overflow-hidden bg-bg-surface shadow-lg relative border border-border-main/5">
                  <SongImage src={song.cover} alt={song.title} className="w-full h-full object-cover" />
                  {currentSong?.id === song.id && isPlaying && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                       <Play className="w-5 h-5 text-primary fill-current" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 py-1">
                  <p className={cn("font-bold text-sm line-clamp-2 leading-tight", currentSong?.id === song.id ? "text-primary" : "text-text-primary")}>{song.title}</p>
                  <p className="text-xs text-text-secondary truncate mt-0.5">{song.artist}</p>
                </div>
                <MoreVertical 
                  className="w-5 h-5 text-text-secondary hover:text-text-primary cursor-pointer transition-colors" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setOptionsSong(song);
                  }}
                />
              </div>
            ))
          ) : (
            <p className="text-text-secondary text-sm italic">No songs found for "{query}"</p>
          )}
        </div>
      ) : (
        <>
          <h2 className="text-base font-bold text-text-primary mt-2">Browse all</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.map((cat, i) => (
              <div 
                key={i} 
                className={cn(
                  "h-28 rounded-xl p-4 relative overflow-hidden cursor-pointer hover:brightness-110 transition-all",
                  cat.color
                )}
              >
                <span className="text-sm font-black text-white leading-tight uppercase tracking-wider">{cat.title}</span>
                <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-border-main/20 rotate-[25deg] rounded-lg shadow-2xl backdrop-blur-sm" />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Search;
