import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { useNavigate, Outlet } from 'react-router-dom';
import MusicPlayer from './MusicPlayer';
import { MoreHorizontal, Play, X, List, Plus, Music2, FolderPlus, Loader2, Sun, Moon, Menu, Search, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePlaylists } from '../context/PlaylistContext';
import { useTheme } from '../context/ThemeContext';
import SongImage from './SongImage';

const Layout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { playlists, createPlaylist, loading: playlistsLoading } = usePlaylists();
  const { theme, toggleTheme } = useTheme();
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const userInitial = user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'G';

  return (
    <div className="flex h-[100dvh] w-full bg-bg-base text-text-primary overflow-hidden font-sans transition-colors duration-300">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div className="flex-1 overflow-y-auto scroll-smooth pb-32 md:pb-24 no-scrollbar">
          {/* Mobile Header */}
          <header className="md:hidden sticky top-0 h-16 flex items-center justify-between px-4 z-40 bg-bg-base/90 backdrop-blur-md border-b border-border-main/5">
             <div className="flex items-center gap-2 sm:gap-4">
                <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-text-primary hover:bg-border-main/5 rounded-full transition-colors">
                  <Menu className="w-6 h-6" />
                </button>
                <div className="flex items-center cursor-pointer" onClick={() => navigate('/app')}>
                  <img src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiQcq9JW-7OCvpIQ9XvoF52Fe1G4EUkPlGGRLL0rxShLbT_1taBp0XuT2hmJDU6S2NWZh_WmwFwEpnosKk1mWXaLNqpCRGSleFgbtQLPdMo518w2Vedsnh2dZUMYyZv8YdJrghW4v3SGp8dMdCthac7Zkvi4hizggT0ueTpExsy6OEUAuIs4-2x2uGP17Po/s0/SumanMusic-logo.png" alt="SumanMusic" className="h-[52px] w-auto object-contain origin-left hover:scale-105 transition-transform" />
                </div>
             </div>
             <div className="flex items-center gap-1 sm:gap-2">
                <button className="hidden sm:flex items-center px-4 py-1.5 rounded-full border border-border-main/20 text-sm font-bold hover:bg-border-main/5 transition-colors">Open app</button>
                <button onClick={() => navigate('/app/search')} className="p-2 text-text-primary hover:bg-border-main/5 rounded-full transition-colors"><Search className="w-5 h-5 sm:w-6 sm:h-6" /></button>
                <button onClick={toggleTheme} className="p-2 text-text-primary hover:bg-border-main/5 rounded-full transition-colors group">
                  {theme === 'dark' ? <Sun className="w-5 h-5 sm:w-6 sm:h-6 text-text-secondary group-hover:text-primary transition-colors" /> : <Moon className="w-5 h-5 sm:w-6 sm:h-6 text-text-secondary group-hover:text-primary transition-colors" />}
                </button>
                <div className="w-8 h-8 rounded-full bg-bg-surface border border-border-main/10 flex items-center justify-center cursor-pointer overflow-hidden ml-1 sm:ml-2" onClick={() => navigate('/app/profile')}>
                    {user?.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" /> : <span className="text-sm font-bold text-text-primary">{userInitial}</span>}
                </div>
             </div>
          </header>

          {/* Desktop Header */}
          <header className="hidden md:flex sticky top-0 h-16 items-center justify-between px-8 z-40 bg-bg-surface md:bg-bg-surface/20 md:backdrop-blur-md border-b border-border-main/5">
             <div className="flex items-center">
                {/* Desktop header left content if any */}
             </div>
             <div className="flex items-center gap-3 md:gap-4">
                {!showRightSidebar && (
                  <button onClick={() => setShowRightSidebar(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-surface border border-border-main/20 hover:bg-bg-surface/80 transition-colors text-text-secondary hover:text-text-primary">
                    <List className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold">Playlist</span>
                  </button>
                )}
                <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-bg-surface transition-colors text-text-secondary hover:text-text-primary border border-border-main/10 group">
                  {theme === 'dark' ? <Sun className="w-5 h-5 group-hover:text-primary transition-colors" /> : <Moon className="w-5 h-5 group-hover:text-primary transition-colors" />}
                </button>
                <div className="w-8 h-8 rounded-full bg-bg-surface border border-border-main/10 flex items-center justify-center cursor-pointer group relative overflow-hidden ml-1" onClick={() => navigate('/app/profile')}>
                    {user?.photoURL ? <img src={user.photoURL} referrerPolicy="no-referrer" alt="profile" className="w-full h-full object-cover" /> : null}
                    <span className="text-xs font-bold text-text-secondary group-hover:text-text-primary transition-colors flex items-center justify-center w-full h-full" style={{ display: user?.photoURL ? 'none' : 'flex' }}>{userInitial}</span>
                </div>
             </div>
          </header>
          
          <div className="px-3 md:px-8 py-2">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Right Sidebar (Desktop only) */}
      {showRightSidebar && (
        <div className="w-80 bg-bg-surface/40 border-l border-border-main/5 p-6 hidden xl:flex flex-col gap-6 animate-in slide-in-from-right duration-300 backdrop-blur-md">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <List className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-text-primary">Playlist</h3>
              </div>
              <div className="flex items-center gap-2">
                 <button onClick={() => setIsCreating(true)} className="p-1 rounded-full hover:bg-bg-surface/80 text-text-secondary hover:text-primary transition-colors">
                   <Plus className="w-4 h-4" />
                 </button>
                 <span className="text-text-secondary hover:text-text-primary cursor-pointer"><MoreHorizontal className="w-5 h-5" /></span>
                 <button onClick={() => setShowRightSidebar(false)} className="p-1 rounded-full hover:bg-bg-surface/80 text-text-secondary hover:text-text-primary transition-colors">
                   <X className="w-4 h-4" />
                 </button>
               </div>
           </div>
           <div className="space-y-4 overflow-y-auto no-scrollbar flex-1">
              {isCreating && (
                <div className="p-4 rounded-2xl bg-bg-base border border-border-main/10 shadow-xl animate-in fade-in zoom-in-95 duration-200">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-3">New Playlist</p>
                  <input 
                    autoFocus 
                    type="text" 
                    id="new-playlist-input"
                    name="new-playlist-input"
                    placeholder="Enter name..." 
                    className="w-full bg-bg-surface border border-border-main/20 rounded-xl px-4 py-3 text-sm font-bold text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all mb-4" 
                    value={newPlaylistName} 
                    onChange={(e) => setNewPlaylistName(e.target.value)} 
                    onKeyDown={async (e) => { 
                      if (e.key === 'Enter' && newPlaylistName.trim()) { 
                        await createPlaylist(newPlaylistName); 
                        setNewPlaylistName(''); 
                        setIsCreating(false); 
                      } else if (e.key === 'Escape') { 
                        setIsCreating(false); 
                      } 
                    }} 
                  />
                  <div className="flex gap-2">
                    <button 
                      className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-white text-black text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none" 
                      disabled={!newPlaylistName.trim()} 
                      onClick={async () => { 
                        await createPlaylist(newPlaylistName); 
                        setNewPlaylistName(''); 
                        setIsCreating(false); 
                      }}
                    >
                      Create
                    </button>
                    <button 
                      className="px-4 py-2.5 rounded-xl bg-bg-surface/80 hover:bg-bg-surface border border-border-main/10 text-text-primary text-[11px] font-bold transition-all active:scale-95" 
                      onClick={() => setIsCreating(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              {playlistsLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
              ) : playlists.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {playlists.map(playlist => (
                    <div key={playlist.id} className="group flex flex-col gap-2 p-3 rounded-xl hover:bg-bg-surface transition-all cursor-pointer border border-transparent hover:border-border-main/10" onClick={() => navigate(`/app/library?filter=Playlists&id=${playlist.id}`)}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-bg-base flex items-center justify-center border border-border-main/10 flex-shrink-0 group-hover:border-primary/30 transition-all relative">
                          {playlist.songs && playlist.songs.length > 0 ? (
                            <SongImage src={playlist.songs[0].cover} alt={playlist.name} className="w-full h-full object-cover" />
                          ) : (
                            <Music2 className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-text-primary truncate group-hover:text-primary transition-colors">{playlist.name}</p>
                          <p className="text-[10px] text-text-secondary font-medium uppercase tracking-wider">{playlist.songs?.length || 0} songs</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                   <div className="w-12 h-12 bg-bg-surface rounded-full flex items-center justify-center mb-4 border border-border-main/10">
                      <FolderPlus className="w-5 h-5 text-text-secondary" />
                   </div>
                   <p className="text-sm font-bold text-text-secondary">No Playlists Yet</p>
                   <p className="text-[10px] text-text-secondary/60 mt-1">Your created playlists will appear here.</p>
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
