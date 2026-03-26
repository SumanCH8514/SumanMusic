import React from 'react';
import { Search, Cloud, Download, Play, MoreVertical, Shuffle } from 'lucide-react';
import { usePlayer } from '../context/usePlayer';
import { cn } from '../lib/utils';
import PlayingVisualizer from '../components/PlayingVisualizer';
import SongImage from '../components/SongImage';

const DriveSource = () => {
  const { songs, playSong, currentSong, isPlaying, isLoading, error, refreshSongs, currentTime, duration, progress, setOptionsSong } = usePlayer();

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-text-secondary font-medium">Fetching your Drive folder...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 gap-4 text-center max-w-md mx-auto">
        <p className="text-red-400 font-bold">Error: {error}</p>
        <p className="text-text-secondary text-sm">Please check your config.js credentials and ensure your Google Drive folder is public or the API key is valid.</p>
        <button onClick={refreshSongs} className="mt-4 bg-bg-surface text-text-primary px-6 py-2 rounded-full border border-border-main/10 hover:bg-bg-surface/80">Try Again</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-48 w-full max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-2 sm:px-0">
        <h1 className="text-2xl sm:text-3xl font-black text-text-primary">SumanMusic</h1>
        <div className="flex items-center gap-2 px-4 py-2 bg-bg-surface/80 rounded-full border border-border-main/10 group-focus-within:border-primary/50 transition-colors w-full sm:w-auto">
           <Search className="w-4 h-4 text-text-secondary shrink-0" />
           <input type="text" placeholder="Search Drive" className="bg-transparent border-none text-xs focus:ring-0 flex-1 sm:w-32 text-text-primary placeholder:text-text-secondary" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Drive List */}
        <div className="lg:col-span-4 bg-bg-surface/40 rounded-xl border border-border-main/5 p-4 h-fit backdrop-blur-md">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Cloud className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-text-primary">Drive Source</h2>
            </div>
            <button onClick={refreshSongs} className="text-[10px] bg-bg-base px-2 py-1 rounded hover:bg-bg-surface text-text-secondary hover:text-text-primary transition-colors">Refresh</button>
          </div>
          
          <div className="bg-bg-surface/40 rounded-lg p-3 mb-4 border border-border-main/5">
             <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider mb-1">Source: Google Drive Cloud</p>
             <p className="text-xs text-text-primary font-medium truncate">{songs.length} Songs Loaded</p>
          </div>

          <div className="space-y-1 max-h-[500px] overflow-y-auto no-scrollbar">
            {songs.map((song) => (
              <div 
                key={song.id} 
                className={cn(
                  "flex items-center justify-between p-2 rounded-md transition-all cursor-pointer group hover:bg-bg-surface/50",
                  currentSong?.id === song.id && "bg-primary/10 border border-primary/20 shadow-lg shadow-primary/5 scale-[1.01]"
                )}
                onClick={() => playSong(song)}
              >
                <div className="flex items-center gap-3">
                   <div className={cn("p-2 rounded transition-colors", currentSong?.id === song.id ? "bg-primary/20" : "bg-bg-base border border-border-main/5")}>
                      <Cloud className={cn("w-4 h-4", currentSong?.id === song.id ? "text-primary" : "text-text-secondary")} />
                   </div>
                   <div className="min-w-0">
                     <p className={cn("text-sm font-medium truncate", currentSong?.id === song.id ? "text-primary" : "text-text-primary")}>{song.title}</p>
                     <p className="text-[10px] text-text-secondary truncate">{song.artist}</p>
                   </div>
                </div>
                <div className="flex items-center gap-2">
                  {currentSong?.id === song.id && isPlaying ? (
                    <PlayingVisualizer className="h-4" />
                  ) : (
                    <Play className="w-3 h-3 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" />
                  )}
                  <MoreVertical 
                    className="w-4 h-4 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:text-text-primary" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setOptionsSong(song);
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Now Playing Widget (Desktop Center) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-bg-surface/40 rounded-2xl border border-border-main/5 p-6 sm:p-8 flex flex-col md:flex-row gap-6 md:gap-8 items-center bg-gradient-to-br from-bg-surface/20 to-transparent backdrop-blur-md">
             <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-2xl shadow-2xl overflow-hidden flex-shrink-0 border border-border-main/10">
                <SongImage src={currentSong?.cover || songs[0].cover} alt="Now playing" className="w-full h-full object-cover" />
             </div>
             <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left gap-6 w-full overflow-hidden">
                <div className="w-full">
                   <h2 className={cn(
                     "font-black text-text-primary mb-2 line-clamp-2",
                     (currentSong?.title?.length || 0) > 20 ? "text-2xl sm:text-3xl md:text-4xl" : "text-3xl sm:text-4xl md:text-5xl"
                   )}>{currentSong?.title || "Song Title"}</h2>
                   <p className="text-text-secondary font-medium truncate">{currentSong?.artist || "Unknown Artist"} {currentSong?.year ? `• ${currentSong.year}` : ""}</p>
                   <p className="text-text-secondary/50 text-sm truncate">{currentSong?.album || (currentSong ? "Single" : "Album Name")}</p>
                </div>
                
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 w-full">
                   <button className="bg-primary text-black font-extrabold px-8 sm:px-10 py-3 rounded-full flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-primary/20 flex-1 sm:flex-initial">
                      <Play className="w-5 h-5 fill-current" />
                      Play
                   </button>
                   <button className="bg-bg-surface text-text-primary font-bold px-6 sm:px-8 py-3 rounded-full border border-border-main/10 hover:bg-bg-surface/80 transition-colors flex items-center justify-center gap-2 flex-1 sm:flex-initial">
                        <Shuffle className="w-5 h-5" />
                        Next
                    </button>
                </div>

                 <div className="space-y-2 w-full max-w-md">
                    <div className="flex justify-between text-[10px] font-bold text-text-secondary">
                       <span>{formatTime(currentTime)}</span>
                       <span>{formatTime(duration)}</span>
                    </div>
                    <div className="h-1.5 w-full bg-bg-base/50 rounded-full relative overflow-hidden border border-border-main/5">
                       <div 
                         className="absolute top-0 left-0 h-full bg-primary transition-all duration-300 rounded-full" 
                         style={{ width: `${progress}%` }}
                       />
                    </div>
                 </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriveSource;
