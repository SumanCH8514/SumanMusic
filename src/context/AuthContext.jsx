/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  updateProfile,
  GoogleAuthProvider
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from 'firebase/firestore';
import { auth, googleProvider, db } from '../lib/firebase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedGuest = localStorage.getItem('suman_music_guest');
    return savedGuest ? JSON.parse(savedGuest) : null;
  });
  const [isGuest, setIsGuest] = useState(() => !!localStorage.getItem('suman_music_guest'));
  const [loading, setLoading] = useState(true);
  const [personalDriveToken, setPersonalDriveToken] = useState(() => localStorage.getItem('suman_music_drive_token') || null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({ ...currentUser, ...userData });
          } else {
            setUser(currentUser);
          }
        } catch (error) {
          console.error("Error fetching user doc:", error);
          setUser(currentUser);
        }
        setIsGuest(false);
        localStorage.removeItem('suman_music_guest');
      } else {
        const savedGuest = localStorage.getItem('suman_music_guest');
        if (savedGuest) {
          const guestData = JSON.parse(savedGuest);
          setUser(guestData);
          setIsGuest(true);
        } else {
          setUser(null);
          setIsGuest(false);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const connectPersonalDrive = async () => {
    try {
      googleProvider.addScope('https://www.googleapis.com/auth/drive.readonly');
      const result = await signInWithPopup(auth, googleProvider);

      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential && credential.accessToken) {
        setPersonalDriveToken(credential.accessToken);
        localStorage.setItem('suman_music_drive_token', credential.accessToken);
        return credential.accessToken;
      }
      throw new Error("No access token returned from Google.");
    } catch (e) {
      console.error("Personal Drive Connect Error:", e);
      throw e;
    }
  };

  const disconnectPersonalDrive = () => {
    setPersonalDriveToken(null);
    localStorage.removeItem('suman_music_drive_token');
  };

  const loginWithGoogle = async () => {
    localStorage.removeItem('suman_music_guest');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      try {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);

        const userData = {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          lastLogin: serverTimestamp(),
          provider: 'google'
        };

        // Only set role if it's a new user
        if (!userDoc.exists()) {
          userData.role = 'user';
        }

        await setDoc(userRef, userData, { merge: true });
      } catch (fsError) {
        console.warn("Firestore Sync Failed (Check Security Rules):", fsError.message);
      }

      return result;
    } catch (error) {
      console.error("Auth/Login Error:", error);
      throw error;
    }
  };

  const updateUserProfile = async (displayName, photoDataUrl) => {
    if (isGuest) throw new Error("Guests cannot update their profile.");
    if (!auth.currentUser) throw new Error("No user logged in.");

    let newPhotoURL = auth.currentUser.photoURL;
    if (photoDataUrl) {
      newPhotoURL = photoDataUrl;
    }

    // We only update displayName in Firebase Auth because base64 strings exceed the URL length limit
    await updateProfile(auth.currentUser, {
      displayName: displayName || auth.currentUser.displayName
    });

    const newUserData = {
      displayName: displayName || auth.currentUser.displayName,
      photoURL: newPhotoURL
    };

    const userRef = doc(db, 'users', auth.currentUser.uid);
    await setDoc(userRef, newUserData, { merge: true });

    setUser(prev => ({ ...prev, ...newUserData }));
    return newUserData;
  };

  const continueAsGuest = () => {
    const guestUser = {
      displayName: 'Guest User',
      photoURL: '/guest_avatar.png',
      email: 'no-reply@SumanOnline.com',
      role: 'user',
      uid: 'guest-' + Math.random().toString(36).substr(2, 9)
    };
    localStorage.setItem('suman_music_guest', JSON.stringify(guestUser));
    setUser(guestUser);
    setIsGuest(true);
  };

  const logout = async () => {
    await signOut(auth);
    setPersonalDriveToken(null);
    setIsGuest(false);
    setUser(null);
    localStorage.removeItem('suman_music_guest');
    localStorage.removeItem('suman_music_drive_token');
  };

  return (
    <AuthContext.Provider value={{ user, isGuest, loading, loginWithGoogle, connectPersonalDrive, disconnectPersonalDrive, personalDriveToken, setPersonalDriveToken, continueAsGuest, logout, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
