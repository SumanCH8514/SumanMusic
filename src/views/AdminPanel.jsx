import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/usePlayer';
import { useGDrive } from '../context/GDriveContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { Users, Music, Database, Activity, ShieldAlert, Settings, ArrowLeft, RefreshCw, Trash2, Shield, Loader2 } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { Globe } from 'lucide-react';

// eslint-disable-next-line no-unused-vars
const AdminCard = ({ icon: Icon, title, description, count, color, isLoading }) => (
  <div className="relative overflow-hidden bg-black/40 backdrop-blur-xl border border-white/10 p-4 md:p-6 rounded-3xl hover:bg-white/5 transition-all duration-300 group">
    <div className={`absolute -right-10 -top-10 w-32 h-32 bg-${color}-500/20 rounded-full blur-3xl group-hover:bg-${color}-500/30 transition-colors`}></div>
    <div className="relative z-10 flex items-start justify-between">
      <div className={`p-2.5 md:p-3.5 rounded-2xl bg-${color}-500/10 text-${color}-400 group-hover:scale-110 shadow-lg shadow-${color}-500/5 transition-transform duration-300`}>
        <Icon className="w-5 h-5 md:w-6 md:h-6" />
      </div>
      <div className="text-right">
        {isLoading ? (
           <div className="h-8 w-16 bg-white/10 rounded animate-pulse mt-1"></div>
        ) : (
           <span className="text-xl md:text-3xl font-black text-white tracking-tighter">{count}</span>
        )}
      </div>
    </div>
    <div className="relative z-10 mt-4 md:mt-6">
      <h3 className="text-white font-bold text-base md:text-lg">{title}</h3>
      <p className="text-zinc-400 text-xs md:text-sm mt-0.5 md:mt-1">{description}</p>
    </div>
  </div>
);

