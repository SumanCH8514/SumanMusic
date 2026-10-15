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
  Headphones
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { ENV } from '../config/env';
import logoImg from '../assets/logo.png';

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

  const audioRef = useRef(null);
  const progressBarRef = useRef(null);

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

  useEffect(() => {
    if (!track) return;

    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const audio = audioRef.current;
    const streamSrc = track.streamUrl || track.url || (
      track.isYouTube
        ? `${ENV.BACKEND_URL}/api/youtube/stream?videoId=${encodeURIComponent(track.videoId || track.id.replace('yt_', ''))}`
        : `${ENV.BACKEND_URL}/api/stream?fileId=${encodeURIComponent(track.id)}`
    );

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
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !track) return;
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
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = pct * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const title = track ? `${track.title} • ${track.artist} | SumanMusic` : 'SumanMusic';
    const text = track ? `Listen to "${track.title}" by ${track.artist} on SumanMusic` : 'Listen on SumanMusic';

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
        return;
      } catch {}
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {}
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
    <div className="relative min-h-[100dvh] w-full bg-bg-base text-text-primary flex flex-col justify-between overflow-x-hidden font-sans selection:bg-primary/20">
      <div
        className="fixed inset-0 pointer-events-none opacity-25 dark:opacity-40 blur-[140px] transition-all duration-1000 scale-125"
        style={{
          backgroundImage: `url(${coverUrl})`,
          backgroundPosition: 'center',
          backgroundSize: 'cover'
        }}
      />
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-b from-bg-base/60 via-bg-base/90 to-bg-base" />

      <header className="relative z-20 w-full max-w-6xl mx-auto px-5 sm:px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
          <img
            src={logoImg}
            alt="SumanMusic"
            className="h-10 sm:h-12 w-auto object-contain origin-left group-hover:scale-105 transition-transform"
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

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg bg-bg-surface/80 dark:bg-[#121214]/80 backdrop-blur-2xl border border-border-main/10 rounded-3xl p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] transition-all">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <p className="text-sm text-text-secondary font-medium tracking-wide">Loading track details...</p>
            </div>
          ) : error || !track ? (
            <div className="py-14 text-center space-y-4">
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
            <div className="space-y-6">
              <div className="relative aspect-square w-full rounded-2xl overflow-hidden shadow-2xl group border border-border-main/10">
                <img
                  src={coverUrl}
                  alt={track.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <button
                  onClick={togglePlay}
                  className="absolute bottom-4 right-4 w-14 h-14 rounded-full bg-primary text-black flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-transform"
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
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight truncate leading-tight">
                  {track.title}
                </h1>
                <p className="text-base sm:text-lg font-medium text-text-secondary truncate mt-1">
                  {track.artist}
                </p>
                {track.album && (
                  <p className="text-xs font-semibold text-text-secondary/60 uppercase tracking-widest mt-1 truncate">
                    {track.album}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div
                  ref={progressBarRef}
                  onClick={handleSeek}
                  className="relative h-2 w-full bg-border-main/20 rounded-full cursor-pointer group py-1"
                >
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 bg-border-main/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-100"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
                <div className="flex justify-between text-xs font-medium text-text-secondary font-mono">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border-main/10">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsMuted(prev => !prev)}
                    className="p-2 text-text-secondary hover:text-text-primary rounded-full hover:bg-border-main/10 transition-colors"
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
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
                    className="w-20 sm:w-24 h-1 bg-border-main/20 rounded-lg accent-primary cursor-pointer"
                    aria-label="Volume slider"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-bg-surface hover:bg-border-main/10 border border-border-main/10 text-xs font-bold text-text-primary transition-all active:scale-95"
                    aria-label="Share song"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-4 h-4 text-primary" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4" />
                        <span>Share</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleOpenInApp}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-black text-xs font-bold transition-all shadow-md active:scale-95"
                  >
                    <span>Full Player</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="relative z-10 w-full max-w-6xl mx-auto px-5 sm:px-8 py-4 text-center">
        <p className="text-xs text-text-secondary/60">
          A <a href="https://sumanonline.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors font-semibold">SumanOnline.Com</a> Web Services Project
        </p>
      </footer>
    </div>
  );
};

export default SharePlay;
