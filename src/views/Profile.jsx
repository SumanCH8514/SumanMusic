import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/usePlayer';
import { useGDrive } from '../context/GDriveContext';
import { User, Mail, Shield, LogOut, ChevronRight, Bell, Zap, Image as ImageIcon, Camera, Loader2, Edit2, HardDrive, Link as LinkIcon, Check, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';

const SelectionModal = ({ isOpen, onClose, title, options, selectedValue, onSelect }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#151515] border border-white/10 rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h3 className="font-black text-white">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>
        <div className="p-2 flex flex-col gap-1">
          {options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onSelect(opt.id)}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors text-left"
            >
              <div>
                <span className={cn("block font-bold text-sm", selectedValue === opt.id ? "text-primary" : "text-white")}>
                  {opt.label}
                </span>
                {opt.desc && <span className="block text-[10px] text-zinc-500 font-medium mt-0.5">{opt.desc}</span>}
              </div>
              {selectedValue === opt.id && <Check className="w-4 h-4 text-primary shrink-0" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const SettingsOption = ({ icon: Icon, label, value, onClick, danger }) => (
  <div 
    onClick={onClick}
    className={cn(
      "flex items-center justify-between p-3 md:p-4 rounded-xl transition-all cursor-pointer group backdrop-blur-md",
      danger ? "hover:bg-red-500/10 border border-red-500/10" : "hover:bg-bg-surface/80 bg-bg-surface/40 border border-border-main/5"
    )}
  >
    <div className="flex items-center gap-3 md:gap-4">
      <div className={cn(
        "w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center transition-colors shrink-0",
        danger ? "bg-red-500/20 text-red-500" : "bg-bg-base text-text-secondary group-hover:text-text-primary"
      )}>
        <Icon className="w-4 h-4 md:w-5 md:h-5" />
      </div>
      <div>
        <p className={cn("text-xs md:text-sm font-bold", danger ? "text-red-500" : "text-text-primary")}>{label}</p>
        {value && <p className="text-[10px] md:text-xs text-text-secondary mt-0.5">{value}</p>}
      </div>
    </div>
    <ChevronRight className={cn("w-4 h-4 md:w-5 md:h-5 transition-transform group-hover:translate-x-1", danger ? "text-red-500/50" : "text-text-secondary/50")} />
  </div>
);

const Profile = () => {
  const { user, isGuest, logout, updateUserProfile, connectPersonalDrive, personalDriveToken } = useAuth();
  const { isPersonalDriveEnabled } = useGDrive();
  const { theme, toggleTheme, setTheme } = useTheme();
  const { librarySource, setLibrarySource, refreshSongs } = usePlayer();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPhotoURL, setEditPhotoURL] = useState('');
  const [editPhotoBase64, setEditPhotoBase64] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  const handleEditClick = () => {
    if (isGuest) return showToast("Guests cannot edit profile.");
    setEditName(user?.displayName || '');
    setEditPhotoURL(user?.photoURL || '');
    setEditPhotoBase64(null);
    setIsEditing(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast("Image must be less than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const SIZE = 250;
          canvas.width = SIZE;
          canvas.height = SIZE;
          
          const minDim = Math.min(img.width, img.height);
          const startX = (img.width - minDim) / 2;
          const startY = (img.height - minDim) / 2;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, SIZE, SIZE);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setEditPhotoBase64(dataUrl);
          setEditPhotoURL(dataUrl);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!editName.trim()) return showToast("Display name cannot be empty");
    setIsSaving(true);
    try {
      await updateUserProfile(editName.trim(), editPhotoBase64);
      showToast("Profile updated successfully");
      setIsEditing(false);
    } catch (e) {
      console.error(e);
      showToast(e.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnectDrive = async () => {
    try {
      await connectPersonalDrive();
      showToast("Personal Google Drive Connected!", "success");
      setLibrarySource('hybrid');
      setTimeout(() => refreshSongs(), 500);
    } catch (err) {
      showToast("Failed to connect Google Drive.", "error");
    }
  };

  const openSourceModal = () => {
    if (isGuest) return showToast("Guests cannot access personal drive features.");
    
    if (librarySource === 'inbuilt' && !personalDriveToken) {
       showToast("Please connect your Google Drive first.");
       handleConnectDrive();
       return;
    }

    setActiveModal('source');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="max-w-2xl mx-auto py-6 md:py-8 px-4 flex flex-col gap-6 md:gap-8 pb-32 md:pb-48">
      <header className="flex flex-col items-center text-center gap-3 md:gap-4">
        {isEditing ? (
          <div className="flex flex-col items-center gap-4 md:gap-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-full bg-bg-surface border-4 border-primary/50 overflow-hidden shadow-2xl flex items-center justify-center">
                {editPhotoURL ? (
                  <img src={editPhotoURL} alt="edit-profile" className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary group-hover:bg-primary/80 transition-colors">
                    <span className="text-black font-black text-3xl md:text-4xl">{editName.charAt(0) || 'U'}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-6 h-6 md:w-8 md:h-8 text-white" />
                </div>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            </div>
            <div className="w-full max-w-xs space-y-3 md:space-y-4">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Display Name"
                className="w-full bg-black/40 border border-white/10 rounded-lg md:rounded-xl px-3 py-2.5 md:px-4 md:py-3 text-center text-base md:text-lg font-bold text-white focus:outline-none focus:border-primary/50 transition-colors"
              />
              <div className="flex items-center gap-2 pt-1 md:pt-2">
                <button 
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                  className="flex-1 px-3 py-2.5 md:px-4 md:py-3 rounded-lg md:rounded-xl border border-white/10 text-white font-bold text-xs md:text-sm hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 px-3 py-2.5 md:px-4 md:py-3 rounded-lg md:rounded-xl bg-primary text-black font-black text-xs md:text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving && <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" />}
                  Save
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full bg-bg-surface border-4 border-border-main/10 overflow-hidden shadow-2xl flex items-center justify-center">
                {user?.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    referrerPolicy="no-referrer"
                    alt="profile" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div 
                  className="w-full h-full flex items-center justify-center bg-primary"
                  style={{ display: user?.photoURL ? 'none' : 'flex' }}
                >
                  <span className="text-black font-black text-2xl md:text-3xl">{user?.displayName?.charAt(0) || 'G'}</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <h2 className="text-xl md:text-2xl font-black text-text-primary flex items-center justify-center gap-2">
                {user?.displayName || 'Guest User'}
                {!isGuest && (
                  <button onClick={handleEditClick} className="p-1 md:p-1.5 rounded-md md:rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-zinc-400 hover:text-white group shrink-0">
                    <Edit2 className="w-3.5 h-3.5 md:w-4 md:h-4 group-hover:scale-110 transition-transform" />
                  </button>
                )}
              </h2>
              <p className="text-text-secondary font-medium text-xs md:text-sm mt-0.5">{user?.email || 'No email associated'}</p>
            </div>
            <div className="inline-flex items-center gap-1.5 md:gap-2 px-3 py-1 md:px-4 md:py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <Zap className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary fill-current" />
              <span className="text-[10px] md:text-xs font-black text-primary uppercase tracking-widest">{isGuest ? 'Guest Explorer' : 'Premium Member'}</span>
            </div>
          </>
        )}
      </header>

      <section className="space-y-4 md:space-y-6">
        <div>
          <h3 className="text-[10px] md:text-xs font-black text-text-secondary lowercase tracking-[0.2em] mb-3 md:mb-4 ml-2 opacity-50">Personal Info</h3>
          <div className="flex flex-col gap-2.5 md:gap-3">
            <SettingsOption 
              icon={User} 
              label="Display Name" 
              value={user?.displayName} 
              onClick={() => {
                handleEditClick();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
            <SettingsOption icon={Mail} label="Email Address" value={user?.email} />
          </div>
        </div>

        <div>
          <h3 className="text-[10px] md:text-xs font-black text-text-secondary lowercase tracking-[0.2em] mb-3 md:mb-4 ml-2 opacity-50">App Settings</h3>
          <div className="flex flex-col gap-2.5 md:gap-3">
            <SettingsOption 
              icon={ImageIcon} 
              label="Interface Theme" 
              value={theme === 'dark' ? "Dark Mode (OLED)" : theme === 'light' ? "Light Mode (Premium)" : "System Default"} 
              onClick={() => setActiveModal('theme')}
            />
            <SettingsOption 
              icon={HardDrive} 
              label="Content Library Source" 
              value={librarySource === 'hybrid' ? 'Hybrid (SumanMusic + Personal)' : librarySource === 'personal' ? 'Personal Drive Only' : 'SumanMusic Only'} 
              onClick={openSourceModal}
            />
            {isPersonalDriveEnabled && !personalDriveToken && !isGuest && (
              <SettingsOption 
                icon={LinkIcon} 
                label="Connect Google Drive" 
                value="Link your account to play personal MP3s" 
                onClick={handleConnectDrive}
              />
            )}
            <SettingsOption icon={Bell} label="Notifications" value="All Alerts On" />
          </div>
        </div>

        {user?.role === 'admin' && (
          <div>
            <h3 className="text-[10px] md:text-xs font-black text-primary uppercase tracking-[0.2em] mb-3 md:mb-4 ml-2">Administration</h3>
            <div className="flex flex-col gap-2.5 md:gap-3 border border-primary/20 rounded-xl p-1 bg-primary/5">
              <SettingsOption 
                icon={Shield} 
                label="Admin Panel" 
                value="Manage users, content, and platform settings" 
                onClick={() => navigate('/app/admin-panel')}
              />
            </div>
          </div>
        )}

        <div>
          <h3 className="text-[10px] md:text-xs font-black text-text-secondary lowercase tracking-[0.2em] mb-3 md:mb-4 ml-2 opacity-50">Danger Zone</h3>
          <div className="flex flex-col gap-3">
            <SettingsOption 
              icon={LogOut} 
              label="Sign Out" 
              value="Securely end your session" 
              danger 
              onClick={handleLogout}
            />
          </div>
        </div>
      </section>

      <footer className="text-center pb-8">
        <p className="text-[10px] font-black tracking-widest text-text-secondary/50 uppercase">Version 1.0.4 • SumanMusic Beta</p>
        <div className="flex items-center justify-center gap-4 mt-3 text-xs text-zinc-500 font-bold">
          <button onClick={() => navigate('/privacy-policy')} className="hover:text-primary transition-colors">Privacy Policy</button>
          <span>•</span>
          <button onClick={() => navigate('/terms-of-service')} className="hover:text-primary transition-colors">Terms of Service</button>
        </div>
      </footer>

      <SelectionModal 
        isOpen={activeModal === 'theme'} 
        onClose={() => setActiveModal(null)}
        title="Select Interface Theme"
        selectedValue={theme}
        options={[
          { id: 'dark', label: 'Dark Mode (OLED)' },
          { id: 'light', label: 'Light Mode (Premium)' },
          { id: 'system', label: 'System Default' }
        ]}
        onSelect={(id) => {
          setTheme(id);
          setActiveModal(null);
        }}
      />

      <SelectionModal 
        isOpen={activeModal === 'source'} 
        onClose={() => setActiveModal(null)}
        title="Select Content Library"
        selectedValue={librarySource}
        options={[
          { id: 'inbuilt', label: 'SumanMusic Only', desc: 'Play carefully curated inbuilt tracks' },
          ...(isPersonalDriveEnabled ? [
            { id: 'personal', label: 'Personal Drive Only', desc: 'Play only your own Google Drive MP3s' },
            { id: 'hybrid', label: 'Hybrid Mode', desc: 'Mix both SumanMusic and Personal catalogs' }
          ] : [])
        ]}
        onSelect={(id) => {
          setLibrarySource(id);
          setActiveModal(null);
          showToast(`Library shifted to ${id.toUpperCase()} mode.`);
          setTimeout(() => refreshSongs(), 100);
        }}
      />
    </div>
  );
};

export default Profile;
