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
      <div className="flex items-center gap-4">
        <h1 className="text-3xl font-black text-text-primary">SumanMusic</h1>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-surface/80 rounded-full border border-border-main/10 group-focus-within:border-primary/50 transition-colors">
           <Search className="w-4 h-4 text-text-secondary" />
           <input type="text" placeholder="Search Drive" className="bg-transparent border-none text-xs focus:ring-0 w-32 text-text-primary placeholder:text-text-secondary" />
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
          <div className="bg-bg-surface/40 rounded-xl border border-border-main/5 p-8 flex gap-8 items-center bg-gradient-to-br from-bg-surface/20 to-transparent backdrop-blur-md">
             <div className="w-48 h-48 rounded-lg shadow-2xl overflow-hidden flex-shrink-0 border border-border-main/10">
                <SongImage src={currentSong?.cover || songs[0].cover} alt="Now playing" className="w-full h-full object-cover" />
             </div>
             <div className="flex-1 flex flex-col gap-6">
                <div>
                   <h2 className="text-5xl font-black text-text-primary mb-2">{currentSong?.title || "Song Title"}</h2>
                   <p className="text-text-secondary font-medium">{currentSong?.artist || "Unknown Artist"} {currentSong?.year ? `• ${currentSong.year}` : ""}</p>
                   <p className="text-text-secondary/50 text-sm">{currentSong?.album || (currentSong ? "Single" : "Album Name")}</p>
                </div>
                
                <div className="flex items-center gap-4">
                   <button className="bg-primary text-black font-extrabold px-10 py-3 rounded-full flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-primary/20">
                      <Play className="w-5 h-5 fill-current" />
                      Play
                   </button>
                   <button className="bg-bg-surface text-text-primary font-bold px-8 py-3 rounded-full border border-border-main/10 hover:bg-bg-surface/80 transition-colors flex items-center gap-2">
                        <Shuffle className="w-5 h-5" />
                        Next
                    </button>
                </div>

                 <div className="space-y-2 max-w-md">
                    <div className="flex justify-between text-[10px] font-bold text-text-secondary">
                       <span>{formatTime(currentTime)}</span>
                       <span>{formatTime(duration)}</span>
                    </div>
                    <div className="h-1 w-full bg-bg-base rounded-full relative overflow-hidden border border-border-main/5">
                       <div 
                         className="absolute top-0 left-0 h-full bg-primary transition-all duration-300" 
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
