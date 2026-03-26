import { useEffect } from 'react';

/**
 * Hook to manage the browser Media Session API.
 * Syncs current song metadata and playback state with the OS media controller.
 */
export const useMediaSession = ({ 
    currentSong, 
    isPlaying, 
    currentTime, 
    duration, 
    play, 
    pause, 
    playNext, 
    playPrevious, 
    seek 
}) => {

    useEffect(() => {
        if ('mediaSession' in navigator && currentSong) {
            navigator.mediaSession.metadata = new window.MediaMetadata({
                title: currentSong.title,
                artist: currentSong.artist,
                album: currentSong.album || '',
                artwork: [
                    { src: currentSong.cover || '/logo512.png', sizes: '96x96', type: 'image/png' },
                    { src: currentSong.cover || '/logo512.png', sizes: '128x128', type: 'image/png' },
                    { src: currentSong.cover || '/logo512.png', sizes: '192x192', type: 'image/png' },
                    { src: currentSong.cover || '/logo512.png', sizes: '256x256', type: 'image/png' },
                    { src: currentSong.cover || '/logo512.png', sizes: '384x384', type: 'image/png' },
                    { src: currentSong.cover || '/logo512.png', sizes: '512x512', type: 'image/png' },
                ],
            });
        }
    }, [currentSong]);


    useEffect(() => {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
        }
    }, [isPlaying]);


    useEffect(() => {
        if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession && duration > 0) {
            try {
                navigator.mediaSession.setPositionState({
                    duration: duration,
                    playbackRate: 1,
                    position: currentTime
                });
            } catch (e) {
                console.warn("Failed to set MediaSession position state", e);
            }
        }
    }, [currentTime, duration]);


    useEffect(() => {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', play);
            navigator.mediaSession.setActionHandler('pause', pause);
            navigator.mediaSession.setActionHandler('previoustrack', playPrevious);
            navigator.mediaSession.setActionHandler('nexttrack', playNext);
            navigator.mediaSession.setActionHandler('seekbackward', () => seek(Math.max(0, currentTime - 10)));
            navigator.mediaSession.setActionHandler('seekforward', () => seek(Math.min(duration, currentTime + 10)));
            
            try {
                navigator.mediaSession.setActionHandler('seekto', (details) => {
                    if (details.seekTime !== undefined) {
                        seek(details.seekTime);
                    }
                });
            } catch {
                console.warn('The "seekto" media session action is not supported.');
            }
        }
        
        return () => {
            if ('mediaSession' in navigator) {
                const actions = ['play', 'pause', 'previoustrack', 'nexttrack', 'seekbackward', 'seekforward', 'seekto'];
                actions.forEach(action => {
                    try {
                        navigator.mediaSession.setActionHandler(action, null);
                    } catch (e) {
                        // ignore
                    }
                });
            }
        };
    }, [play, pause, playPrevious, playNext, seek, currentTime, duration]);
};
