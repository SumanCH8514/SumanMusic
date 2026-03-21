import { useState, useEffect, useRef, useCallback } from 'react';

export const useAudio = () => {
  const audioRef = useRef(new Audio());
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('suman_music_volume');
    return saved !== null ? parseFloat(saved) : 1.0;
  });
  const [isBuffering, setIsBuffering] = useState(false);

  useEffect(() => {
    localStorage.setItem('suman_music_volume', volume.toString());
  }, [volume]);

  const setSource = useCallback((url) => {
    if (!url) return;
    
    setIsBuffering(true);
    
    audioRef.current.src = url;
    audioRef.current.load();
  }, []);

  const play = useCallback(() => {
    const playPromise = audioRef.current.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
        })
        .catch(e => {
          console.warn("Playback prevented by browser policy:", e);
          setIsPlaying(false);
        });
    }
  }, []);

  const pause = useCallback(() => {
    audioRef.current.pause();
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, pause, play]);

  const seek = useCallback((percent) => {
    if (audioRef.current.duration) {
      const time = (percent / 100) * audioRef.current.duration;
      audioRef.current.currentTime = time;
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    const handleWaiting = () => {
      setIsBuffering(true);
    };

    const handlePlaying = () => {
      setIsBuffering(false);
      setIsPlaying(true);
    };

    const handleCanPlay = () => {
      setIsBuffering(false);
    };

    const handleError = (e) => {
      console.error("Audio error:", e);
      setIsBuffering(false);
      setIsPlaying(false);
      
      // Dispatch a custom event for the GDriveContext to catch and rotate keys
      window.dispatchEvent(new CustomEvent('gdrive-key-failover'));
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);

    // High-precision polling for smooth UI updates
    let rafId;
    const poll = () => {
      if (!audio.paused) {
        setCurrentTime(audio.currentTime);
        if (audio.duration) {
          setProgress((audio.currentTime / audio.duration) * 100);
        }
      }
      rafId = requestAnimationFrame(poll);
    };
    rafId = requestAnimationFrame(poll);

    return () => {
      cancelAnimationFrame(rafId);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  useEffect(() => {
    audioRef.current.volume = volume;
  }, [volume]);

  return {
    isPlaying,
    currentTime,
    duration,
    progress,
    volume,
    setVolume,
    setSource,
    play,
    pause,
    toggle,
    seek,
    isBuffering,
    audioInstance: audioRef.current
  };
};
