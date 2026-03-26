import { useState, useEffect, useCallback } from 'react';
import { fetchExternalMetadata } from '../services/metadata';
import { fetchLyrics, parseLrc } from '../services/lyrics';

/**
 * Hook to manage metadata enrichment and lyrics fetching for songs.
 */
export const usePlayerMetadata = ({ 
    currentSong, 
    setCurrentSong, 
    songs, 
    setSongs, 
    setQueue, 
    isFullScreen, 
    showToast 
}) => {
    const [lyrics, setLyrics] = useState([]);
    const [isLyricsLoading, setIsLyricsLoading] = useState(false);


    const enrichMetadata = useCallback(async (song) => {
        try {
            const metadata = await fetchExternalMetadata(song.artist, song.title);
            if (!metadata) return;

            const updateSong = (s) => ({
                ...s,
                title: metadata.title || s.title,
                artist: metadata.artist || s.artist,
                album: metadata.album,
                year: metadata.year,
                genre: metadata.genre,
                cover: metadata.cover || s.cover,
                thumbnail: metadata.thumbnail || s.thumbnail
            });

            setSongs(prev => {
                const idx = prev.findIndex(s => s.id === song.id);
                if (idx === -1) return prev;
                const updated = [...prev];
                updated[idx] = updateSong(updated[idx]);
                return updated;
            });

            setQueue(prev => {
                const idx = prev.findIndex(s => s.id === song.id);
                if (idx === -1) return prev;
                const updated = [...prev];
                updated[idx] = updateSong(updated[idx]);
                return updated;
            });

            setCurrentSong(prev => {
                if (prev?.id === song.id) return updateSong(prev);
                return prev;
            });
        } catch (err) {
            console.error("Failed to enrich metadata for song:", song.title, err);
        }
    }, [setSongs, setQueue, setCurrentSong]);


    useEffect(() => {
        if (!currentSong || currentSong.isPlaceholder || !isFullScreen) {
            setLyrics([]);
            return;
        }

        let ignore = false;
        setLyrics([]);

        const loadLyrics = async () => {
            setIsLyricsLoading(true);
            try {
                const data = await fetchLyrics(currentSong.artist, currentSong.title, currentSong.album);
                if (ignore) return;

                if (data && data.syncedLyrics) {
                    setLyrics(parseLrc(data.syncedLyrics));
                } else if (data && data.plainLyrics) {
                    setLyrics([{ time: 0, text: data.plainLyrics }]);
                } else {
                    setLyrics([]);
                    if (!ignore) showToast("No Lyrics Found for this Song", "info");
                }
            } catch (err) {
                console.error("Failed to load lyrics:", err);
                if (!ignore) setLyrics([]);
            } finally {
                if (!ignore) setIsLyricsLoading(false);
            }
        };

        loadLyrics();
        return () => {
            ignore = true;
        };
    }, [currentSong?.id, isFullScreen, showToast]);

    return {
        lyrics,
        isLyricsLoading,
        enrichMetadata
    };
};
