import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Share2,
  Check,
  ExternalLink,
  Music2,
  Loader2,
  Sun,
  Moon,
  Headphones,
  RotateCcw,
  RotateCw,
  Sparkles
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { ENV } from '../config/env';
import logoImg from '../assets/logo.png';
import { motion } from 'framer-motion';
import { getShareUrl } from '../lib/utils';

const MarqueeTitle = ({ text, className = '' }) => {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [overflowDistance, setOverflowDistance] = useState(0);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const diff = textRef.current.scrollWidth - containerRef.current.clientWidth;
        if (diff > 4) {
          setIsOverflowing(true);
          setOverflowDistance(diff + 24);
        } else {
          setIsOverflowing(false);
          setOverflowDistance(0);
        }
      }
    };

    checkOverflow();
    const timer = setTimeout(checkOverflow, 150);

    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver(() => checkOverflow());
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener('resize', checkOverflow);
    return () => {
      clearTimeout(timer);
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', checkOverflow);
    };
  }, [text]);

  return (
    <div
      ref={containerRef}
      title={text}
      className={`overflow-hidden w-full relative min-w-0 ${isOverflowing ? 'text-left' : 'text-center md:text-left'}`}
      style={isOverflowing ? {
        maskImage: 'linear-gradient(to right, black calc(100% - 24px), transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 24px), transparent 100%)'
      } : undefined}
    >
      <motion.h1
        key={text}
        ref={textRef}
        className={`inline-block whitespace-nowrap will-change-transform ${className}`}
        animate={isOverflowing ? {
          x: [0, 0, -overflowDistance, -overflowDistance, 0],
        } : { x: 0 }}
        transition={isOverflowing ? {
          duration: Math.max(5, overflowDistance / 26),
          repeat: Infinity,
          ease: 'easeInOut',
          times: [0, 0.22, 0.72, 0.88, 1],
          repeatDelay: 1.2,
        } : {}}
      >
        {text}
      </motion.h1>
    </div>
  );
};

