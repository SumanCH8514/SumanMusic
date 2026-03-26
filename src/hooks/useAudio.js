import { useState, useEffect, useRef, useCallback } from 'react';

// Add global YT check
if (typeof window !== 'undefined' && !window.onYouTubeIframeAPIReady) {
  window.onYouTubeIframeAPIReady = () => {
    window.dispatchEvent(new CustomEvent('youtube-api-ready'));
  };
}

export const useAudio = () => {
  const audioRef = useRef(new Audio());
  
  // Initialize audio element with mobile-friendly settings
  useEffect(() => {
    const audio = audioRef.current;
    audio.preload = 'auto';
    audio.playsInline = true;
    audio.setAttribute('webkit-playsinline', 'true');
    audio.setAttribute('playsinline', 'true');
  }, []);

  const ytPlayerRef = useRef(null);
  const [isYouTube, setIsYouTube] = useState(false);
  const isYouTubeRef = useRef(false);
  const [ytReady, setYtReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('suman_music_volume');
    return saved !== null ? parseFloat(saved) : 1.0;
  });
  const [isBuffering, setIsBuffering] = useState(false);
  const [loadRequested, setLoadRequested] = useState(false);

  // Trigger YouTube API load only when requested
  useEffect(() => {
    if (!loadRequested || (window.YT && window.YT.Player)) {
      if (window.YT && window.YT.Player) {
        queueMicrotask(() => setYtReady(true));
      }
      return;
    }

    const handleReady = () => setYtReady(true);
    window.addEventListener('youtube-api-ready', handleReady);

    if (!document.getElementById('youtube-iframe-api')) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api';
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    return () => window.removeEventListener('youtube-api-ready', handleReady);
  }, [loadRequested, setYtReady]);

  const initYouTube = useCallback(() => {
    setLoadRequested(true);
  }, []);

  // Initialize YT Player
  useEffect(() => {
    if (ytReady && !ytPlayerRef.current) {
      const container = document.getElementById('youtube-player-container');
      if (!container) return;

      const origin = window.location.origin;
      
      // Use queueMicrotask to ensure the DOM is settled
      queueMicrotask(() => {
        if (!document.getElementById('youtube-player-container')) return;
        
        try {
          ytPlayerRef.current = new window.YT.Player('youtube-player-container', {
            height: '0',
            width: '0',
            playerVars: {
              'autoplay': 0,
              'controls': 0,
              'disablekb': 1,
              'fs': 0,
              'rel': 0,
              'modestbranding': 1,
              'enablejsapi': 1,
              'origin': origin,
              'widget_referrer': origin
            },
            events: {
              onStateChange: (event) => {
                const state = event.data;
                if (state === window.YT.PlayerState.PLAYING) {
                  setIsPlaying(true);
                  setIsBuffering(false);
                } else if (state === window.YT.PlayerState.PAUSED) {
                  setIsPlaying(false);
                } else if (state === window.YT.PlayerState.BUFFERING) {
                  setIsBuffering(true);
                } else if (state === window.YT.PlayerState.ENDED) {
                  setIsPlaying(false);
                  window.dispatchEvent(new CustomEvent('youtube-song-ended'));
                }
              },
              onReady: (event) => {
                event.target.setVolume(volume * 100);
              },
              onError: (event) => {
                console.error("YouTube Player Error:", event.data);
                setIsBuffering(false);
                setIsPlaying(false);
              }
            }
          });
        } catch (err) {
          console.error("Failed to initialize YouTube Player:", err);
        }
      });
    }
  }, [ytReady, volume]);

  useEffect(() => {
    localStorage.setItem('suman_music_volume', volume.toString());
    if (isYouTube && ytPlayerRef.current?.setVolume) {
      ytPlayerRef.current.setVolume(volume * 100);
    } else {
      audioRef.current.volume = volume;
    }
  }, [volume, isYouTube]);

  const setSource = useCallback((url, videoId = null) => {
    const targetIsYouTube = !!videoId;
    isYouTubeRef.current = targetIsYouTube;
    setIsYouTube(targetIsYouTube);

    if (targetIsYouTube) {
      initYouTube();
      audioRef.current.pause();
      audioRef.current.src = "";
      if (ytPlayerRef.current?.loadVideoById) {
        setIsBuffering(true);
        ytPlayerRef.current.loadVideoById(videoId);
      } else {
        const checkReady = setInterval(() => {
           if (ytPlayerRef.current?.loadVideoById) {
              setIsBuffering(true);
              ytPlayerRef.current.loadVideoById(videoId);
              clearInterval(checkReady);
           }
        }, 500);
      }
    } else {
      if (ytPlayerRef.current?.pauseVideo) {
        ytPlayerRef.current.pauseVideo();
      }
      if (url) {
        setIsBuffering(true);
        audioRef.current.src = url;
        audioRef.current.load();
      }
    }
  }, [initYouTube]);

  const play = useCallback(() => {
    if (isYouTubeRef.current) {
      audioRef.current.pause();
      if (ytPlayerRef.current?.playVideo) {
        ytPlayerRef.current.playVideo();
      }
    } else {
      if (ytPlayerRef.current?.pauseVideo) {
        ytPlayerRef.current.pauseVideo();
      }
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.then(() => setIsPlaying(true)).catch(e => {
          console.warn("Playback prevented", e);
          setIsPlaying(false);
        });
      }
    }
  }, []);

  const pause = useCallback(() => {
    if (isYouTubeRef.current) {
      if (ytPlayerRef.current?.pauseVideo) {
        ytPlayerRef.current.pauseVideo();
      }
    } else {
      audioRef.current.pause();
    }
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
    if (isYouTubeRef.current) {
      if (ytPlayerRef.current?.getDuration) {
        const time = (percent / 100) * ytPlayerRef.current.getDuration();
        ytPlayerRef.current.seekTo(time, true);
      }
    } else {
      if (audioRef.current.duration) {
        const time = (percent / 100) * audioRef.current.duration;
        audioRef.current.currentTime = time;
      }
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);
    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => { setIsBuffering(false); setIsPlaying(true); };
    const handleCanPlay = () => setIsBuffering(false);
    const handleError = (e) => {
      console.error("Audio error:", e);
      setIsBuffering(false);
      setIsPlaying(false);
      window.dispatchEvent(new CustomEvent('gdrive-key-failover'));
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);

    let rafId;
    const poll = () => {
      if (isYouTubeRef.current) {
        if (ytPlayerRef.current?.getCurrentTime) {
          const cur = ytPlayerRef.current.getCurrentTime();
          const dur = ytPlayerRef.current.getDuration();
          setCurrentTime(cur);
          if (dur > 0) {
            setDuration(dur);
            setProgress((cur / dur) * 100);
          }
        }
      } else if (!audio.paused) {
        setCurrentTime(audio.currentTime);
        if (audio.duration) {
          setDuration(audio.duration);
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
    isYouTube,
    initYouTube,
    getAudioInstance: useCallback(() => audioRef.current, [])
  };
};
