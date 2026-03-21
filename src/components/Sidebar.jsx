import React, { memo } from 'react';
import { Home, Search, Library, Heart, Cloud, User, Settings, Plus, X, Music2, Loader2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePlaylists } from '../context/PlaylistContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import SongImage from './SongImage';

const NavItem = ({ icon: Icon, label, active, onClick, variant = 'desktop' }) => (
  <div
    onClick={onClick}
    className={cn(
      "flex items-center gap-4 px-4 cursor-pointer transition-all duration-200 group",
      variant === 'mobile'
        ? (active ? "text-text-primary bg-border-main/10 rounded-xl py-1.5" : "text-text-secondary hover:text-text-primary hover:bg-border-main/5 rounded-xl py-1.5")
        : (active ? "text-text-primary bg-bg-surface shadow-[0_4px_12px_rgba(0,0,0,0.1)] rounded-md py-3" : "text-text-secondary hover:text-text-primary hover:bg-bg-surface/30 rounded-md py-3")
    )}
  >
    <Icon className={cn("w-6 h-6", active ? (variant === 'mobile' ? "text-text-primary" : "text-primary") : "text-text-secondary group-hover:text-text-primary")} />
    <span className={cn("font-bold text-base", variant === 'desktop' && "font-semibold")}>{label}</span>
  </div>
);

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isGuest } = useAuth();
  const { playlists, createPlaylist, loading: playlistsLoading } = usePlaylists();
  const [isCreating, setIsCreating] = React.useState(false);
  const [newPlaylistName, setNewPlaylistName] = React.useState('');

  const currentPath = location.pathname;
  const isHome = currentPath === '/app' || currentPath === '/app/';
  const isSearch = currentPath === '/app/search';
  const isLibrary = currentPath === '/app/library';
  const isDrive = currentPath === '/app/drive';
  const isArtists = currentPath === '/app/artists';
  const isLiked = currentPath === '/app/library' && new URLSearchParams(location.search).get('filter') === 'Liked';

  const commonItems = [
    { icon: Home, label: "Home", active: isHome, onClick: () => navigate('/app') },
    { icon: Library, label: "Library", active: isLibrary, onClick: () => navigate('/app/library') },
  ];

  const desktopExtraItems = [
    { icon: Search, label: "Search", active: isSearch, onClick: () => navigate('/app/search') },
    { icon: User, label: "Artists", active: isArtists, onClick: () => navigate('/app/artists') },
    { icon: Heart, label: "Liked Songs", active: isLiked, onClick: () => navigate('/app/library?filter=Liked') },
    { icon: Cloud, label: "Drive Source", active: isDrive, onClick: () => navigate('/app/drive') },
  ];


  const MobileContent = (
    <div className="flex flex-col h-full bg-bg-base transition-colors duration-300">
      {/* Fixed Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border-main/5 shrink-0">
        <div className="flex items-center">
          <img
            src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiQcq9JW-7OCvpIQ9XvoF52Fe1G4EUkPlGGRLL0rxShLbT_1taBp0XuT2hmJDU6S2NWZh_WmwFwEpnosKk1mWXaLNqpCRGSleFgbtQLPdMo518w2Vedsnh2dZUMYyZv8YdJrghW4v3SGp8dMdCthac7Zkvi4hizggT0ueTpExsy6OEUAuIs4-2x2uGP17Po/s0/SumanMusic-logo.png"
            alt="SumanMusic"
            className="h-15 w-auto object-contain"
          />
        </div>
        <button onClick={onClose} className="p-2 -mr-2 text-text-primary hover:bg-border-main/5 rounded-full transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Scrollable middle section */}
      <div className="flex-1 overflow-y-auto no-scrollbar py-2">
        <div className="flex flex-col gap-1 px-2">
          <NavItem {...commonItems[0]} variant="mobile" onClick={() => { commonItems[0].onClick(); onClose(); }} />
          <NavItem {...desktopExtraItems[0]} variant="mobile" onClick={() => { desktopExtraItems[0].onClick(); onClose(); }} />
          <NavItem {...commonItems[1]} variant="mobile" onClick={() => { commonItems[1].onClick(); onClose(); }} />
          
          <div className="h-[1px] bg-border-main/10 my-2 mx-4" />
          
          <NavItem {...desktopExtraItems[1]} variant="mobile" onClick={() => { desktopExtraItems[1].onClick(); onClose(); }} />
          <NavItem {...desktopExtraItems[2]} variant="mobile" onClick={() => { desktopExtraItems[2].onClick(); onClose(); }} />
          <NavItem {...desktopExtraItems[3]} variant="mobile" onClick={() => { desktopExtraItems[3].onClick(); onClose(); }} />
          
          <div className="h-[1px] bg-border-main/10 my-2 mx-4" />
          
          {isCreating ? (
            <div className="mx-4 p-4 rounded-2xl bg-bg-surface border border-border-main/10 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-3">New Playlist</p>
              <input 
                autoFocus
                type="text"
                placeholder="Enter name..."
                className="w-full bg-bg-base border border-border-main/10 rounded-xl px-4 py-3 text-sm font-bold text-text-primary placeholder-text-secondary/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all mb-4"
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
                  className="flex-1 py-3 rounded-xl bg-primary hover:bg-white text-black text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
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
                  className="px-4 py-3 rounded-xl bg-bg-base hover:bg-bg-surface text-text-primary text-xs font-bold transition-all active:scale-95 border border-border-main/10"
                  onClick={() => setIsCreating(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              className="flex items-center justify-center gap-2 mx-4 py-2.5 bg-bg-surface hover:bg-bg-surface/80 text-text-primary rounded-full transition-all border border-border-main/5 mt-2"
              onClick={() => setIsCreating(true)}
            >
              <Plus className="w-5 h-5" />
              <span className="font-bold">New playlist</span>
            </button>
          )}

          <div className="mt-4 flex flex-col gap-1 px-2 pb-4">
            {playlistsLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
            ) : playlists.length > 0 ? (
              playlists.map(playlist => (
                <div 
                  key={playlist.id} 
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-border-main/5 transition-all cursor-pointer"
                  onClick={() => { navigate(`/app/library?filter=Playlists&id=${playlist.id}`); onClose(); }}
                >
                  <div className="w-10 h-10 rounded-lg bg-bg-surface overflow-hidden border border-border-main/5 flex-shrink-0">
                    {playlist.songs && playlist.songs.length > 0 ? (
                      <SongImage 
                        src={playlist.songs[0].cover} 
                        alt={playlist.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-bg-surface">
                        <Music2 className="w-5 h-5 text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-text-primary truncate">{playlist.name}</p>
                    <p className="text-[10px] text-text-secondary font-medium uppercase tracking-wider">{playlist.songs?.length || 0} songs</p>
                  </div>
                </div>
              ))
            ) : null}
          </div>
        </div>
      </div>

      {/* Sticky Account Section */}
      {user && !isGuest && (
        <div className="mt-auto p-4 border-t border-border-main/5 bg-bg-base shrink-0">
          <div className="flex items-center gap-3 p-3 hover:bg-border-main/5 rounded-xl cursor-pointer" onClick={() => { navigate('/app/profile'); onClose(); }}>
            <div className="w-10 h-10 rounded-full overflow-hidden bg-bg-surface flex items-center justify-center border border-border-main/10">
              {user.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" /> : <span className="text-primary font-bold">{user.displayName?.charAt(0)}</span>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm text-text-primary truncate">{user.displayName || 'Account'}</p>
              <p className="text-[10px] text-primary font-bold uppercase">PREMIUM</p>
            </div>
            <Settings className="w-4 h-4 text-text-secondary" />
          </div>
        </div>
      )}
    </div>
  );

  const DesktopContent = (
    <div className="w-64 max-h-screen bg-bg-base flex flex-col gap-2 p-2 hidden md:flex shrink-0 pb-18 transition-colors duration-300">
      <div className="bg-bg-surface/50 rounded-lg p-4 flex flex-col gap-2 border border-border-main/5 backdrop-blur-md">
        <div className="px-2 py-2 mb-4 cursor-pointer" onClick={() => navigate('/app')}>
          <img
            src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiQcq9JW-7OCvpIQ9XvoF52Fe1G4EUkPlGGRLL0rxShLbT_1taBp0XuT2hmJDU6S2NWZh_WmwFwEpnosKk1mWXaLNqpCRGSleFgbtQLPdMo518w2Vedsnh2dZUMYyZv8YdJrghW4v3SGp8dMdCthac7Zkvi4hizggT0ueTpExsy6OEUAuIs4-2x2uGP17Po/s0/SumanMusic-logo.png"
            alt="SumanMusic"
            className="h-16 w-auto object-contain"
          />
        </div>
        <NavItem {...commonItems[0]} variant="desktop" />
        <NavItem {...desktopExtraItems[0]} variant="desktop" />
        <NavItem {...commonItems[1]} variant="desktop" />
        <NavItem {...desktopExtraItems[1]} variant="desktop" />
        <NavItem {...desktopExtraItems[2]} variant="desktop" />
        <NavItem {...desktopExtraItems[3]} variant="desktop" />
      </div>

      {user && !isGuest ? (
        <div className="bg-bg-surface/50 rounded-lg p-2 mt-auto border border-border-main/10 shadow-sm">
          <div className="flex items-center gap-3 px-3 py-3 hover:bg-bg-surface rounded-md transition-all cursor-pointer group" onClick={() => navigate('/app/profile')}>
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-bg-base border-2 border-border-main/20 group-hover:border-primary transition-colors flex items-center justify-center">
              {user.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-primary flex items-center justify-center"><span className="text-black font-bold text-lg">{user.displayName?.charAt(0) || 'U'}</span></div>}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="font-bold text-sm text-text-primary truncate">{user.displayName || 'My Account'}</p>
              <p className="text-[10px] text-primary font-medium tracking-wide">PREMIUM USER</p>
            </div>
            <Settings className="w-4 h-4 text-text-secondary ml-auto group-hover:text-text-primary transition-colors" />
          </div>
        </div>
      ) : (
        <div className="mt-auto px-4 py-3 bg-bg-surface/30 rounded-lg border border-border-main/5 opacity-50">
          <p className="text-[10px] font-bold text-text-secondary tracking-widest uppercase">Guest Session</p>
        </div>
      )}
    </div>
  );

  return (
    <>
      {DesktopContent}

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-bg-base/60 backdrop-blur-sm z-[100] md:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[280px] bg-bg-base z-[101] md:hidden shadow-2xl overflow-y-auto no-scrollbar"
            >
              {MobileContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default memo(Sidebar);