const formatTime = (secs) => {
  if (isNaN(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const SharePlay = () => {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const [trackId, setTrackId] = useState('');
  const [track, setTrack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [ytReady, setYtReady] = useState(false);

  const audioRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const progressBarRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.YT && window.YT.Player) {
      setYtReady(true);
      return;
    }
    if (!window.onYouTubeIframeAPIReady) {
      window.onYouTubeIframeAPIReady = () => {
        window.dispatchEvent(new CustomEvent('youtube-api-ready'));
      };
    }
    if (!document.getElementById('youtube-iframe-api-script')) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      const first = document.getElementsByTagName('script')[0];
      first.parentNode.insertBefore(tag, first);
    }
    const onReady = () => setYtReady(true);
    window.addEventListener('youtube-api-ready', onReady);
    return () => window.removeEventListener('youtube-api-ready', onReady);
  }, []);

  useEffect(() => {
    let id = searchParams.get('v') || searchParams.get('trackId') || '';
    if (!id) {
      const splat = params['*'] || '';
      if (splat) {
        id = splat.replace(/^v=/, '').split('/')[0];
      }
    }
    setTrackId(id);
  }, [params, searchParams]);

  useEffect(() => {
    if (!trackId) {
      setLoading(false);
      setError('No track specified.');
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    const fetchTrack = async () => {
      try {
        const res = await fetch(`${ENV.BACKEND_URL}/api/track?id=${encodeURIComponent(trackId)}`);
        if (!res.ok) {
          throw new Error('Track not found');
        }
        const data = await res.json();
        if (isMounted) {
          setTrack(data);
          if (data.title) {
            document.title = `${data.title} • ${data.artist || 'SumanMusic'} | SumanMusic`;
          }
          if (data.duration && typeof data.duration === 'number') {
            setDuration(data.duration);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Unable to load track details.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchTrack();

    return () => {
      isMounted = false;
    };
  }, [trackId]);

  const volumeRef = useRef(volume);
  const isMutedRef = useRef(isMuted);
  useEffect(() => {
    volumeRef.current = volume;
    isMutedRef.current = isMuted;
  }, [volume, isMuted]);

  useEffect(() => {
    if (!track?.isYouTube || !ytReady) return;

    const rawId = track.videoId || track.id;
    const cleanVideoId = String(rawId).replace(/^yt_/, '');
    if (!cleanVideoId) return;

    const container = document.getElementById('share-youtube-player');
    if (!container) return;

    try {
      ytPlayerRef.current = new window.YT.Player('share-youtube-player', {
        height: '1',
        width: '1',
        videoId: cleanVideoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          playsinline: 1,
          origin: window.location.origin
        },
        events: {
          onStateChange: (event) => {
            const state = event.data;
            if (state === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              setIsBuffering(false);
            } else if (state === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
              setIsBuffering(false);
            } else if (state === window.YT.PlayerState.BUFFERING) {
              setIsBuffering(true);
            } else if (state === window.YT.PlayerState.ENDED) {
              setIsPlaying(false);
              setCurrentTime(0);
            }
          },
          onReady: (event) => {
            const dur = event.target.getDuration();
            if (dur > 0) setDuration(dur);
            event.target.setVolume((isMutedRef.current ? 0 : volumeRef.current) * 100);
          }
        }
      });
    } catch { }

    return () => {
      try {
        ytPlayerRef.current?.destroy();
      } catch { }
      ytPlayerRef.current = null;
    };
  }, [track?.isYouTube, ytReady, track?.videoId, track?.id]);

  useEffect(() => {
    if (!isPlaying || !track?.isYouTube) return;
    const interval = setInterval(() => {
      if (ytPlayerRef.current?.getCurrentTime) {
        const cur = ytPlayerRef.current.getCurrentTime() || 0;
        setCurrentTime(cur);
        const dur = ytPlayerRef.current.getDuration() || 0;
        if (dur > 0 && dur !== duration) {
          setDuration(dur);
        }
      }
    }, 250);
    return () => clearInterval(interval);
  }, [isPlaying, track?.isYouTube, duration]);

  useEffect(() => {
    if (!track || track.isYouTube) return;

    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const audio = audioRef.current;
    const streamSrc = track.streamUrl || track.url || `${ENV.BACKEND_URL}/api/stream?fileId=${encodeURIComponent(track.id)}`;

    audio.src = streamSrc;
    audio.preload = 'metadata';

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
      setIsBuffering(false);
    };
    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => {
      setIsPlaying(true);
      setIsBuffering(false);
    };
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const onError = () => {
      setIsBuffering(false);
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [track]);

  useEffect(() => {
    if (track?.isYouTube) {
      ytPlayerRef.current?.setVolume?.((isMuted ? 0 : volume) * 100);
    } else if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted, track?.isYouTube]);

  const togglePlay = useCallback(() => {
    if (!track) return;
    if (track.isYouTube) {
      if (isPlaying) {
        ytPlayerRef.current?.pauseVideo();
      } else {
        setIsBuffering(true);
        ytPlayerRef.current?.playVideo();
      }
      return;
    }
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      setIsBuffering(true);
      audioRef.current.play().catch(() => {
        setIsBuffering(false);
        setIsPlaying(false);
      });
    }
  }, [isPlaying, track]);

  const handleSeek = (e) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = pct * duration;
    if (track?.isYouTube) {
      ytPlayerRef.current?.seekTo(newTime, true);
    } else if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    setCurrentTime(newTime);
  };

  const handleSkip = useCallback((seconds) => {
    if (!duration) return;
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    if (track?.isYouTube) {
      ytPlayerRef.current?.seekTo(newTime, true);
    } else if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    setCurrentTime(newTime);
  }, [currentTime, duration, track]);

  const handleShare = async () => {
    const shareUrl = getShareUrl();
    const title = track ? `${track.title} • ${track.artist} | SumanMusic` : 'SumanMusic';
    const text = track ? `Listen to "${track.title}" by ${track.artist} on SumanMusic` : 'Listen on SumanMusic';

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
        return;
      } catch { }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch { }
  };

  const handleOpenInApp = () => {
    if (track) {
      navigate(`/app?v=${encodeURIComponent(track.id || track.videoId)}`);
    } else {
      navigate('/app');
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const coverUrl = track?.cover || track?.thumbnail || 'https://songs.sumanonline.com/favicon.png';

  return (
    <div className="relative min-h-[100dvh] md:h-[100dvh] w-full bg-bg-base text-text-primary flex flex-col justify-between overflow-x-hidden md:overflow-hidden font-sans selection:bg-primary/20">
      <div
        className="fixed inset-0 pointer-events-none opacity-25 dark:opacity-40 blur-[140px] transition-all duration-1000 scale-125"
        style={{
          backgroundImage: `url(${coverUrl})`,
          backgroundPosition: 'center',
          backgroundSize: 'cover'
        }}
      />
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-b from-bg-base/60 via-bg-base/90 to-bg-base" />
      <div id="share-youtube-player" className="hidden pointer-events-none" />

      <header className="relative z-20 w-full max-w-6xl mx-auto px-5 sm:px-8 py-3.5 sm:py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
          <img
            src={logoImg}
            alt="SumanMusic"
            className="h-9 sm:h-11 w-auto object-contain origin-left group-hover:scale-105 transition-transform"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-full bg-bg-surface/60 hover:bg-bg-surface border border-border-main/10 text-text-secondary hover:text-text-primary transition-colors backdrop-blur-md"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
          </button>
          <button
            onClick={handleOpenInApp}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-black font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/25"
          >
            <Headphones className="w-4 h-4" />
            <span className="hidden sm:inline">Open in App</span>
            <span className="sm:hidden">App</span>
          </button>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center p-3 sm:p-5 md:p-6 lg:p-8">
        <div className="w-full max-w-[390px] sm:max-w-md md:max-w-4xl bg-bg-surface/85 dark:bg-[#121215]/85 backdrop-blur-3xl border border-white/10 dark:border-white/[0.08] rounded-3xl p-5 sm:p-6 md:p-7 lg:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.5)] dark:shadow-[0_25px_70px_rgba(0,0,0,0.85)] transition-all">
          {loading ? (
            <div className="py-16 md:py-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <p className="text-sm text-text-secondary font-medium tracking-wide">Loading track details...</p>
            </div>
          ) : error || !track ? (
            <div className="py-12 md:py-14 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-2">
                <Music2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-text-primary">Track Unavailable</h2>
              <p className="text-sm text-text-secondary max-w-sm mx-auto">
                {error || "The requested song could not be found or the link may have expired."}
              </p>
              <div className="pt-4">
                <button
                  onClick={() => navigate('/app')}
                  className="px-6 py-3 rounded-full bg-primary text-black font-bold text-sm hover:scale-105 transition-transform shadow-lg shadow-primary/20"
                >
                  Explore SumanMusic
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row md:items-center gap-5 sm:gap-6 md:gap-8 lg:gap-10">
              <div className="relative aspect-square w-full max-w-[210px] sm:max-w-[250px] md:max-w-[280px] lg:max-w-[320px] mx-auto md:mx-0 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-border-main/15 shrink-0 group bg-black/40">
                <img
                  src={coverUrl}
                  alt={track.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>

              <div className="flex-1 flex flex-col justify-between min-w-0 space-y-4 md:space-y-5">
                <div>
                  <div className="flex justify-center md:justify-start mb-2">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold tracking-wider uppercase">
                      <Sparkles className="w-3 h-3" />
                      <span>Shared Track On SumanMusic</span>
                    </div>
                  </div>
                  <MarqueeTitle
                    text={track.title}
                    className="text-xl sm:text-2xl md:text-3xl font-black text-text-primary tracking-tight leading-tight"
                  />
                  <p className="text-sm sm:text-base font-semibold text-text-secondary truncate mt-1 text-center md:text-left">
                    {track.artist}
                  </p>
                  {track.album && (
                    <p className="text-xs font-semibold text-text-secondary/60 uppercase tracking-widest mt-1 truncate text-center md:text-left">
                      {track.album}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div
                    ref={progressBarRef}
                    onClick={handleSeek}
                    className="relative h-2 w-full bg-border-main/20 rounded-full cursor-pointer group py-1"
                  >
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 group-hover:h-2 bg-border-main/20 rounded-full overflow-hidden transition-all">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-100"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs font-medium text-text-secondary font-mono px-0.5">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-center md:justify-start gap-6 sm:gap-7 pt-1">
                  <button
                    onClick={() => handleSkip(-10)}
                    className="p-2.5 rounded-full text-text-secondary hover:text-text-primary hover:bg-white/10 active:scale-90 transition-all"
                    title="Rewind 10 seconds"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                  <button
                    onClick={togglePlay}
                    className="w-14 h-14 sm:w-15 sm:h-15 rounded-full bg-primary text-black flex items-center justify-center shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isBuffering ? (
                      <Loader2 className="w-6 h-6 animate-spin text-black" />
                    ) : isPlaying ? (
                      <Pause className="w-6 h-6 fill-black" />
                    ) : (
                      <Play className="w-6 h-6 fill-black ml-0.5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleSkip(10)}
                    className="p-2.5 rounded-full text-text-secondary hover:text-text-primary hover:bg-white/10 active:scale-90 transition-all"
                    title="Forward 10 seconds"
                  >
                    <RotateCw className="w-5 h-5" />
                  </button>

                  <div className="hidden md:flex items-center gap-2 pl-4 border-l border-border-main/15">
                    <button
                      onClick={() => setIsMuted(prev => !prev)}
                      className="p-1.5 text-text-secondary hover:text-text-primary rounded-full hover:bg-border-main/10 transition-colors"
                      aria-label={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => {
                        setVolume(parseFloat(e.target.value));
                        setIsMuted(false);
                      }}
                      className="w-20 md:w-24 h-1 bg-border-main/20 rounded-lg accent-primary cursor-pointer"
                      aria-label="Volume slider"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-border-main/10">
                  <button
                    onClick={handleOpenInApp}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-black text-xs font-bold transition-all shadow-md active:scale-95"
                  >
                    <span>Full Player</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-border-main/10 text-xs font-bold text-text-primary transition-all active:scale-95"
                    aria-label="Share song"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-primary" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Share</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="relative z-10 w-full max-w-6xl mx-auto px-5 sm:px-8 py-3 text-center shrink-0">
        <p className="text-xs text-text-secondary/50">
          A <a href="https://sumanonline.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors font-semibold">SumanOnline.Com</a> Web Services Project
        </p>
      </footer>
    </div>
  );
};

export default SharePlay;
