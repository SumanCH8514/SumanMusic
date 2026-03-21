import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const GDriveContext = createContext(null);

const DEFAULT_KEYS = [
  import.meta.env.VITE_GDRIVE_API_KEY_1 || "",
  import.meta.env.VITE_GDRIVE_API_KEY_2 || "",
  import.meta.env.VITE_GDRIVE_API_KEY_3 || "",
  import.meta.env.VITE_GDRIVE_API_KEY_4 || ""
];

export const GDriveProvider = ({ children }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [keys, setKeys] = useState(DEFAULT_KEYS);
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoSwitchEnabled, setAutoSwitchEnabled] = useState(true);
  const [isPersonalDriveEnabled, setIsPersonalDriveEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const docRef = doc(db, 'settings', 'gdrive_api');

    const unsubscribe = onSnapshot(docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.keys) setKeys(data.keys);
          if (data.activeIndex !== undefined) setActiveIndex(data.activeIndex);
          if (data.autoSwitchEnabled !== undefined) setAutoSwitchEnabled(data.autoSwitchEnabled);
          if (data.isPersonalDriveEnabled !== undefined) setIsPersonalDriveEnabled(data.isPersonalDriveEnabled);
        } else if (user?.role === 'admin') {
          setDoc(docRef, {
            keys: DEFAULT_KEYS,
            activeIndex: 0,
            autoSwitchEnabled: true,
            isPersonalDriveEnabled: true
          }).catch(err => {
            console.error("Failed to initialize GDrive settings:", err);
          });
        }
        setIsLoading(false);
      },
      (error) => {
        console.warn("GDrive settings read permission denied or error. Using defaults.", error.message);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const updateActiveIndex = async (index) => {
    setActiveIndex(index);
    if (user?.role === 'admin') {
      try {
        const docRef = doc(db, 'settings', 'gdrive_api');
        await setDoc(docRef, { activeIndex: index }, { merge: true });
      } catch (error) {
        console.error("Failed to sync GDrive active index to Firestore:", error);
      }
    }
  };

  const updateKeys = async (newKeys) => {
    setKeys(newKeys);
    if (user?.role === 'admin') {
      try {
        const docRef = doc(db, 'settings', 'gdrive_api');
        await setDoc(docRef, { keys: newKeys }, { merge: true });
      } catch (error) {
        console.error("Failed to sync GDrive keys to Firestore:", error);
      }
    }
  };

  const updateAutoSwitchEnabled = async (enabled) => {
    setAutoSwitchEnabled(enabled);
    if (user?.role === 'admin') {
      try {
        const docRef = doc(db, 'settings', 'gdrive_api');
        await setDoc(docRef, { autoSwitchEnabled: enabled }, { merge: true });
      } catch (error) {
        console.error("Failed to sync auto-switch setting to Firestore:", error);
      }
    }
  };

  const updatePersonalDriveEnabled = async (enabled) => {
    setIsPersonalDriveEnabled(enabled);
    if (user?.role === 'admin') {
      try {
        const docRef = doc(db, 'settings', 'gdrive_api');
        await setDoc(docRef, { isPersonalDriveEnabled: enabled }, { merge: true });
      } catch (error) {
        console.error("Failed to sync personal drive setting to Firestore:", error);
      }
    }
  };

  const rotationCountRef = useRef(0);
  const lastFailoverRef = useRef(0);

  const switchKey = useCallback(async () => {
    const validKeys = keys.filter(k => k && k.trim() !== "");
    if (validKeys.length === 0) {
      showToast("No Google Drive API keys configured.", "error");
      return;
    }

    if (rotationCountRef.current >= validKeys.length) {
      showToast("All API keys have been tried. Please check your GDrive permissions.", "error");
      return;
    }

    const nextIndex = (activeIndex + 1) % validKeys.length;
    rotationCountRef.current += 1;


    await updateActiveIndex(nextIndex);
    showToast(`API Key switched automatically (Key #${nextIndex + 1})`, "error");
  }, [activeIndex, keys, showToast, user]);

  useEffect(() => {
    const handleFailover = () => {
      if (autoSwitchEnabled) {
        showToast("Playback Error (403): Switching API Key...", "error");
        switchKey();
      } else {
        showToast("Playback Error (403): Please try after 1 hours!", "error");
      }
    };
    window.addEventListener('gdrive-key-failover', handleFailover);
    return () => window.removeEventListener('gdrive-key-failover', handleFailover);
  }, [switchKey, autoSwitchEnabled, showToast]);

  const activeKey = keys[activeIndex] || keys[0];

  return (
    <GDriveContext.Provider value={{
      activeKey,
      keys,
      activeIndex,
      updateActiveIndex,
      updateKeys,
      switchKey,
      autoSwitchEnabled,
      updateAutoSwitchEnabled,
      isPersonalDriveEnabled,
      updatePersonalDriveEnabled,
      isLoading
    }}>
      {children}
    </GDriveContext.Provider>
  );
};

export const useGDrive = () => {
  const context = useContext(GDriveContext);
  if (!context) throw new Error('useGDrive must be used within a GDriveProvider');
  return context;
};
