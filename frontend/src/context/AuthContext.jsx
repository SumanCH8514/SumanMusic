import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithRedirect,
  getRedirectResult,
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

const isLocalhost = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.'));

const syncUserToFirestore = async (firebaseUser) => {
  try {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userRef);

    const userData = {
      uid: firebaseUser.uid,
      displayName: firebaseUser.displayName,
      email: firebaseUser.email,
      photoURL: firebaseUser.photoURL,
      lastLogin: serverTimestamp(),
      provider: 'google'
    };

    if (!userDoc.exists()) {
      userData.role = 'user';
    }

    await setDoc(userRef, userData, { merge: true });
  } catch (fsError) {
    console.warn("Firestore sync warning:", fsError.message);
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedGuest = localStorage.getItem('suman_music_guest');
    return savedGuest ? JSON.parse(savedGuest) : null;
  });
  const [isGuest, setIsGuest] = useState(() => !!localStorage.getItem('suman_music_guest'));
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [personalDriveToken, setPersonalDriveToken] = useState(() => localStorage.getItem('suman_music_drive_token') || null);
  const [youtubeAccessToken, setYoutubeAccessToken] = useState(() => localStorage.getItem('suman_music_youtube_token') || null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        sessionStorage.removeItem('suman_google_redirect');
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setUser({ ...currentUser, ...userDoc.data() });
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
      setIsRedirecting(false);
    });

    getRedirectResult(auth)
      .then(async (result) => {
        if (result && result.user) {
          sessionStorage.removeItem('suman_google_redirect');
          const credential = GoogleAuthProvider.credentialFromResult(result);
          if (credential && credential.accessToken) {
            setYoutubeAccessToken(credential.accessToken);
            localStorage.setItem('suman_music_youtube_token', credential.accessToken);
          }
          setUser(result.user);
          await syncUserToFirestore(result.user);
        } else {
          sessionStorage.removeItem('suman_google_redirect');
        }
      })
      .catch((redirectErr) => {
        sessionStorage.removeItem('suman_google_redirect');
        console.error("Redirect sign-in error:", redirectErr);
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

  const connectYouTube = async () => {
    try {
      googleProvider.addScope('https://www.googleapis.com/auth/youtube.readonly');
      const result = await signInWithPopup(auth, googleProvider);

      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential && credential.accessToken) {
        setYoutubeAccessToken(credential.accessToken);
        localStorage.setItem('suman_music_youtube_token', credential.accessToken);
        return credential.accessToken;
      }
      throw new Error("No access token returned from Google.");
    } catch (e) {
      console.error("YouTube Connect Error:", e);
      throw e;
    }
  };

  const disconnectYouTube = () => {
    setYoutubeAccessToken(null);
    localStorage.removeItem('suman_music_youtube_token');
  };

  const loginWithGoogle = async () => {
    localStorage.removeItem('suman_music_guest');
    setAuthError(null);
    setIsRedirecting(true);

    googleProvider.addScope('https://www.googleapis.com/auth/youtube.readonly');

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential && credential.accessToken) {
        setYoutubeAccessToken(credential.accessToken);
        localStorage.setItem('suman_music_youtube_token', credential.accessToken);
      }
      setUser(result.user);
      await syncUserToFirestore(result.user);
      setIsRedirecting(false);
      return result;
    } catch (error) {
      if (error.code === 'auth/popup-blocked') {
        try {
          sessionStorage.setItem('suman_google_redirect', 'true');
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr) {
          sessionStorage.removeItem('suman_google_redirect');
          setIsRedirecting(false);
          setAuthError(redirectErr.message || 'Failed to start Google sign-in.');
          throw redirectErr;
        }
      }
      setIsRedirecting(false);
      if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
        setAuthError(error.message || 'Failed to sign in with Google.');
      }
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
    setYoutubeAccessToken(null);
    setIsGuest(false);
    setUser(null);
    localStorage.removeItem('suman_music_guest');
    localStorage.removeItem('suman_music_drive_token');
    localStorage.removeItem('suman_music_youtube_token');
  };

  return (
    <AuthContext.Provider value={{
      user,
      isGuest,
      loading,
      authError,
      setAuthError,
      isRedirecting,
      loginWithGoogle,
      connectPersonalDrive,
      disconnectPersonalDrive,
      personalDriveToken,
      setPersonalDriveToken,
      connectYouTube,
      disconnectYouTube,
      youtubeAccessToken,
      setYoutubeAccessToken,
      continueAsGuest,
      logout,
      updateUserProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
