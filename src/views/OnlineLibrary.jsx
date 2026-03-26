import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowLeft, X, Music, Sparkles, Mic } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchYouTubeCategory } from '../services/youtube';
import SongImage from '../components/SongImage';
import { usePlayer } from '../context/usePlayer';
import { useSettings } from '../context/SettingsContext';
import { useVoiceSearch } from '../hooks/useVoiceSearch';
import { cn } from '../lib/utils';
import { useToast } from '../context/ToastContext';

const OnlineLibrary = () => {
  const { playSong, currentSong } = usePlayer();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { canAccessOnline, isOnlineLibraryEnabled } = useSettings();
  const [searchQuery, setSearchQuery] = useState('');
  

  const [searchResults, setSearchResults] = useState([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const { isListening, startListening, stopListening, isSupported } = useVoiceSearch({
    onResult: (transcript) => {
      setSearchQuery(transcript);
      handleSearch(transcript);
      showToast(`Searching for: ${transcript}`, "success");
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

  const handleSearch = async (query) => {
    if (!query.trim()) return;
    setIsSearching(true);
    setErrorMsg(null);
    try {
      const results = await fetchYouTubeCategory(query, 50);
      setSearchResults(results);
    } catch (error) {
      console.error("Search failed", error);
      setErrorMsg("Search failed. Please check your API quota.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleShowAll = (category) => {
    setSearchQuery(category);
    handleSearch(category);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setErrorMsg(null);
  };

  useEffect(() => {

  }, []);


  if (!canAccessOnline) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-6 text-center animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary">
          <Search className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-text-primary">
            {!isOnlineLibraryEnabled ? "Online Library is Disabled" : "Access Restricted"}
          </h2>
          <p className="text-text-secondary max-w-md mx-auto">
            {!isOnlineLibraryEnabled 
              ? "The administrator has temporarily disabled the Online Library feature." 
              : "This feature is only available for registered members. Please sign in to access YouTube music."}
          </p>
        </div>
        <button 
          onClick={() => navigate('/app')}
          className="px-8 py-3 bg-primary hover:bg-white text-black font-bold rounded-xl transition-all active:scale-95"
        >
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-32 animate-in fade-in duration-500">

      <div className="flex flex-col gap-2 mb-4">
        <div className="relative group max-w-4xl mx-auto w-full transition-all duration-500">
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
          
          <div className="relative flex items-center glass-premium rounded-3xl overflow-hidden border-border-main/20 group-focus-within:border-primary/50 group-focus-within:ring-4 group-focus-within:ring-primary/10 transition-all shadow-2xl">
            <div className="pl-5 text-text-secondary group-focus-within:text-primary transition-colors">
              <Search className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!e.target.value) clearSearch();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  handleSearch(searchQuery);
                }
              }}
              placeholder="What do you want to listen to?"
              className="w-full bg-transparent border-none py-5 px-4 md:py-6 md:px-6 text-base md:text-lg font-semibold text-text-primary placeholder:text-text-secondary focus:outline-none transition-all"
            />
            
            <div className="flex items-center gap-1 md:gap-2 mr-3 md:mr-4">
              <AnimatePresence>
                {searchQuery && (
                  <motion.button 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={clearSearch}
                    className="p-2 bg-text-secondary/10 hover:bg-text-secondary/20 rounded-full text-text-secondary hover:text-text-primary transition-all active:scale-90"
                  >
                    <X className="w-4 h-4 md:w-5 h-5" />
                  </motion.button>
                )}
              </AnimatePresence>

              {isSupported && (
                <button
                  onClick={isListening ? stopListening : startListening}
                  className={cn(
                    "p-2.5 md:p-3 rounded-full transition-all active:scale-90 flex items-center justify-center relative",
                    isListening 
                      ? "bg-primary text-black animate-pulse-primary" 
                      : "bg-text-secondary/10 hover:bg-text-secondary/20 text-text-secondary hover:text-primary"
                  )}
                  title={isListening ? "Stop Listening" : "Voice Search"}
                >
                  <Mic className={cn("w-5 h-5 transition-transform", isListening && "scale-110")} />
                  {isListening && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                    </span>
                  )}
                </button>
              )}
            </div>
            
            <button
               onClick={() => searchQuery.trim() && handleSearch(searchQuery)}
               className="hidden md:flex items-center gap-2 mr-3 px-6 py-3 bg-primary hover:bg-white text-black font-bold rounded-2xl transition-all hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] active:scale-95 whitespace-nowrap"
            >
               Search
            </button>
          </div>
        </div>
        

        <p className="md:hidden text-[10px] text-text-secondary text-center font-medium uppercase tracking-[0.2em] opacity-60">
           Type and press enter to discover
        </p>
      </div>


      <div className="mt-2">
        {isSearching ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
             <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
             <p className="text-text-secondary font-medium">Searching YouTube...</p>
          </div>
        ) : searchResults.length > 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="animate-in slide-in-from-bottom-4 duration-500"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="space-y-1">
                <h2 className="text-xl md:text-3xl font-bold text-text-primary tracking-tight">Search results</h2>
                <p className="text-xs md:text-sm text-text-secondary font-medium">Top matches for "{searchQuery}"</p>
              </div>
              <button 
                onClick={clearSearch} 
                className="flex items-center gap-2 py-2 px-4 bg-bg-surface/60 hover:bg-bg-surface border border-border-main/10 rounded-xl text-sm font-bold text-text-primary hover:text-primary transition-all group/back active:scale-95"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover/back:-translate-x-1" />
                <span className="hidden md:inline">Go Back</span>
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-5 pb-10">
               {searchResults.map((song, idx) => (
                  <motion.div 
                    key={song.id} 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.03 }}
                    onClick={() => playSong(song)}
                    className={cn(
                      "group flex flex-col gap-3 p-3 rounded-2xl border border-transparent transition-all cursor-pointer relative overflow-hidden",
                      currentSong?.id === song.id 
                        ? "bg-primary/10 border-primary/30 shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]" 
                        : "hover:bg-bg-surface/60 hover:border-border-main/10 hover:shadow-xl"
                    )}
                  >
                    <div className="relative aspect-square w-full overflow-hidden rounded-xl shadow-lg">
                      <SongImage src={song.cover} alt={song.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                         <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                           <div className="w-3 h-3 ml-0.5 border-t-6 border-t-transparent border-l-[10px] border-l-black border-b-6 border-b-transparent" />
                         </div>
                      </div>

                      {currentSong?.id === song.id && (
                         <div className="absolute top-2 right-2 bg-primary p-1.5 rounded-lg shadow-lg flex items-center justify-center">
                           <div className="flex gap-0.5 items-end h-3">
                              <div className="w-0.5 bg-black animate-music-bar" style={{ animationDelay: '0s' }} />
                              <div className="w-0.5 bg-black animate-music-bar" style={{ animationDelay: '0.2s' }} />
                              <div className="w-0.5 bg-black animate-music-bar" style={{ animationDelay: '0.4s' }} />
                           </div>
                         </div>
                      )}
                    </div>
                    <div className="min-w-0 px-0.5">
                      <h3 className={cn("text-sm font-bold truncate transition-colors", currentSong?.id === song.id ? "text-primary" : "text-text-primary group-hover:text-primary")}>{song.title}</h3>
                      <p className="text-[11px] text-text-secondary truncate mt-0.5 font-medium">{song.artist}</p>
                    </div>
                  </motion.div>
               ))}
            </div>
          </motion.div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
             <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
             <p className="text-text-secondary font-medium tracking-wide">Connecting to YouTube...</p>
          </div>
        ) : errorMsg ? (
          <div className="flex flex-col items-center justify-center p-10 bg-bg-surface/40 backdrop-blur-sm rounded-3xl border border-border-main/5 text-center gap-6">
             <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 border border-red-500/20">
                <Search className="w-8 h-8" />
             </div>
             <div className="space-y-2">
                <h3 className="text-xl font-bold text-text-primary">{errorMsg}</h3>
                <p className="text-text-secondary max-w-sm mx-auto text-sm">
                   Your API quota is exceeded. Please wait for reset (Midnight PT) or add more keys to your .env file.
                </p>
             </div>
             <button 
                onClick={() => window.location.reload()}
                className="py-2.5 px-6 bg-primary hover:bg-primary-dark text-black font-bold rounded-xl transition-all"
             >
                Retry Connection
             </button>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-6 px-4"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />
              <div className="relative w-24 h-24 md:w-32 md:h-32 glass-premium rounded-full flex items-center justify-center text-primary shadow-2xl overflow-hidden group">
                <Music className="w-10 h-10 md:w-16 md:h-16 group-hover:scale-110 transition-transform duration-500" />
                <Sparkles className="absolute top-4 right-4 w-4 h-4 md:w-6 md:h-6 text-white animate-bounce" />
              </div>
            </div>
            <div className="space-y-3 max-w-sm">
                <h3 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-text-primary to-text-secondary/50">
                   Discover Your Music
                </h3>
                <p className="text-sm md:text-base text-text-secondary font-medium leading-relaxed">
                   Enter a song name, artist, or album. We'll find the best matches from YouTube for you.
                </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-3 mt-4 opacity-50 hover:opacity-100 transition-opacity">
               {["Hits 2024", "Lo-fi", "Party", "Workout"].map(tag => (
                  <span 
                    key={tag}
                    onClick={() => { setSearchQuery(tag); handleSearch(tag); }}
                    className="px-4 py-1.5 glass rounded-full text-xs font-bold cursor-pointer hover:bg-primary hover:text-black transition-all"
                  >
                    #{tag}
                  </span>
               ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default OnlineLibrary;
