import React, { useState } from 'react';
import { Search, ArrowLeft, MoreHorizontal, LayoutGrid, List } from 'lucide-react';
import { usePlayer } from '../context/usePlayer';
import { cn } from '../lib/utils';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PlayingVisualizer from '../components/PlayingVisualizer';
import SongImage from '../components/SongImage';

const Artists = () => {
  const { songs, playSong, currentSong, isPlaying, setOptionsSong } = usePlayer();
  const navigate = useNavigate();
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list' for artists
  const [artistInfo, setArtistInfo] = useState(null);
  const [loadingArtistInfo, setLoadingArtistInfo] = useState(false);
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [listScrollPos, setListScrollPos] = useState(0);

  // Group unique artists (splitting collaborations)
  const artists = React.useMemo(() => songs.reduce((acc, song) => {
    const rawArtist = song.artist || 'Unknown Artist';
    // Split by comma, ampersand, or "and" (with optional spaces)
    const individualArtists = rawArtist.split(/\s*,\s*|\s*&\s*|\s+and\s+/i)
      .map(name => name.trim())
      .filter(name => name.length > 0);

    individualArtists.forEach(artistName => {
      if (!acc[artistName]) {
        acc[artistName] = {
          name: artistName,
          songs: [],
          cover: song.cover || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=60'
        };
      }
      // Avoid duplicate songs for the same artist if they appear multiple times in a track string (though unlikely)
      if (!acc[artistName].songs.find(s => s.id === song.id)) {
        acc[artistName].songs.push(song);
      }
    });
    return acc;
  }, {}), [songs]);

  const artistList = React.useMemo(() => 
    Object.values(artists).sort((a, b) => a.name.localeCompare(b.name))
  , [artists]);

  const [searchParams, setSearchParams] = useSearchParams();

  React.useEffect(() => {
    const artistParam = searchParams.get('artist');
    if (artistParam) {
      const artist = artistList.find(a => a.name === artistParam);
      if (artist && artist.name !== selectedArtist?.name) {
        setArtistInfo(null);
        setLoadingArtistInfo(true);
        setSelectedArtist(artist);
        // Ensure scroll resets when opening artist details
        document.querySelector('.overflow-y-auto')?.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else if (selectedArtist !== null) {
      setArtistInfo(null);
      setSelectedArtist(null);
    }
  }, [searchParams, artistList, selectedArtist]);

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

    if (selectedArtist) {
      fetchArtistDetails(selectedArtist.name);
    } else {
      setArtistInfo(null);
    }
  }, [selectedArtist]);

  React.useEffect(() => {
    if (selectedArtist === null && listScrollPos > 0) {
      // Must wait momentarily for the layout to expand the grid back
      setTimeout(() => {
        const scrollContainer = document.querySelector('.overflow-y-auto');
        if (scrollContainer) scrollContainer.scrollTo({ top: listScrollPos });
      }, 10);
    }
  }, [selectedArtist, listScrollPos]);

  const renderSong = (song) => (
    <div 
      key={song.id} 
      className={cn(
        "flex group cursor-pointer transition-all duration-300 items-center gap-4 hover:bg-bg-surface/50 p-2 rounded-2xl",
        currentSong?.id === song.id && "bg-bg-surface/60 scale-[1.02] shadow-xl shadow-primary/5 border-primary/10"
      )}
      onClick={() => playSong(song)}
    >
       <div className="w-16 h-16 rounded-xl overflow-hidden bg-bg-surface shadow-lg relative shrink-0">
          <SongImage src={song.cover} alt={song.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
          {currentSong?.id === song.id && isPlaying && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
               <PlayingVisualizer className="h-6" />
            </div>
          )}
       </div>
       <div className="flex-1 min-w-0">
          <p className={cn(
            "font-bold truncate text-base",
            currentSong?.id === song.id ? "text-primary" : "text-text-primary"
          )}>{song.title}</p>
          <p className="text-[10px] text-text-secondary truncate uppercase mt-0.5 tracking-wider font-semibold">Song • {song.artist}</p>
       </div>
       <div className="ml-auto flex items-center gap-2">
         <MoreHorizontal 
           className="w-5 h-5 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:text-text-primary" 
           onClick={(e) => {
             e.stopPropagation();
             setOptionsSong(song);
           }}
         />
       </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 pb-48">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {selectedArtist && (
             <button 
               onClick={() => {
                 setSearchParams({});
               }}
               className="p-2 rounded-full bg-bg-surface hover:bg-bg-surface/80 transition-colors"
             >
               <ArrowLeft className="w-6 h-6 text-text-primary" />
             </button>
          )}
          <h1 className="text-3xl font-black text-text-primary">
            {selectedArtist ? selectedArtist.name : 'Artists'}
          </h1>
        </div>
        
        {!selectedArtist && (
          <div className="flex items-center gap-3">
             <div 
               className="p-2 rounded-lg hover:bg-bg-surface transition-colors cursor-pointer text-text-secondary hover:text-text-primary border border-border-main/5"
               onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
             >
               {viewMode === 'grid' ? <List className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
             </div>
             <div className="p-2 rounded-lg hover:bg-bg-surface transition-colors cursor-pointer text-text-secondary hover:text-text-primary border border-border-main/5" onClick={() => navigate('/app/search')}>
                <Search className="w-5 h-5" />
             </div>
          </div>
        )}
      </div>

      {selectedArtist ? (
        /* Artist Detail View */
        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Hero Section */}
          <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-end p-4 md:p-6 rounded-[2.5rem] bg-gradient-to-b from-bg-surface/40 to-transparent border border-white/5">
             <div className="w-48 h-48 md:w-64 md:h-64 rounded-full overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-4 border-bg-surface shrink-0 relative group">
                <SongImage 
                  src={artistInfo?.strArtistThumb || selectedArtist.cover} 
                  alt={selectedArtist.name} 
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
             </div>
             <div className="flex flex-col items-center md:items-start text-center md:text-left flex-1 min-w-0">
                <p className="px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] mb-4 w-fit">
                  {artistInfo?.strGenre || 'Verified Artist'}
                </p>
                <h2 className="text-4xl md:text-7xl font-black text-text-primary mb-3 tracking-tighter leading-none truncate w-full">{selectedArtist.name}</h2>
                <div className="flex items-center gap-2 text-xs md:text-sm text-text-secondary font-bold uppercase tracking-widest opacity-80">
                   <span>{selectedArtist.songs.length} Tracks</span>
                   <span>•</span>
                   <span>Your Library</span>
                </div>
             </div>
          </div>

          {/* Biography Section */}
          {(artistInfo?.strBiographyEN || artistInfo?.strBiography) && (
            <div className="px-4 md:px-6">
              <div className="p-6 md:p-8 rounded-3xl bg-bg-surface/30 border border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary/40" />
                <h3 className="text-sm font-black text-text-primary uppercase tracking-[0.2em] mb-4 opacity-50">About the Artist</h3>
                <p className={cn(
                  "text-sm md:text-base text-text-secondary leading-relaxed transition-all duration-500",
                  !isBioExpanded && "line-clamp-4"
                )} style={!isBioExpanded ? { display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : {}}>
                  {artistInfo.strBiographyEN || artistInfo.strBiography}
                </p>
                <button 
                  onClick={() => setIsBioExpanded(!isBioExpanded)}
                  className="mt-4 text-xs font-black text-primary hover:text-primary/80 uppercase tracking-widest flex items-center gap-2 transition-all"
                >
                  {isBioExpanded ? 'Show Less' : 'Read Full Biography'}
                  <div className={cn("w-1 h-1 rounded-full bg-primary transition-all", isBioExpanded ? "scale-150" : "scale-100")} />
                </button>
              </div>
            </div>
          )}

          {/* Tracks List */}
          <div className="space-y-1">
             <h3 className="text-xl font-bold text-text-primary mb-4 px-2">Popular Tracks</h3>
             {selectedArtist.songs.map(song => renderSong(song))}
          </div>
        </div>
      ) : (
        /* Artists List View */
        <div className={cn(
          "grid gap-6 animate-in fade-in duration-500",
          viewMode === 'grid' ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6" : "grid-cols-1"
        )}>
          {artistList.map((artist, idx) => (
            <div 
              key={idx}
              className={cn(
                "group cursor-pointer transition-all duration-300",
                viewMode === 'grid' 
                  ? "flex flex-col gap-3 p-4 rounded-3xl bg-bg-surface/40 hover:bg-bg-surface/70 border border-border-main/5 hover:shadow-2xl hover:shadow-primary/5 active:scale-95" 
                  : "flex items-center gap-4 p-3 rounded-2xl bg-bg-surface/30 hover:bg-bg-surface/50 border border-border-main/5"
              )}
              onClick={() => {
                const scrollContainer = document.querySelector('.overflow-y-auto');
                if (scrollContainer) setListScrollPos(scrollContainer.scrollTop);
                setSearchParams({ artist: artist.name });
              }}
            >
              <div className={cn(
                "rounded-full overflow-hidden bg-bg-base shadow-xl shrink-0 transition-transform duration-500 group-hover:scale-105",
                viewMode === 'grid' ? "w-full aspect-square" : "w-16 h-16"
              )}>
                <SongImage src={artist.cover} alt={artist.name} className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn(
                  "font-bold truncate text-text-primary group-hover:text-primary transition-colors",
                  viewMode === 'grid' ? "text-base text-center mt-1" : "text-lg"
                )}>{artist.name}</p>
                <p className={cn(
                  "text-[10px] text-text-secondary uppercase font-bold tracking-wider",
                  viewMode === 'grid' ? "text-center" : ""
                )}>Artist</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Artists;
