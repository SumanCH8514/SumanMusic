/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { useAuth } from './AuthContext';

const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
  const { user, isGuest } = useAuth();
  const [isOnlineLibraryEnabled, setIsOnlineLibraryEnabled] = useState(true);
  const [isVoiceSearchEnabled, setIsVoiceSearchEnabled] = useState(true);
  const [onlineLibraryAccess, setOnlineLibraryAccess] = useState('all'); // 'all' or 'logged_in'
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Listen to global settings in Firebase
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
        } else if (user?.role === 'admin') {
          // Initialize if not exists
          setDoc(docRef, {
            isOnlineLibraryEnabled: true,
            isVoiceSearchEnabled: true,
            onlineLibraryAccess: 'all'
          }).catch(err => console.error("Failed to init global settings:", err));
        }
        setIsLoading(false);
      },
      (err) => {
        if (err.code === 'permission-denied') {
          console.warn("[Settings] Permission denied for global settings. Defaulting to restricted mode for security.");
          // If we can't read settings, be safe and restrict guest access
          setOnlineLibraryAccess('logged_in');
        } else {
          console.error("[Settings] Global settings error:", err.message);
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
        console.error("Failed to update Online Library toggle:", err);
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
        console.error("Failed to update Voice Search toggle:", err);
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
        console.error("Failed to update Online Library access:", err);
      }
    }
  }, [user]);

  const canAccessOnline = React.useMemo(() => {
    // If feature is totally disabled
    if (!isOnlineLibraryEnabled) return false;
    
    // If feature is restricted to logged-in users
    if (onlineLibraryAccess === 'logged_in') {
      // isGuest or no user or guest uid check as failover
      const guestMatch = isGuest || (user?.uid && String(user.uid).startsWith('guest-'));
      if (guestMatch || !user) return false;
    }
    
    return true;
  }, [isOnlineLibraryEnabled, onlineLibraryAccess, isGuest, user]);

  return (
    <SettingsContext.Provider value={{
      isOnlineLibraryEnabled,
      isVoiceSearchEnabled,
      onlineLibraryAccess,
      updateOnlineLibraryEnabled,
      updateVoiceSearchEnabled,
      updateOnlineLibraryAccess,
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
