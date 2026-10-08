import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchExternalMetadata } from '../services/metadata';
import { fetchLyrics, parseLrc } from '../services/lyrics';

const isTitleMatch = (searchedTitle, candidateTrackName) => {
    if (!searchedTitle || !candidateTrackName) return false;

    const clean = (s) => s.toLowerCase()
        .replace(/\s*\(.*?\)/g, '')
        .replace(/\s*\[.*?\]/g, '')
        .replace(/[^a-z0-9]/g, '')
        .trim();

    const norm1 = clean(searchedTitle);
    const norm2 = clean(candidateTrackName);

    if (!norm1 || !norm2) return false;
    if (norm1 === norm2) return true;
    if (norm1.includes(norm2) || norm2.includes(norm1)) return true;

    const words1 = searchedTitle.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
    const words2 = candidateTrackName.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);

    if (words1.length > 0 && words2.length > 0) {
        const overlap = words1.filter(w => words2.includes(w));
        if (overlap.length >= Math.min(words1.length, words2.length) * 0.5) return true;
    }

    return false;
};

export const usePlayerMetadata = ({ 
    currentSong, 
    setCurrentSong, 
    setSongs, 
    setQueue, 
    isFullScreen, 
    showToast 
}) => {
    const [lyrics, setLyrics] = useState([]);
    const [isLyricsLoading, setIsLyricsLoading] = useState(false);
    const processedSongs = useRef(new Set());

    const enrichMetadata = useCallback(async (song) => {
        if (!song || !song.id || processedSongs.current.has(song.id)) return;
        processedSongs.current.add(song.id);

        try {
            const metadata = await fetchExternalMetadata(song.artist, song.title);
            if (!metadata) return;

            const updateSong = (s) => {
                const titleMatches = isTitleMatch(s.title, metadata.title);
                const isGenericTitle = !s.title || s.title.toLowerCase().startsWith('track') || s.title.toLowerCase() === 'unknown title';
                const isGenericArtist = !s.artist || s.artist.toLowerCase() === 'unknown artist';

                return {
                    ...s,
                    title: (titleMatches || isGenericTitle) ? (metadata.title || s.title) : s.title,
                    artist: (titleMatches || isGenericArtist) ? (metadata.artist || s.artist) : s.artist,
                    album: metadata.album || s.album,
                    year: metadata.year || s.year,
                    genre: metadata.genre || s.genre,
                    cover: metadata.cover || s.cover,
                    thumbnail: metadata.thumbnail || s.thumbnail
                };
            };

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
    }, [currentSong, isFullScreen, showToast]);

    return {
        lyrics,
        isLyricsLoading,
        enrichMetadata
    };
};
