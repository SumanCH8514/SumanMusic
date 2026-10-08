import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { setMetadataConfig, clearMetadataCache } from '../services/metadata';
import { clearArtistCache } from '../services/artistService';

const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
  const { user, isGuest } = useAuth();
  const [isOnlineLibraryEnabled, setIsOnlineLibraryEnabled] = useState(true);
  const [isVoiceSearchEnabled, setIsVoiceSearchEnabled] = useState(true);
  const [onlineLibraryAccess, setOnlineLibraryAccess] = useState('all');
  
  const [metadataProvider, setMetadataProvider] = useState(() => {
    try {
      return localStorage.getItem('suman_meta_provider') || 'auto';
    } catch {
      return 'auto';
    }
  });

  const [metadataFallback, setMetadataFallback] = useState(() => {
    try {
      const saved = localStorage.getItem('suman_meta_fallback');
      return saved !== null ? saved !== 'false' : true;
    } catch {
      return true;
    }
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setMetadataConfig({ provider: metadataProvider, fallback: metadataFallback });
  }, [metadataProvider, metadataFallback]);

  useEffect(() => {
    const docRef = doc(db, 'settings', 'global');

    const unsubscribe = onSnapshot(docRef, 
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.isOnlineLibraryEnabled !== undefined) {
            setIsOnlineLibraryEnabled(data.isOnlineLibraryEnabled);
          }
          if (data.isVoiceSearchEnabled !== undefined) {
            setIsVoiceSearchEnabled(data.isVoiceSearchEnabled);
          }
          if (data.onlineLibraryAccess !== undefined) {
            setOnlineLibraryAccess(data.onlineLibraryAccess);
          }
          if (data.metadataProvider !== undefined) {
            setMetadataProvider(data.metadataProvider);
            try { localStorage.setItem('suman_meta_provider', data.metadataProvider); } catch {}
          }
          if (data.metadataFallback !== undefined) {
            setMetadataFallback(data.metadataFallback);
            try { localStorage.setItem('suman_meta_fallback', String(data.metadataFallback)); } catch {}
          }
        } else if (user?.role === 'admin') {
          setDoc(docRef, {
            isOnlineLibraryEnabled: true,
            isVoiceSearchEnabled: true,
            onlineLibraryAccess: 'all',
            metadataProvider: 'auto',
            metadataFallback: true
          }).catch(err => console.error(err));
        }
        setIsLoading(false);
      },
      (err) => {
        if (err.code === 'permission-denied') {
          setOnlineLibraryAccess('logged_in');
        } else {
          console.error(err.message);
        }
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const updateOnlineLibraryEnabled = useCallback(async (enabled) => {
    setIsOnlineLibraryEnabled(enabled);
    if (user?.role === 'admin') {
      try {
        const docRef = doc(db, 'settings', 'global');
        await setDoc(docRef, { isOnlineLibraryEnabled: enabled }, { merge: true });
      } catch (err) {
        console.error(err);
      }
    }
  }, [user]);

  const updateVoiceSearchEnabled = useCallback(async (enabled) => {
    setIsVoiceSearchEnabled(enabled);
    if (user?.role === 'admin') {
      try {
        const docRef = doc(db, 'settings', 'global');
        await setDoc(docRef, { isVoiceSearchEnabled: enabled }, { merge: true });
      } catch (err) {
        console.error(err);
      }
    }
  }, [user]);

  const updateOnlineLibraryAccess = useCallback(async (access) => {
    setOnlineLibraryAccess(access);
    if (user?.role === 'admin') {
      try {
        const docRef = doc(db, 'settings', 'global');
        await setDoc(docRef, { onlineLibraryAccess: access }, { merge: true });
      } catch (err) {
        console.error(err);
      }
    }
  }, [user]);

  const updateMetadataProvider = useCallback(async (provider) => {
    setMetadataProvider(provider);
    try { localStorage.setItem('suman_meta_provider', provider); } catch {}
    setMetadataConfig({ provider });
    if (user?.role === 'admin') {
      try {
        const docRef = doc(db, 'settings', 'global');
        await setDoc(docRef, { metadataProvider: provider }, { merge: true });
      } catch (err) {
        console.error(err);
      }
    }
  }, [user]);

  const updateMetadataFallback = useCallback(async (fallback) => {
    setMetadataFallback(fallback);
    try { localStorage.setItem('suman_meta_fallback', String(fallback)); } catch {}
    setMetadataConfig({ fallback });
    if (user?.role === 'admin') {
      try {
        const docRef = doc(db, 'settings', 'global');
        await setDoc(docRef, { metadataFallback: fallback }, { merge: true });
      } catch (err) {
        console.error(err);
      }
    }
  }, [user]);

  const canAccessOnline = React.useMemo(() => {
    if (!isOnlineLibraryEnabled) return false;
    
    if (onlineLibraryAccess === 'logged_in') {
      const guestMatch = isGuest || (user?.uid && String(user.uid).startsWith('guest-'));
      if (guestMatch || !user) return false;
    }
    
    return true;
  }, [isOnlineLibraryEnabled, onlineLibraryAccess, isGuest, user]);

  const handleClearCaches = useCallback(() => {
    clearMetadataCache();
    clearArtistCache();
  }, []);

  return (
    <SettingsContext.Provider value={{
      isOnlineLibraryEnabled,
      isVoiceSearchEnabled,
      onlineLibraryAccess,
      metadataProvider,
      metadataFallback,
      updateOnlineLibraryEnabled,
      updateVoiceSearchEnabled,
      updateOnlineLibraryAccess,
      updateMetadataProvider,
      updateMetadataFallback,
      clearMetadataCache: handleClearCaches,
      canAccessOnline,
      isLoading
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within a SettingsProvider');
  return context;
};
