import { useState, useEffect, useRef, useCallback } from 'react';
import { getOfflineAudioUrl } from '../lib/offlineStorage';
import { ENV } from '../config/env';

if (typeof window !== 'undefined' && !window.onYouTubeIframeAPIReady) {
  window.onYouTubeIframeAPIReady = () => {
    window.dispatchEvent(new CustomEvent('youtube-api-ready'));
  };
}

const updateMediaSession = (song) => {
  if (!('mediaSession' in navigator) || !song) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title || 'Unknown Track',
      artist: song.artist || 'YouTube Music',
      album: song.album || 'SumanMusic',
      artwork: song.cover || song.thumbnail
        ? [{ src: song.cover || song.thumbnail, sizes: '512x512', type: 'image/jpeg' }]
        : [],
    });
  } catch {}
};

const setMediaPlaybackState = (playing) => {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
  } catch {}
};

const SILENT_OGG_DATA =
  'data:audio/ogg;base64,T2dnUwACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

const EQ_FREQUENCIES = [60, 250, 1000, 4000, 12000];
const EQ_TYPES = ['lowshelf', 'peaking', 'peaking', 'peaking', 'highshelf'];

export const EQUALIZER_PRESETS = {
  'Flat': [0, 0, 0, 0, 0],
  'Bass Boost': [6, 4, 0, -1, -2],
  'Vocal Boost': [-3, 1, 4, 3, 1],
  'Acoustic': [3, 2, 2, 3, 2],
  'Electronic': [5, 3, -1, 3, 5],
  'Rock': [5, 2, -2, 2, 4],
  'Lofi / Chill': [3, 1, -1, -2, -3]
};