const AdminPanel = () => {
  const { user } = useAuth();
  const { songs, refreshSongs } = usePlayer();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [userCount, setUserCount] = useState(0);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const { 
    keys, 
    activeIndex, 
    updateKeys, 
    updateActiveIndex, 
    autoSwitchEnabled,
    updateAutoSwitchEnabled,
    isPersonalDriveEnabled,
    updatePersonalDriveEnabled
  } = useGDrive();
  const [localKeys, setLocalKeys] = useState(['', '', '', '']);
  const [isSavingKeys, setIsSavingKeys] = useState(false);
  const { 
    isOnlineLibraryEnabled, 
    updateOnlineLibraryEnabled, 
    isVoiceSearchEnabled,
    updateVoiceSearchEnabled,
    onlineLibraryAccess, 
    updateOnlineLibraryAccess 
  } = useSettings();

  useEffect(() => {
    if (keys) setLocalKeys(keys);
  }, [keys]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        setUserCount(querySnapshot.size);
      } catch (error) {
        console.error("Error fetching users:", error);
        if (error.code === 'permission-denied') {
          setSyncMessage('Permission Denied: Update firestore.rules');
        } else {
          setSyncMessage('Failed to fetch user stats.');
        }
      } finally {
        setLoadingUsers(false);
      }
    };
    if (user?.role === 'admin') {
      fetchStats();
    }
  }, [user]);

  if (isSyncing) {
    // Optional: show a global sync loader if needed, but current UI handles it per-button
  }

  const handleSyncDrive = async () => {
    setIsSyncing(true);
    setSyncMessage('Syncing with Google Drive...');
    try {
      if (refreshSongs) {
        await refreshSongs();
      }
      setSyncMessage('Library synced successfully!');
      showToast('Library synced successfully!');
      setTimeout(() => setSyncMessage(''), 3000);
    } catch {
      setSyncMessage('Sync failed. Check API key.');
      showToast('Sync failed. Check API key.');
      setTimeout(() => setSyncMessage(''), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearCache = () => {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('suman_music_')) {
        localStorage.removeItem(key);
      }
    });
    setSyncMessage('Application cache cleared. Refreshing...');
    showToast('Application cache cleared. Refreshing...');
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  return (
    <div className="h-full overflow-y-auto no-scrollbar pb-32 bg-gradient-to-b from-zinc-950 to-black">
      <div className="max-w-7xl mx-auto p-3 md:p-10">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 mb-8 md:mb-12">
          <div className="flex items-center gap-4 md:gap-5">
            <button 
              onClick={() => navigate('/app/profile')}
              className="w-10 h-10 md:w-12 md:h-12 rounded-xl h-10 md:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/20 transition-all active:scale-95"
            >
              <ArrowLeft className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </button>
            <div>
              <h1 className="text-xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-500 tracking-tight leading-tight">Admin Console</h1>
              <p className="text-zinc-400 font-medium tracking-wide mt-0 md:mt-1 uppercase text-[9px] md:text-xs">SumanMusic Platform Management</p>
            </div>
          </div>
          
          {syncMessage && (
             <div className="px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs md:text-sm font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {syncMessage}
             </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-12">
          <AdminCard 
            icon={Users} 
            title="Registered Users" 
            description="Total accounts on platform" 
            count={userCount} 
            color="blue" 
            isLoading={loadingUsers}
          />
          <AdminCard 
            icon={Music} 
            title="Drive Library" 
            description="Indexed tracks available" 
            count={songs?.length || 0} 
            color="emerald" 
          />
          <AdminCard 
            icon={Activity} 
            title="System Status" 
            description="API connections & latency" 
            count="100%" 
            color="purple" 
          />
          <AdminCard 
            icon={Database} 
            title="Bandwidth" 
            description="Est. streaming egress" 
            count="~12 GB" 
            color="orange" 
          />
        </div>

        {/* Management Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          
          <div className="space-y-4 md:space-y-6">
            <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              Operational Controls
            </h2>
            <div className="bg-white/5 backdrop-blur-md rounded-[1.5rem] md:rounded-3xl p-2 md:p-3 border border-white/10 space-y-2">
              <button 
                onClick={handleSyncDrive}
                disabled={isSyncing}
                className="w-full group flex items-center justify-between px-4 py-3 md:px-5 md:py-4 text-white font-medium hover:bg-white/10 rounded-xl md:rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    {isSyncing ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" /> : <RefreshCw className="w-4 h-4 md:w-5 md:h-5" />}
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-sm md:text-base">Sync Google Drive Library</p>
                    <p className="text-[10px] md:text-xs text-zinc-400">Force index latest metadata</p>
                  </div>
                </div>
              </button>

              <button 
                onClick={handleClearCache}
                className="w-full group flex items-center justify-between px-4 py-3 md:px-5 md:py-4 text-white font-medium hover:bg-white/10 rounded-xl md:rounded-2xl transition-all"
              >
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-sm md:text-base">Purge Local Cache</p>
                    <p className="text-[10px] md:text-xs text-zinc-400">Clear temporary session data</p>
                  </div>
                </div>
              </button>
            </div>
            
            {/* Feature Management */}
            <div className="space-y-4 md:space-y-6">
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
                <Globe className="w-5 h-5 md:w-6 md:h-6 text-purple-400" />
                Feature Management
              </h2>
              <div className="bg-white/5 backdrop-blur-md rounded-[1.5rem] md:rounded-3xl p-4 md:p-6 border border-white/10 space-y-4">
                
                {/* Online Library Toggle */}
                <div className="flex items-center justify-between p-4 bg-purple-500/5 border border-purple-500/20 rounded-2xl">
                  <div className="flex-1 pr-4">
                    <p className="text-sm font-bold text-white leading-tight">Online Library (YouTube)</p>
                    <p className="text-[10px] text-zinc-400 mt-1">Enable or disable global access to YouTube music streaming</p>
                  </div>
                  <button
                    onClick={() => updateOnlineLibraryEnabled(!isOnlineLibraryEnabled)}
                    className={cn(
                      "relative w-11 h-6 rounded-full transition-all duration-300 focus:outline-none flex-shrink-0",
                      isOnlineLibraryEnabled ? "bg-purple-500 shadow-lg shadow-purple-500/20" : "bg-zinc-700"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 left-1 w-4 h-4 rounded-full transition-all duration-300",
                      isOnlineLibraryEnabled ? "translate-x-5 bg-white" : "translate-x-0 bg-zinc-400"
                    )} />
                  </button>
                </div>

                {/* Voice Search Toggle */}
                <div className="flex items-center justify-between p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl">
                  <div className="flex-1 pr-4">
                    <p className="text-sm font-bold text-white leading-tight">Voice Search (AI Feature)</p>
                    <p className="text-[10px] text-zinc-400 mt-1">Enable or disable hands-free search via microphone</p>
                  </div>
                  <button
                    onClick={() => updateVoiceSearchEnabled(!isVoiceSearchEnabled)}
                    className={cn(
                      "relative w-11 h-6 rounded-full transition-all duration-300 focus:outline-none flex-shrink-0",
                      isVoiceSearchEnabled ? "bg-blue-500 shadow-lg shadow-blue-500/20" : "bg-zinc-700"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 left-1 w-4 h-4 rounded-full transition-all duration-300",
                      isVoiceSearchEnabled ? "translate-x-5 bg-white" : "translate-x-0 bg-zinc-400"
                    )} />
                  </button>
                </div>

                {/* Visibility Level */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest pl-1">Visibility Level</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => updateOnlineLibraryAccess('all')}
                      className={cn(
                        "py-3 rounded-xl text-xs font-bold border transition-all",
                        onlineLibraryAccess === 'all' 
                          ? "bg-white/10 border-white/20 text-white" 
                          : "bg-transparent border-white/5 text-zinc-500 hover:border-white/10"
                      )}
                    >
                      All Users
                    </button>
                    <button
                      onClick={() => updateOnlineLibraryAccess('logged_in')}
                      className={cn(
                        "py-3 rounded-xl text-xs font-bold border transition-all",
                        onlineLibraryAccess === 'logged_in' 
                          ? "bg-white/10 border-white/20 text-white" 
                          : "bg-transparent border-white/5 text-zinc-500 hover:border-white/10"
                      )}
                    >
                      Logged-in Only
                    </button>
                  </div>
                  <p className="text-[9px] text-zinc-500 italic pl-1">
                    {onlineLibraryAccess === 'logged_in' 
                      ? "Only registered users can see the Online Library link." 
                      : "Feature is visible to guests and registered users alike."}
                  </p>
                </div>
              </div>
            </div>
          </div>

            {/* Google Drive API Management */}
            <div className="space-y-4 md:space-y-6">
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
                <Database className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
                Google Drive API Management
              </h2>
              <div className="bg-white/5 backdrop-blur-md rounded-[1.5rem] md:rounded-3xl p-4 md:p-6 border border-white/10 space-y-3 md:space-y-4">
                {/* Google Personal Drive Feature Toggle */}
                <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-2xl mb-4">
                  <div>
                    <p className="text-sm font-bold text-white leading-tight">Google Personal Drive Feature</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Toggle global access to Personal MP3s</p>
                  </div>
                  <button
                    onClick={() => updatePersonalDriveEnabled(!isPersonalDriveEnabled)}
                    className={cn(
                      "relative w-11 h-6 rounded-full transition-all duration-300 focus:outline-none flex-shrink-0",
                      isPersonalDriveEnabled ? "bg-primary" : "bg-zinc-700"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 left-1 w-4 h-4 rounded-full transition-all duration-300",
                      isPersonalDriveEnabled ? "translate-x-5 bg-black" : "translate-x-0 bg-white"
                    )} />
                  </button>
                </div>

                {/* Auto API Switching Toggle */}
                <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-2xl mb-2">
                  <div>
                    <p className="text-sm font-bold text-white leading-tight">Auto API Key Rotation</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Switch key automatically on error</p>
                  </div>
                  <button
                    onClick={() => updateAutoSwitchEnabled(!autoSwitchEnabled)}
                    className={cn(
                      "relative w-11 h-6 rounded-full transition-all duration-300 focus:outline-none flex-shrink-0",
                      autoSwitchEnabled ? "bg-primary" : "bg-zinc-700"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 left-1 w-4 h-4 rounded-full transition-all duration-300",
                      autoSwitchEnabled ? "translate-x-5 bg-black" : "translate-x-0 bg-white"
                    )} />
                  </button>
                </div>

                <div className="space-y-3 md:space-y-4">
                  {localKeys.map((key, index) => (
                    <div key={index} className="flex items-center gap-2 md:gap-4">
                      <div className={cn(
                        "w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center font-bold text-[10px] md:text-xs shrink-0",
                        activeIndex === index ? "bg-primary text-black" : "bg-white/10 text-zinc-400"
                      )}>
                        {index + 1}
                      </div>
                      <input 
                        type="text" 
                        value={key}
                        onChange={(e) => {
                          const newKeys = [...localKeys];
                          newKeys[index] = e.target.value;
                          setLocalKeys(newKeys);
                        }}
                        placeholder={`API Key ${index + 1}`}
                        className="flex-1 min-w-0 bg-black/40 border border-white/10 rounded-lg md:rounded-xl px-3 py-2.5 md:px-4 md:py-3 text-xs md:text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
                      />
                      <button 
                        onClick={() => updateActiveIndex(index)}
                        className={cn(
                          "px-3 py-2.5 md:px-4 md:py-3 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold transition-all active:scale-95 shrink-0 min-w-[55px] md:min-w-[65px] text-center",
                          activeIndex === index 
                            ? "bg-primary/20 text-primary border border-primary/30" 
                            : "bg-white/5 text-zinc-400 border border-transparent hover:bg-white/10"
                        )}
                      >
                        {activeIndex === index ? "Active" : "Select"}
                      </button>
                    </div>
                  ))}
                </div>
                
                <button 
                  onClick={async () => {
                    setIsSavingKeys(true);
                    try {
                      await updateKeys(localKeys);
                      setSyncMessage('API keys updated successfully!');
                      showToast('API keys updated successfully!');
                      setTimeout(() => setSyncMessage(''), 3000);
                    } catch {
                      setSyncMessage('Failed to save API keys.');
                      showToast('Failed to save API keys.');
                    } finally {
                      setIsSavingKeys(false);
                    }
                  }}
                  disabled={isSavingKeys}
                  className="w-full mt-4 md:mt-6 py-3.5 md:py-4 rounded-xl md:rounded-2xl bg-white text-black font-black uppercase tracking-widest text-[10px] md:text-xs hover:bg-primary transition-colors disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  {isSavingKeys && <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default AdminPanel;

