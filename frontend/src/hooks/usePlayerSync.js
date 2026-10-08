import { useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';

export const usePlayerSync = ({ 
    user, 
    isGuest, 
    likedSongs, 
    setLikedSongs, 
    currentSong, 
    queue, 
    currentTime, 
    isPlaying,
    setSongs,
    isShuffle,
    repeatMode,
    librarySource,
    pause
}) => {
    const prevUserUid = useRef(user?.uid);
    const lastSavedTimeRef = useRef(0);

    useEffect(() => {
        if (!user || isGuest) return;

        const userRef = doc(db, 'users', user.uid);
        
        const syncInitial = async () => {
            try {
                const docSnap = await getDoc(userRef);
                let cloudLikedIds = [];
                if (docSnap.exists() && docSnap.data().likedSongs) {
                    cloudLikedIds = docSnap.data().likedSongs.map(item => 
                        typeof item === 'string' ? item : item.id
                    );
                }

                const merged = Array.from(new Set([...cloudLikedIds, ...likedSongs]));
                
                if (merged.length > cloudLikedIds.length) {
                    await setDoc(userRef, { likedSongs: merged }, { merge: true });
                }
                setLikedSongs(merged);
            } catch (err) {
                console.error("Error syncing favorites with cloud:", err);
            }
        };

        syncInitial();

        const unsubscribe = onSnapshot(userRef, (doc) => {
            if (doc.exists() && doc.data().likedSongs) {
                const cloudIds = doc.data().likedSongs.map(item => 
                    typeof item === 'string' ? item : item.id
                );
                setLikedSongs(prev => {
                    if (JSON.stringify(prev) === JSON.stringify(cloudIds)) return prev;
                    return cloudIds;
                });
            }
        });

        return () => unsubscribe();
    }, [user?.uid, isGuest]);

    useEffect(() => {
        localStorage.setItem('suman_music_liked', JSON.stringify(likedSongs));
    }, [likedSongs]);

    useEffect(() => {
        if (currentSong?.id) {
            localStorage.setItem('suman_music_last_song_id', currentSong.id);
            try {
                localStorage.setItem('suman_music_last_song_obj', JSON.stringify(currentSong));
            } catch {}
        }
    }, [currentSong]);

    useEffect(() => {
        if (queue && queue.length > 0) {
            const ids = queue.map(s => s.id).filter(id => id && !String(id).startsWith('placeholder'));
            if (ids.length > 0) {
                localStorage.setItem('suman_music_last_queue_ids', JSON.stringify(ids));
                try {
                    localStorage.setItem('suman_music_last_queue_obj', JSON.stringify(queue.slice(0, 50)));
                } catch {}
            }
        }
    }, [queue]);

    useEffect(() => {
        if (currentTime > 0) {
            if (!isPlaying || Math.abs(currentTime - lastSavedTimeRef.current) >= 1) {
                lastSavedTimeRef.current = currentTime;
                localStorage.setItem('suman_music_last_time', currentTime.toString());
            }
        }
    }, [currentTime, isPlaying]);

    useEffect(() => {
        const handleBeforeUnload = () => {
            if (currentTime > 0) {
                localStorage.setItem('suman_music_last_time', currentTime.toString());
            }
            if (currentSong?.id) {
                localStorage.setItem('suman_music_last_song_id', currentSong.id);
                try {
                    localStorage.setItem('suman_music_last_song_obj', JSON.stringify(currentSong));
                } catch {}
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [currentTime, currentSong]);

    useEffect(() => {
        localStorage.setItem('suman_music_shuffle', isShuffle.toString());
    }, [isShuffle]);

    useEffect(() => {
        localStorage.setItem('suman_music_library_source', librarySource);
    }, [librarySource]);

    useEffect(() => {
        localStorage.setItem('suman_music_repeat', repeatMode);
    }, [repeatMode]);

    useEffect(() => {
        if (prevUserUid.current !== user?.uid) {
            if (prevUserUid.current) {
                pause();
                setSongs([]);
            }
            prevUserUid.current = user?.uid;
        }
    }, [user?.uid, pause, setSongs]);
};