export const useAudio = (playerEngineProp = 'youtubei') => {
  const audioRef = useRef(new Audio());
  const silentAudioRef = useRef(null);
  const audioCtxRef = useRef(null);
  const audioSourceNodeRef = useRef(null);
  const boosterGainNodeRef = useRef(null);
  const compressorNodeRef = useRef(null);
  const analyserNodeRef = useRef(null);
  const eqFiltersRef = useRef([]);
  const pendingCheckInterval = useRef(null);
  const currentSongMetaRef = useRef(null);
  const loadRequestIdRef = useRef(0);
  const activeEngineRef = useRef(playerEngineProp || 'youtubei');
  useEffect(() => {
    activeEngineRef.current = playerEngineProp || localStorage.getItem('suman_youtube_player_engine') || 'youtubei';
  }, [playerEngineProp]);
  const isUsingIframeRef = useRef(false);
  const isYouTubeStreamRef = useRef(false);
  const currentVideoIdRef = useRef(null);

  const [soundBoost, setSoundBoostState] = useState(() => {
    const saved = localStorage.getItem('suman_music_sound_boost');
    return saved !== null ? parseFloat(saved) : 100;
  });

  const [equalizerBands, setEqualizerBandsState] = useState(() => {
    try {
      const saved = localStorage.getItem('suman_music_eq_bands');
      return saved ? JSON.parse(saved) : [0, 0, 0, 0, 0];
    } catch {
      return [0, 0, 0, 0, 0];
    }
  });

  const [equalizerPreset, setEqualizerPresetState] = useState(() => {
    return localStorage.getItem('suman_music_eq_preset') || 'Flat';
  });

  const [crossfade, setCrossfadeState] = useState(() => {
    const saved = localStorage.getItem('suman_music_crossfade');
    return saved !== null ? parseFloat(saved) : 2;
  });

  const setupBoosterGraph = useCallback(() => {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      if (ctx && !audioSourceNodeRef.current && audioRef.current) {
        audioRef.current.crossOrigin = 'anonymous';

        const source = ctx.createMediaElementSource(audioRef.current);
        const gainNode = ctx.createGain();
        const compressor = ctx.createDynamicsCompressor();
        const analyser = ctx.createAnalyser();

        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.82;

        compressor.threshold.setValueAtTime(-4, ctx.currentTime);
        compressor.knee.setValueAtTime(25, ctx.currentTime);
        compressor.ratio.setValueAtTime(14, ctx.currentTime);
        compressor.attack.setValueAtTime(0.003, ctx.currentTime);
        compressor.release.setValueAtTime(0.25, ctx.currentTime);

        const currentMultiplier = (parseFloat(localStorage.getItem('suman_music_sound_boost') || '100')) / 100;
        gainNode.gain.setValueAtTime(Math.max(1.0, currentMultiplier), ctx.currentTime);

        let currentEqBands = [0, 0, 0, 0, 0];
        try {
          const rawEq = localStorage.getItem('suman_music_eq_bands');
          if (rawEq) currentEqBands = JSON.parse(rawEq);
        } catch {}

        const filters = EQ_FREQUENCIES.map((freq, index) => {
          const filter = ctx.createBiquadFilter();
          filter.type = EQ_TYPES[index];
          filter.frequency.setValueAtTime(freq, ctx.currentTime);
          if (filter.type === 'peaking') {
            filter.Q.setValueAtTime(1.0, ctx.currentTime);
          }
          const gainVal = Number(currentEqBands[index] || 0);
          filter.gain.setValueAtTime(gainVal, ctx.currentTime);
          return filter;
        });

        source.connect(filters[0]);
        for (let i = 0; i < filters.length - 1; i++) {
          filters[i].connect(filters[i + 1]);
        }
        filters[filters.length - 1].connect(gainNode);
        gainNode.connect(compressor);
        compressor.connect(analyser);
        analyser.connect(ctx.destination);

        audioSourceNodeRef.current = source;
        boosterGainNodeRef.current = gainNode;
        compressorNodeRef.current = compressor;
        analyserNodeRef.current = analyser;
        eqFiltersRef.current = filters;
      }
    } catch (e) {
      console.warn("Audio processing graph warning:", e);
    }
  }, []);

  const setSoundBoost = useCallback((val) => {
    const clamped = Math.max(100, Math.min(300, Math.round(val)));
    setSoundBoostState(clamped);
    localStorage.setItem('suman_music_sound_boost', clamped.toString());

    setupBoosterGraph();

    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }

    if (boosterGainNodeRef.current && audioCtxRef.current) {
      const multiplier = clamped / 100;
      boosterGainNodeRef.current.gain.cancelScheduledValues(audioCtxRef.current.currentTime);
      boosterGainNodeRef.current.gain.setValueAtTime(multiplier, audioCtxRef.current.currentTime);
    }

    if (isUsingIframeRef.current && ytPlayerRef.current?.setVolume) {
      const baseVol = (parseFloat(localStorage.getItem('suman_music_volume') || '1.0')) * 100;
      const boosted = Math.min(100, Math.round(baseVol * (clamped / 100)));
      ytPlayerRef.current.setVolume(boosted);
    }
  }, [setupBoosterGraph]);

  const setEqualizerBand = useCallback((index, db) => {
    setupBoosterGraph();
    const clampedDb = Math.max(-12, Math.min(12, db));
    setEqualizerBandsState(prev => {
      const next = [...prev];
      next[index] = clampedDb;
      localStorage.setItem('suman_music_eq_bands', JSON.stringify(next));
      return next;
    });

    if (eqFiltersRef.current[index] && audioCtxRef.current) {
      eqFiltersRef.current[index].gain.cancelScheduledValues(audioCtxRef.current.currentTime);
      eqFiltersRef.current[index].gain.setValueAtTime(clampedDb, audioCtxRef.current.currentTime);
    }
  }, [setupBoosterGraph]);

  const setEqualizerPreset = useCallback((name) => {
    setupBoosterGraph();
    const bands = EQUALIZER_PRESETS[name] || EQUALIZER_PRESETS['Flat'];
    setEqualizerPresetState(name);
    setEqualizerBandsState(bands);
    localStorage.setItem('suman_music_eq_preset', name);
    localStorage.setItem('suman_music_eq_bands', JSON.stringify(bands));

    if (audioCtxRef.current) {
      bands.forEach((val, i) => {
        if (eqFiltersRef.current[i]) {
          eqFiltersRef.current[i].gain.cancelScheduledValues(audioCtxRef.current.currentTime);
          eqFiltersRef.current[i].gain.setValueAtTime(val, audioCtxRef.current.currentTime);
        }
      });
    }
  }, [setupBoosterGraph]);

  const setCrossfade = useCallback((seconds) => {
    const val = Math.max(0, Math.min(5, seconds));
    setCrossfadeState(val);
    localStorage.setItem('suman_music_crossfade', String(val));
  }, []);

  const getFrequencyData = useCallback((dataArray) => {
    if (analyserNodeRef.current && audioRef.current && !audioRef.current.paused) {
      analyserNodeRef.current.getByteFrequencyData(dataArray);
      return true;
    }
    return false;
  }, []);

  const startAudioContextKeepAlive = useCallback(() => {
    try {
      if (!audioCtxRef.current && typeof window !== 'undefined') {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          gain.gain.value = 0.00001;
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          audioCtxRef.current = ctx;
        }
      }
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
    } catch {}
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    audio.playsInline = true;
    audio.setAttribute('webkit-playsinline', 'true');
    audio.setAttribute('playsinline', 'true');

    const silent = new Audio();
    silent.src = SILENT_OGG_DATA;
    silent.loop = true;
    silent.volume = 0.001;
    silent.playsInline = true;
    silent.setAttribute('webkit-playsinline', 'true');
    silent.setAttribute('playsinline', 'true');
    silent.load();
    silentAudioRef.current = silent;

    return () => {
      audio.pause();
      audio.src = '';
      silent.pause();
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, []);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => {
    try {
      const saved = localStorage.getItem('suman_music_last_time');
      const val = saved ? parseFloat(saved) : 0;
      return !isNaN(val) && val > 0 ? val : 0;
    } catch {
      return 0;
    }
  });
  const [duration, setDuration] = useState(() => {
    try {
      const savedSong = localStorage.getItem('suman_music_last_song_obj');
      if (savedSong) {
        const parsed = JSON.parse(savedSong);
        if (parsed?.duration && !isNaN(parsed.duration)) return parsed.duration;
      }
    } catch {}
    return 0;
  });
  const [progress, setProgress] = useState(() => {
    try {
      const savedTime = parseFloat(localStorage.getItem('suman_music_last_time') || '0');
      const savedSong = localStorage.getItem('suman_music_last_song_obj');
      if (savedSong) {
        const parsed = JSON.parse(savedSong);
        if (parsed?.duration && parsed.duration > 0 && savedTime > 0) {
          return Math.min(100, (savedTime / parsed.duration) * 100);
        }
      }
    } catch {}
    return 0;
  });
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('suman_music_volume');
    return saved !== null ? parseFloat(saved) : 1.0;
  });
  const [isBuffering, setIsBuffering] = useState(false);
  const [isYouTube, setIsYouTube] = useState(false);
  const isYouTubeRef = useRef(false);

  const [ytReady, setYtReady] = useState(false);
  const ytPlayerRef = useRef(null);
  const [loadRequested, setLoadRequested] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.YT && window.YT.Player) {
      setTimeout(() => setYtReady(true), 0);
      return;
    }
    const handleReady = () => setYtReady(true);
    window.addEventListener('youtube-api-ready', handleReady);
    return () => window.removeEventListener('youtube-api-ready', handleReady);
  }, []);

  useEffect(() => {
    if (loadRequested && !window.YT && typeof document !== 'undefined') {
      if (!document.getElementById('youtube-iframe-api-script')) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api-script';
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      }
    }
  }, [loadRequested]);

  const initYouTube = useCallback(() => {
    setLoadRequested(true);
  }, []);

  const fallbackToIframe = useCallback((cleanId) => {
    if (!cleanId) return;
    isUsingIframeRef.current = true;
    isYouTubeStreamRef.current = false;
    initYouTube();
    audioRef.current.pause();
    audioRef.current.src = '';
    const loadVideo = () => {
      if (ytPlayerRef.current?.loadVideoById) {
        setIsBuffering(true);
        ytPlayerRef.current.loadVideoById({ videoId: cleanId });
        return true;
      }
      return false;
    };
    if (!loadVideo()) {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (loadVideo() || attempts > 20) {
          clearInterval(interval);
        }
      }, 300);
    }
  }, [initYouTube]);

  useEffect(() => {
    if (ytReady && !ytPlayerRef.current) {
      const container = document.getElementById('youtube-player-container');
      if (!container) return;

      const origin = window.location.origin;

      try {
        ytPlayerRef.current = new window.YT.Player('youtube-player-container', {
          height: '1',
          width: '1',
          host: 'https://www.youtube-nocookie.com',
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            rel: 0,
            modestbranding: 1,
            enablejsapi: 1,
            playsinline: 1,
            origin,
          },
          events: {
            onStateChange: (event) => {
              const state = event.data;
              if (state === window.YT.PlayerState.PLAYING) {
                setIsPlaying(true);
                setIsBuffering(false);
                setMediaPlaybackState(true);
                startAudioContextKeepAlive();
                if (silentAudioRef.current) {
                  silentAudioRef.current.play().catch(() => {});
                }
              } else if (state === window.YT.PlayerState.PAUSED) {
                setIsPlaying(false);
                setIsBuffering(false);
                setMediaPlaybackState(false);
                silentAudioRef.current?.pause();
              } else if (state === window.YT.PlayerState.BUFFERING) {
                setIsBuffering(true);
              } else if (state === window.YT.PlayerState.ENDED) {
                setIsPlaying(false);
                setIsBuffering(false);
                setMediaPlaybackState(false);
                silentAudioRef.current?.pause();
                window.dispatchEvent(new CustomEvent('youtube-song-ended'));
              }
            },
            onReady: (event) => {
              event.target.setVolume(volume * 100);
            },
            onError: () => {
              setIsBuffering(false);
              setIsPlaying(false);
              setMediaPlaybackState(false);
              silentAudioRef.current?.pause();
            },
          },
        });
      } catch {}
    }
  }, [ytReady, volume, startAudioContextKeepAlive]);

  useEffect(() => {
    localStorage.setItem('suman_music_volume', volume.toString());
    if (isUsingIframeRef.current && ytPlayerRef.current?.setVolume) {
      ytPlayerRef.current.setVolume(volume * 100);
    } else {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const wasPlayingRef = useRef(false);
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        wasPlayingRef.current = isUsingIframeRef.current
          ? ytPlayerRef.current?.getPlayerState?.() === window.YT?.PlayerState?.PLAYING
          : !audioRef.current.paused;
      } else if (document.visibilityState === 'visible') {
        if (audioCtxRef.current?.state === 'suspended') {
          audioCtxRef.current.resume().catch(() => {});
        }
        if (wasPlayingRef.current && isUsingIframeRef.current) {
          setTimeout(() => {
            if (ytPlayerRef.current?.playVideo) {
              ytPlayerRef.current.playVideo();
            }
            if (silentAudioRef.current) {
              silentAudioRef.current.play().catch(() => {});
            }
          }, 300);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const play = useCallback(() => {
    startAudioContextKeepAlive();
    setupBoosterGraph();

    if (isUsingIframeRef.current) {
      audioRef.current.pause();
      if (silentAudioRef.current) {
        silentAudioRef.current.play().catch(() => {});
      }
      if (ytPlayerRef.current?.playVideo) {
        ytPlayerRef.current.playVideo();
      }
      setMediaPlaybackState(true);
    } else {
      silentAudioRef.current?.pause();
      if (ytPlayerRef.current?.pauseVideo) {
        ytPlayerRef.current.pauseVideo();
      }
      audioRef.current.muted = false;
      audioRef.current.volume = volume;

      if (boosterGainNodeRef.current && audioCtxRef.current) {
        const targetMultiplier = soundBoost / 100;
        const now = audioCtxRef.current.currentTime;
        boosterGainNodeRef.current.gain.cancelScheduledValues(now);
        if (crossfade > 0) {
          boosterGainNodeRef.current.gain.setValueAtTime(0.01, now);
          boosterGainNodeRef.current.gain.linearRampToValueAtTime(targetMultiplier, now + crossfade);
        } else {
          boosterGainNodeRef.current.gain.setValueAtTime(targetMultiplier, now);
        }
      }

      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setMediaPlaybackState(true);
          })
          .catch((err) => {
            if (err && err.name !== 'AbortError') {
              setIsPlaying(false);
            }
          });
      }
    }
  }, [startAudioContextKeepAlive, setupBoosterGraph, volume, crossfade, soundBoost]);

  const setSource = useCallback((url, videoId = null, songMeta = null, autoPlay = false, initialTime = 0) => {
    if (pendingCheckInterval.current) {
      clearInterval(pendingCheckInterval.current);
      pendingCheckInterval.current = null;
    }

    const currentRequestId = ++loadRequestIdRef.current;
    const targetIsYouTube = Boolean(videoId || songMeta?.isYouTube);
    isYouTubeRef.current = targetIsYouTube;
    setIsYouTube(targetIsYouTube);

    if (songMeta) {
      currentSongMetaRef.current = songMeta;
      updateMediaSession(songMeta);
    }

    const rawId = videoId || songMeta?.videoId || (songMeta?.id ? String(songMeta.id).replace(/^yt_/, '') : '');
    const cleanVideoId = rawId ? String(rawId).replace(/^yt_/, '') : '';
    currentVideoIdRef.current = cleanVideoId;

    if (targetIsYouTube) {
      isUsingIframeRef.current = false;
      isYouTubeStreamRef.current = true;
      setIsBuffering(true);

      initYouTube();

      silentAudioRef.current?.pause();
      if (ytPlayerRef.current?.pauseVideo) {
        ytPlayerRef.current.pauseVideo();
      }

      const streamUrl = `${ENV.BACKEND_URL}/api/youtube/stream?videoId=${cleanVideoId}`;

      const applyInitial = () => {
        if (initialTime > 0 && !isNaN(initialTime)) {
          try {
            audioRef.current.currentTime = initialTime;
            setCurrentTime(initialTime);
            const currentDuration = audioRef.current.duration || songMeta?.duration || 0;
            if (currentDuration > 0) {
              setDuration(currentDuration);
              setProgress(Math.min(100, (initialTime / currentDuration) * 100));
            }
          } catch {}
        }
      };

      if (audioRef.current.src !== streamUrl) {
        if (initialTime > 0) {
          audioRef.current.addEventListener('loadedmetadata', applyInitial, { once: true });
          audioRef.current.addEventListener('canplay', applyInitial, { once: true });
        }
        audioRef.current.src = streamUrl;
      } else {
        if (initialTime > 0) {
          audioRef.current.currentTime = initialTime;
          setCurrentTime(initialTime);
        } else {
          audioRef.current.currentTime = 0;
        }
      }

      if (autoPlay) {
        play();
      }
    } else {
      isUsingIframeRef.current = false;
      isYouTubeStreamRef.current = targetIsYouTube;
      silentAudioRef.current?.pause();
      if (ytPlayerRef.current?.pauseVideo) {
        ytPlayerRef.current.pauseVideo();
      }

      const songId = songMeta?.id;
      const setupNativeAudio = async () => {
        let streamUrl = url;
        if (targetIsYouTube && cleanVideoId) {
          streamUrl = `${ENV.BACKEND_URL}/api/youtube/stream?videoId=${cleanVideoId}`;
        } else if (songId) {
          try {
            const offlineUrl = await getOfflineAudioUrl(songId);
            if (offlineUrl) {
              streamUrl = offlineUrl;
            }
          } catch {}
        }

        if (loadRequestIdRef.current !== currentRequestId) return;

        if (streamUrl) {
          const applyInitial = () => {
            if (initialTime > 0 && !isNaN(initialTime)) {
              try {
                audioRef.current.currentTime = initialTime;
                setCurrentTime(initialTime);
                const currentDuration = audioRef.current.duration || songMeta?.duration || 0;
                if (currentDuration > 0) {
                  setDuration(currentDuration);
                  setProgress(Math.min(100, (initialTime / currentDuration) * 100));
                }
              } catch {}
            }
          };

          if (audioRef.current.src !== streamUrl) {
            if (initialTime > 0) {
              audioRef.current.addEventListener('loadedmetadata', applyInitial, { once: true });
              audioRef.current.addEventListener('canplay', applyInitial, { once: true });
            }
            audioRef.current.src = streamUrl;
          } else {
            if (initialTime > 0) {
              audioRef.current.currentTime = initialTime;
              setCurrentTime(initialTime);
            } else {
              audioRef.current.currentTime = 0;
            }
          }
          if (autoPlay) {
            play();
          }
        }
      };

      setupNativeAudio();
    }
  }, [initYouTube, play]);

  const pause = useCallback(() => {
    silentAudioRef.current?.pause();
    if (isUsingIframeRef.current) {
      if (ytPlayerRef.current?.pauseVideo) {
        ytPlayerRef.current.pauseVideo();
      }
    } else {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setMediaPlaybackState(false);
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) pause(); else play();
  }, [isPlaying, pause, play]);

  const seek = useCallback((percent) => {
    if (isUsingIframeRef.current) {
      if (ytPlayerRef.current?.getDuration) {
        const total = ytPlayerRef.current.getDuration();
        if (total > 0) {
          const time = (percent / 100) * total;
          ytPlayerRef.current.seekTo(time, true);
          setCurrentTime(time);
          setProgress(percent);
        }
      }
    } else {
      const dur = (audioRef.current.duration && !isNaN(audioRef.current.duration) && isFinite(audioRef.current.duration) && audioRef.current.duration > 0)
        ? audioRef.current.duration 
        : (currentSongMetaRef.current?.duration || 0);
      if (dur > 0) {
        const time = (percent / 100) * dur;
        audioRef.current.currentTime = time;
        setCurrentTime(time);
        setProgress(percent);
      }
    }
  }, []);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const handlePlay = () => play();
    const handlePause = () => pause();

    try {
      navigator.mediaSession.setActionHandler('play', handlePlay);
      navigator.mediaSession.setActionHandler('pause', handlePause);
    } catch {}

    return () => {
      try {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
      } catch {}
    };
  }, [play, pause]);

  useEffect(() => {
    const audio = audioRef.current;

    const handleLoadedMetadata = () => {
      const dur = audio.duration || currentSongMetaRef.current?.duration || 0;
      if (dur > 0 && !isNaN(dur) && isFinite(dur)) {
        setDuration(dur);
      }
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setMediaPlaybackState(false);
      if (isYouTubeRef.current) {
        window.dispatchEvent(new CustomEvent('youtube-song-ended'));
      }
    };
    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => { setIsBuffering(false); setIsPlaying(true); setMediaPlaybackState(true); };
    const handleCanPlay = () => setIsBuffering(false);
    const handleError = () => {
      if (isUsingIframeRef.current || !audio.src || audio.src === window.location.href) return;
      setIsBuffering(false);
      setIsPlaying(false);
      if (isYouTubeStreamRef.current && currentVideoIdRef.current) {
        fallbackToIframe(currentVideoIdRef.current);
        return;
      }
      window.dispatchEvent(new CustomEvent('gdrive-key-failover'));
    };

    const handleTimeUpdate = () => {
      if (isUsingIframeRef.current) return;
      const cur = audio.currentTime || 0;
      setCurrentTime(cur);
      const dur = (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0)
        ? audio.duration
        : (currentSongMetaRef.current?.duration || 0);
      if (dur > 0) {
        setDuration(dur);
        setProgress((cur / dur) * 100);
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);
    audio.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [fallbackToIframe]);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      if (isUsingIframeRef.current) {
        if (ytPlayerRef.current?.getCurrentTime) {
          const cur = ytPlayerRef.current.getCurrentTime() || 0;
          const dur = ytPlayerRef.current.getDuration() || 0;
          setCurrentTime(cur);
          if (dur > 0) {
            setDuration(dur);
            setProgress((cur / dur) * 100);
          }
        }
      } else {
        const audio = audioRef.current;
        if (audio && !audio.paused) {
          const cur = audio.currentTime || 0;
          setCurrentTime(cur);
          const dur = (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0)
            ? audio.duration
            : (currentSongMetaRef.current?.duration || 0);
          if (dur > 0) {
            setDuration(dur);
            setProgress((cur / dur) * 100);
          }
        }
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isPlaying]);

  return {
    isPlaying,
    currentTime,
    duration,
    progress,
    volume,
    setVolume,
    soundBoost,
    setSoundBoost,
    equalizerBands,
    setEqualizerBand,
    equalizerPreset,
    setEqualizerPreset,
    crossfade,
    setCrossfade,
    getFrequencyData,
    setSource,
    play,
    pause,
    toggle,
    seek,
    isBuffering,
    isYouTube,
    initYouTube,
    updateMediaSession,
    getAudioInstance: useCallback(() => audioRef.current, []),
  };
};
