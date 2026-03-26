import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search as SearchIcon, Mic, Play, MoreVertical,
  Music, Zap, Heart, Sparkles, Globe,
  Headphones, Drum, Radio, Tv, Gamepad2,
  PartyPopper, Dumbbell, Moon, Target, Mic2
} from 'lucide-react';
import { usePlayer } from '../context/usePlayer';
import { cn } from '../lib/utils';
import SongImage from '../components/SongImage';

import { useSettings } from '../context/SettingsContext';

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [isListening, setIsListening] = useState(false);
  const { songs, playSong, currentSong, isPlaying, setOptionsSong } = usePlayer();
  const [showAllGenres, setShowAllGenres] = useState(false);
  const { isVoiceSearchEnabled } = useSettings();

  // Sync URL when local input changes
  const handleQueryChange = (e) => {
    const newQuery = e.target.value;
    if (newQuery) {
      setSearchParams({ q: newQuery }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const startVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice search is not supported in your browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      handleQueryChange({ target: { value: transcript } });
    };

    recognition.start();
  };

  const filteredSongs = (songs || []).filter(song =>
    song.title.toLowerCase().includes(query.toLowerCase()) ||
    song.artist.toLowerCase().includes(query.toLowerCase())
  );

  const categories = [
    { title: "Music", color: "from-pink-500 to-rose-600", icon: Music },
    { title: "Podcasts", color: "from-emerald-500 to-teal-700", icon: Mic },
    { title: "Live Events", color: "from-violet-600 to-indigo-800", icon: Zap },
    { title: "Made For You", color: "from-blue-500 to-cyan-700", icon: Heart },
    { title: "New Releases", color: "from-red-500 to-orange-700", icon: Sparkles },
    { title: "Hindi", color: "from-orange-500 to-amber-700", icon: Globe },
    { title: "Punjabi", color: "from-yellow-500 to-orange-600", icon: Music },
    { title: "Pop", color: "from-purple-500 to-pink-600", icon: Headphones },
    { title: "Rock", color: "from-red-600 to-stone-800", icon: Drum },
    { title: "Hip-Hop", color: "from-amber-500 to-orange-700", icon: Mic2 },
    { title: "Electronic", color: "from-cyan-400 to-blue-600", icon: Zap },
    { title: "Chill", color: "from-teal-400 to-emerald-600", icon: Moon },
    { title: "Workout", color: "from-orange-600 to-red-600", icon: Dumbbell },
    { title: "Focus", color: "from-indigo-500 to-blue-700", icon: Target },
    { title: "Party", color: "from-pink-600 to-purple-700", icon: PartyPopper },
    { title: "Gaming", color: "from-blue-600 to-indigo-900", icon: Gamepad2 }
  ];

  const displayedCategories = showAllGenres ? categories : categories.slice(0, 8);

  return (
    <div className="flex flex-col gap-6 pb-48">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Search</h1>
        {isVoiceSearchEnabled && (
          <button
            onClick={startVoiceSearch}
            className={cn(
              "p-2 rounded-full transition-all active:scale-90",
              isListening ? "bg-primary text-black animate-pulse" : "text-text-secondary hover:text-text-primary hover:bg-bg-surface"
            )}
          >
            <Mic className="w-6 h-6" />
          </button>
        )}
      </div>

      <div className="relative group">
        <SearchIcon className={cn(
          "absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors",
          query ? "text-primary" : "text-text-secondary"
        )} />
        <input
          type="text"
          id="search-page-input"
          name="search-page-input"
          value={query}
          onChange={handleQueryChange}
          placeholder="What do you want to listen to?"
          maxLength={100}
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
                  <SongImage src={song.thumbnail || song.cover} alt={song.title} className="w-full h-full object-cover" />
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
          <div className="flex items-center justify-between mt-2">
            <h2 className="text-base font-bold text-text-primary">All Genres</h2>
            <button
              onClick={() => setShowAllGenres(!showAllGenres)}
              className="text-xs font-bold text-primary hover:text-white transition-colors uppercase tracking-wider"
            >
              {showAllGenres ? "Show less" : "See all"}
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayedCategories.map((cat, i) => {
              const Icon = cat.icon;
              return (
                <div
                  key={i}
                  className={cn(
                    "h-28 rounded-2xl p-4 relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-all duration-300 group shadow-lg animate-in fade-in zoom-in-95 duration-500",
                    "bg-gradient-to-br",
                    cat.color
                  )}
                >
                  <span className="text-sm font-black text-white leading-tight uppercase tracking-wider relative z-10">{cat.title}</span>
                  <div className="absolute -right-2 -bottom-2 w-12 h-12 md:w-16 md:h-16 bg-white/10 rounded-xl rotate-[25deg] transform group-hover:rotate-[15deg] group-hover:scale-110 transition-transform duration-500 flex items-center justify-center border border-white/10 shadow-xl overflow-hidden">
                    <Icon className="w-6 h-6 md:w-8 md:h-8 text-white/40 -rotate-[25deg] group-hover:text-white/60 transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default Search;
