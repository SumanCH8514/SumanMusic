import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../context/ToastContext';
import {
  Play, Pause, SkipBack, SkipForward, Repeat, Shuffle,
  Volume2, VolumeX, Maximize2, ChevronDown, MoreHorizontal,
  ListMusic, Share2, Heart, Loader2, ListPlus, PlusCircle,
  Download, FolderPlus, Disc, User, Info, X, RefreshCw, ChevronRight, CheckCircle, Mic, Mic2, Zap, Gauge, Sliders, HardDrive
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePlayer, usePlayerProgress } from '../context/usePlayer';
import { usePlaylists } from '../context/PlaylistContext';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import PlayingVisualizer from './PlayingVisualizer';
import SpectrumVisualizer from './SpectrumVisualizer';
import SongImage from './SongImage';
import { saveTrackOffline, removeTrackOffline, isTrackOffline } from '../lib/offlineStorage';
import { EQUALIZER_PRESETS } from '../hooks/useAudio';

const SoundBoosterIcon = ({ className, isBoosted = false }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("w-3.5 h-3.5 shrink-0", className)}
  >
    <polygon points="10 5 5 9 1 9 1 15 5 15 10 19 10 5" fill={isBoosted ? "currentColor" : "none"} />
    <path d="M14.5 8.5a4.5 4.5 0 0 1 0 7" strokeWidth="2.2" />
    <path d="M18 5.5a8.5 8.5 0 0 1 0 13" strokeWidth="2.2" />
    <line x1="20" y1="2" x2="20" y2="6" strokeWidth="2.2" stroke="currentColor" />
    <line x1="18" y1="4" x2="22" y2="4" strokeWidth="2.2" stroke="currentColor" />
  </svg>
);

const formatTime = (time) => {
  if (isNaN(time)) return "0:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const EQ_LABELS = ['Bass', 'Low-Mid', 'Mid', 'High-Mid', 'Treble'];
const EQ_FREQ_LABELS = ['60Hz', '250Hz', '1kHz', '4kHz', '12kHz'];

const AudioStudioModal = memo(({
  isOpen,
  onClose,
  initialTab = 'eq',
  equalizerBands,
  setEqualizerBand,
  equalizerPreset,
  setEqualizerPreset,
  crossfade,
  setCrossfade,
  soundBoost,
  setSoundBoost
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const presetNames = Object.keys(EQUALIZER_PRESETS);

  const boosterPresets = [
    { label: '100%', sub: 'Normal', value: 100 },
    { label: '150%', sub: '+3.5dB', value: 150 },
    { label: '200%', sub: '+6.0dB', value: 200 },
    { label: '250%', sub: '+8.0dB', value: 250 },
    { label: '300%', sub: 'Max', value: 300 },
  ];

  const getBoostColor = (val) => {
    if (val <= 120) return 'from-primary to-emerald-400 text-primary';
    if (val <= 180) return 'from-emerald-400 to-amber-400 text-amber-400';
    if (val <= 240) return 'from-amber-400 to-orange-500 text-orange-400';
    return 'from-orange-500 to-rose-500 text-rose-400';
  };

  const getBoostdB = (val) => {
    if (val === 100) return '0.0 dB';
    const gain = val / 100;
    const db = (20 * Math.log10(gain)).toFixed(1);
    return `+${db} dB`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overscroll-contain select-none" onClick={onClose} onTouchMove={(e) => e.stopPropagation()}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-md rounded-3xl bg-[#141416]/95 border border-white/10 p-6 shadow-2xl overflow-hidden backdrop-blur-xl text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg">
              <Sliders className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-wide">Audio Studio</h3>
              <p className="text-xs text-white/50">Equalizer, Sound Boost & Effects</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white/70" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-white/5 rounded-2xl border border-white/5 my-4">
          <button
            onClick={() => setActiveTab('eq')}
            className={cn(
              "flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
              activeTab === 'eq'
                ? "bg-white/15 text-white shadow-sm"
                : "text-white/60 hover:text-white"
            )}
          >
            <span>Equalizer</span>
            {equalizerPreset !== 'Flat' && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('boost')}
            className={cn(
              "flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
              activeTab === 'boost'
                ? "bg-white/15 text-white shadow-sm"
                : "text-white/60 hover:text-white"
            )}
          >
            <span>Sound Boost</span>
            {soundBoost > 100 && (
              <span className="text-[10px] font-black text-primary px-1.5 py-0.2 rounded-full bg-primary/20">
                {soundBoost}%
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('crossfade')}
            className={cn(
              "flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
              activeTab === 'crossfade'
                ? "bg-white/15 text-white shadow-sm"
                : "text-white/60 hover:text-white"
            )}
          >
            <span>Crossfade</span>
            {crossfade > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </button>
        </div>

        {activeTab === 'eq' && (
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-2.5">Preset</p>
              <div className="flex flex-wrap gap-1.5">
                {presetNames.map((name) => (
                  <button
                    key={name}
                    onClick={() => setEqualizerPreset(name)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 border",
                      equalizerPreset === name
                        ? "bg-primary text-black border-primary shadow-lg shadow-primary/30"
                        : "bg-white/5 hover:bg-white/10 text-white/80 border-white/5"
                    )}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-3">5-Band Equalizer</p>
              <div className="flex items-end justify-between gap-2 h-36">
                {equalizerBands.map((db, i) => (
                  <div key={i} className="flex flex-col items-center flex-1 h-full">
                    <span className="text-[10px] font-bold text-white/60 mb-1">
                      {db > 0 ? `+${db}` : db}dB
                    </span>
                    <div className="flex-1 flex items-center justify-center w-full relative">
                      <input
                        type="range"
                        min="-12"
                        max="12"
                        step="1"
                        value={db}
                        onChange={(e) => setEqualizerBand(i, Number(e.target.value))}
                        className="w-full h-24 accent-primary cursor-pointer appearance-none bg-transparent"
                        style={{
                          writingMode: 'vertical-lr',
                          direction: 'rtl',
                          WebkitAppearance: 'slider-vertical',
                        }}
                      />
                    </div>
                    <span className="text-[9px] font-bold text-white/40 mt-1">{EQ_LABELS[i]}</span>
                    <span className="text-[8px] font-mono text-white/25">{EQ_FREQ_LABELS[i]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'boost' && (
          <div className="py-2">
            <div className="my-4 text-center">
              <div className="inline-flex items-baseline gap-2">
                <span className={cn(
                  "text-5xl font-black tracking-tight bg-gradient-to-r bg-clip-text text-transparent transition-all",
                  getBoostColor(soundBoost).split(' text-')[0]
                )}>
                  {soundBoost}%
                </span>
                <span className="text-sm font-semibold text-white/60">
                  ({getBoostdB(soundBoost)})
                </span>
              </div>
              <p className="text-xs text-white/40 mt-1">
                {soundBoost === 100 ? 'Standard volume level' : soundBoost <= 180 ? 'Optimal sound boost' : 'High volume mode (distortion protected)'}
              </p>
            </div>

            <div className="space-y-2 mb-5">
              <div className="relative flex items-center">
                <input
                  type="range"
                  min="100"
                  max="300"
                  step="5"
                  value={soundBoost}
                  onChange={(e) => setSoundBoost(Number(e.target.value))}
                  className="w-full h-3 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
                />
              </div>
              <div className="flex justify-between text-[11px] font-bold text-white/40 px-1">
                <span>100% (Normal)</span>
                <span>200% (+6dB)</span>
                <span>300% (Max)</span>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2 mb-4">
              {boosterPresets.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setSoundBoost(p.value)}
                  className={cn(
                    "py-2 px-1 rounded-xl text-center transition-all flex flex-col items-center justify-center border active:scale-95",
                    soundBoost === p.value
                      ? "bg-primary text-black font-black border-primary shadow-lg shadow-primary/30"
                      : "bg-white/5 hover:bg-white/10 text-white/80 border-white/5"
                  )}
                >
                  <span className="text-xs font-bold leading-none">{p.label}</span>
                  <span className="text-[9px] opacity-70 mt-0.5 leading-none">{p.sub}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'crossfade' && (
          <div className="py-4 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">Crossfade Duration</p>
                <p className="text-xs text-white/40 mt-0.5">Smooth overlap between consecutive tracks</p>
              </div>
              <span className="text-lg font-black text-primary">{crossfade}s</span>
            </div>

            <input
              type="range"
              min="0"
              max="5"
              step="0.5"
              value={crossfade}
              onChange={(e) => setCrossfade(Number(e.target.value))}
              className="w-full h-3 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
            />
            <div className="flex justify-between text-xs font-bold text-white/40 px-1">
              <span>Off</span>
              <span>2.5s</span>
              <span>5s</span>
            </div>

            <div className="flex gap-2 pt-2">
              {[0, 1, 2, 3, 5].map((sec) => (
                <button
                  key={sec}
                  onClick={() => setCrossfade(sec)}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95",
                    crossfade === sec
                      ? "bg-primary text-black border-primary font-black shadow-md shadow-primary/20"
                      : "bg-white/5 hover:bg-white/10 text-white/70 border-white/5"
                  )}
                >
                  {sec === 0 ? 'Off' : `${sec}s`}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 pt-4 border-t border-white/10 mt-4">
          <button
            onClick={() => {
              setEqualizerPreset('Flat');
              setSoundBoost(100);
              setCrossfade(2);
            }}
            className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-semibold transition-colors"
          >
            Reset All
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-black text-xs font-bold transition-all shadow-lg shadow-primary/20 active:scale-95"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
});

const WaveVisualizer = memo(() => {
  return (
    <div className="absolute inset-x-0 bottom-0 h-64 pointer-events-none z-0 overflow-hidden opacity-30">
      <svg className="w-full h-full" viewBox="0 0 1440 320" preserveAspectRatio="none">
        <motion.path
          d="M0 160 C 320 300 420 10 720 160 C 1020 310 1120 20 1440 160 V 320 H 0 Z"
          initial={{ d: "M0 160 C 320 300 420 10 720 160 C 1020 310 1120 20 1440 160 V 320 H 0 Z" }}
          animate={{
            d: [
              "M0 160 C 320 300 420 10 720 160 C 1020 310 1120 20 1440 160 V 320 H 0 Z",
              "M0 160 C 320 20 420 310 720 160 C 1020 10 1120 300 1440 160 V 320 H 0 Z",
              "M0 160 C 320 300 420 10 720 160 C 1020 310 1120 20 1440 160 V 320 H 0 Z"
            ]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          fill="url(#wave-gradient)"
          className="opacity-50"
        />
        <defs>
          <linearGradient id="wave-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.2" />
            <stop offset="50%" stopColor="var(--color-primary)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.2" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
});

const DynamicBackground = memo(({ cover }) => (
  <>
    <div
      className="absolute inset-0 z-0 opacity-100 blur-[80px] pointer-events-none scale-[2] transform-gpu will-change-[filter,transform]"
      style={{
        backgroundImage: `url(${cover})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover'
      }}
    />
    <div className="absolute inset-0 z-0 bg-bg-base/60 bg-gradient-to-b from-bg-base/20 via-transparent to-bg-base/90 pointer-events-none" />
  </>
));

const UpNextPanel = memo(({ queue, activeSong, playSong, activeItemRef }) => (
  <div className="hidden md:flex flex-col w-[320px] h-[62vh] glass-premium rounded-[3rem] p-8 border border-border-main/5 relative overflow-hidden group">
    <div className="absolute inset-0 bg-gradient-to-br from-text-primary/5 to-transparent pointer-events-none" />
    <h3 className="text-text-secondary/40 text-[10px] font-black uppercase tracking-[0.4em] mb-10 relative z-10">Up Next</h3>
    <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth overscroll-contain mask-fade-v space-y-7 relative z-10 pr-2 pb-20">
      {queue?.map((song, i) => (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          key={song.id}
          ref={activeSong?.id === song.id ? activeItemRef : null}
          className={cn(
            "flex items-center gap-5 group/item cursor-pointer",
            activeSong?.id === song.id && "bg-primary/5 p-2 -m-2 rounded-2xl border border-primary/20 shadow-[0_0_15px_rgba(var(--primary-rgb),0.05)]"
          )}
          onClick={() => playSong(song)}
        >
          <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 shadow-2xl group-hover/item:scale-110 transition-transform duration-500 bg-bg-surface flex items-center justify-center relative">
            <SongImage
              src={song.thumbnail || song.cover}
              alt={song.title}
              className="w-full h-full object-cover"
            />
            {activeSong?.id === song.id && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                 <PlayingVisualizer className="h-3 gap-[1px]" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn("text-[15px] font-bold truncate transition-colors", activeSong?.id === song.id ? "text-primary" : "text-text-primary group-hover/item:text-primary")}>{song.title}</p>
            <p className="text-[11px] text-text-secondary/30 font-bold truncate uppercase tracking-widest mt-1">{song.artist}</p>
          </div>
        </motion.div>
      ))}
    </div>
  </div>
));

const MarqueeTitle = memo(({ text, className }) => {
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
          setOverflowDistance(diff + 16);
        } else {
          setIsOverflowing(false);
          setOverflowDistance(0);
        }
      }
    };
    checkOverflow();
    const handleResize = () => checkOverflow();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [text]);

  return (
    <div ref={containerRef} className="overflow-hidden w-full relative whitespace-nowrap text-left md:text-center">
      <motion.h2
        ref={textRef}
        className={cn("inline-block", className)}
        animate={isOverflowing ? {
          x: [0, 0, -overflowDistance, -overflowDistance, 0],
        } : { x: 0 }}
        transition={isOverflowing ? {
          duration: Math.max(5, overflowDistance / 24),
          repeat: Infinity,
          ease: "easeInOut",
          times: [0, 0.2, 0.7, 0.85, 1],
          repeatDelay: 1.5,
        } : {}}
      >
        {text}
      </motion.h2>
    </div>
  );
});

const PlayerHero = memo(({ activeSong, likedSongs, toggleLike }) => (
  <div className="flex-1 flex flex-col justify-end md:justify-center w-full max-w-2xl min-h-0 pt-2 pb-2 md:py-8 relative">
    <div className="relative w-full flex-1 min-h-0 flex items-center justify-center mb-6 md:mb-8 group px-8 md:px-0">
      <div className="absolute inset-0 bg-primary/25 blur-[120px] rounded-full opacity-40 group-hover:opacity-70 transition-opacity duration-1000 hidden md:block" />
      <motion.div
        key={activeSong.id + 'artwork'}
        className="relative z-10 w-full h-full max-w-[500px] md:max-w-[440px] flex items-center justify-center"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <SongImage
          src={activeSong.cover}
          alt={activeSong.title}
          className="rounded-md shadow-2xl md:rounded-[3.5rem] md:shadow-[0_50px_100px_rgba(0,0,0,0.4)] dark:md:shadow-[0_50px_100px_rgba(0,0,0,0.7)] md:border md:border-border-main/10 group-hover:rotate-2 group-hover:scale-105 transition-all duration-700 ease-out"
          style={{ width: '100%', height: '100%', maxWidth: '100%', maxHeight: '100%', objectFit: 'cover', aspectRatio: '1/1' }}
        />
      </motion.div>
    </div>

    <div className="w-full px-8 md:px-0 relative z-10 text-left md:text-center mt-auto flex-shrink-0">
      <motion.div
        key={activeSong.id + 'info'}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col md:items-center gap-1 md:gap-3 w-full"
      >
        <MarqueeTitle
          text={activeSong.title}
          className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight"
        />
        <div className="flex items-center gap-3 text-text-secondary/60 text-base md:text-sm font-normal tracking-tight truncate w-full md:justify-center">
          <span className="truncate">{activeSong.artist}</span>
          <div className="w-1.5 h-1.5 rounded-full bg-border-main/20 hidden md:block" />
          <Heart
            className={cn(
              "w-7 h-7 transition-all cursor-pointer hover:scale-125 active:scale-90 hidden md:block",
              likedSongs.includes(activeSong.id) ? "text-primary fill-current drop-shadow-[0_0_10px_rgba(29,185,84,0.5)]" : "text-text-secondary/20 hover:text-text-primary"
            )}
            onClick={(e) => {
              e.stopPropagation();
              toggleLike(activeSong);
            }}
          />
        </div>
      </motion.div>
    </div>
  </div>
));

const LyricLine = memo(({ text, isActive, onClick }) => {
  return (
    <motion.p
      initial={false}
      animate={{
        opacity: isActive ? 1 : 0.25,
        scale: isActive ? 1.05 : 1,
        color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
        filter: isActive ? 'blur(0px)' : 'blur(1px)'
      }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      className={cn(
        "text-xl md:text-2xl font-black text-center px-4 transition-all duration-700",
        isActive ? "drop-shadow-[0_0_20px_rgba(29,185,84,0.4)]" : "hover:opacity-100 cursor-pointer"
      )}
      onClick={onClick}
    >
      {text}
    </motion.p>
  );
});
const LyricsPanel = memo(({
  isLyricsLoading, lyrics, activeIndex, lyricsContainerRef, handleLyricsScroll,
  seek, duration, activeSong, setIsAutoScrollEnabled, isExpanded, onToggle,
  subTab, setSubTab
}) => (
  <motion.div
    layout
    initial={false}
    animate={{
      width: isExpanded ? "360px" : "80px",
      height: "62vh"
    }}
    transition={{ type: "spring", damping: 30, stiffness: 200 }}
    className="hidden md:flex flex-col glass-premium rounded-[3rem] p-8 border border-border-main/5 relative overflow-hidden group cursor-pointer"
    onClick={() => !isExpanded && onToggle()}
  >
    <div className="absolute inset-0 bg-gradient-to-bl from-white/5 to-transparent pointer-events-none" />

    <div className={cn(
      "flex items-center justify-between mb-10 relative z-10",
      !isExpanded && "flex-col gap-10 mt-4"
    )}>
      <div className={cn("flex items-center gap-8", !isExpanded && "flex-col gap-10")}>
        <button
          className={cn(
            "text-[11px] font-black uppercase tracking-[0.4em] transition-all",
            isExpanded && subTab === 'lyrics' ? "text-text-primary" : "text-text-secondary/40",
            !isExpanded && "rotate-90"
          )}
          onClick={(e) => {
            e.stopPropagation();
            if (isExpanded) {
              setSubTab('lyrics');
            } else {
              onToggle();
            }
          }}
        >
          {isExpanded ? "Lyrics" : <ListMusic className="w-5 h-5 -rotate-90" />}
        </button>
        {isExpanded && (
          <button
            className={cn(
              "text-[11px] font-black uppercase tracking-[0.3em] transition-all",
              subTab === 'credits' ? "text-text-primary" : "text-text-secondary/20 hover:text-text-secondary/40"
            )}
            onClick={(e) => {
              e.stopPropagation();
              setSubTab('credits');
            }}
          >
            Credits
          </button>
        )}
      </div>

      {isExpanded && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="p-2 hover:bg-bg-surface/50 rounded-full text-text-secondary/20 hover:text-text-primary transition-all active:scale-90"
          title="Collapse"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </div>

    {isExpanded && (
      <div className="flex-1 overflow-hidden relative z-10">
        <AnimatePresence mode="wait">
          {subTab === 'lyrics' ? (
            <motion.div
              key="lyrics"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full flex flex-col"
            >
              <div
                ref={lyricsContainerRef}
                onScroll={handleLyricsScroll}
                className="flex-1 overflow-y-auto no-scrollbar scroll-smooth overscroll-contain mask-fade-v space-y-12 pr-2 pb-20"
              >
                {isLyricsLoading ? (
                  <div className="flex flex-col items-center justify-center h-full gap-5">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <p className="text-text-secondary/20 text-[10px] font-black uppercase tracking-[0.4em]">Retrieving</p>
                  </div>
                ) : lyrics.length > 0 ? (
                  lyrics.map((line, i) => (
                    <LyricLine
                      key={i}
                      text={line.text}
                      isActive={activeIndex === i}
                      onClick={() => {
                        line.time > 0 && seek((line.time / duration) * 100);
                        setIsAutoScrollEnabled(true);
                      }}
                    />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6 gap-8">
                    <p className="text-text-secondary/30 text-lg font-bold">No lyrics currently synced</p>
                    <button
                      onClick={() => window.open(`https://genius.com/search?q=${encodeURIComponent(`${activeSong.artist} ${activeSong.title}`)}`, '_blank')}
                      className="px-8 py-3 rounded-full border border-border-main/10 text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary/40 hover:text-text-primary hover:bg-bg-surface transition-all shadow-xl"
                    >
                      Find on Genius
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="credits"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={{
                initial: { opacity: 0 },
                animate: { opacity: 1, transition: { staggerChildren: 0.1 } },
                exit: { opacity: 0 }
              }}
              className="h-full flex flex-col"
            >
              <div className="flex-1 overflow-y-auto no-scrollbar mask-fade-v pt-4 pb-20 space-y-10">
                <motion.div
                  variants={{
                    initial: { opacity: 0, y: 10 },
                    animate: { opacity: 1, y: 0 }
                  }}
                  className="space-y-2"
                >
                  <p className="text-[9px] font-black uppercase tracking-[0.4em] text-text-secondary/20">Performed by</p>
                  <p className="text-2xl font-black text-text-primary">{activeSong.artist}</p>
                </motion.div>

                {activeSong.album && (
                  <motion.div
                    variants={{
                      initial: { opacity: 0, y: 10 },
                      animate: { opacity: 1, y: 0 }
                    }}
                    className="space-y-2"
                  >
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-text-secondary/20">Album</p>
                    <p className="text-lg font-bold text-text-primary/80">{activeSong.album}</p>
                  </motion.div>
                )}

                <div className="grid grid-cols-2 gap-8">
                  {activeSong.year && (
                    <motion.div
                      variants={{
                        initial: { opacity: 0, y: 10 },
                        animate: { opacity: 1, y: 0 }
                      }}
                      className="space-y-2"
                    >
                      <p className="text-[9px] font-black uppercase tracking-[0.4em] text-text-secondary/20">Released</p>
                      <p className="text-sm font-bold text-text-secondary/60">{activeSong.year}</p>
                    </motion.div>
                  )}
                  {activeSong.genre && (
                    <motion.div
                      variants={{
                        initial: { opacity: 0, y: 10 },
                        animate: { opacity: 1, y: 0 }
                      }}
                      className="space-y-2"
                    >
                      <p className="text-[9px] font-black uppercase tracking-[0.4em] text-text-secondary/20">Genre</p>
                      <p className="text-sm font-bold text-text-secondary/60">{activeSong.genre}</p>
                    </motion.div>
                  )}
                </div>

                <motion.div
                  variants={{
                    initial: { opacity: 0, y: 10 },
                    animate: { opacity: 1, y: 0 }
                  }}
                  className="pt-10 space-y-8"
                >
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-white/5 to-transparent mb-10" />

                  <div className="space-y-6">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-[0.4em] text-text-secondary/20">Service by</p>
                      <p className="text-sm font-bold text-text-secondary/60">SumanOnline.Com</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-[0.4em] text-text-secondary/20">Developed by</p>
                      <p className="text-sm font-bold text-text-secondary/60">Suman Chakrabortty</p>
                    </div>
                  </div>

                  <button
                    onClick={() => window.open(`https://genius.com/search?q=${encodeURIComponent(`${activeSong.artist} ${activeSong.title}`)}`, '_blank')}
                    className="w-full py-4 rounded-2xl border border-border-main/10 bg-bg-surface/50 hover:bg-bg-surface transition-all text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary/60 hover:text-text-primary flex items-center justify-center gap-3 active:scale-[0.98] mt-10"
                  >
                    View detailed credits on Genius
                  </button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )}

    {!isExpanded && (
      <div className="absolute inset-x-0 bottom-10 flex justify-center z-10">
        <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_10px_rgba(29,185,84,0.5)]" />
      </div>
    )}
  </motion.div>
));

const TimeDisplay = memo(({ currentTime, duration }) => (
  <div className="flex justify-between text-[11px] font-medium text-text-secondary/50 tracking-wide mt-1.5">
    <span>{formatTime(currentTime)}</span>
    <span>{formatTime(duration)}</span>
  </div>
));

const DraggableVolumeSlider = memo(({ volume, setVolume }) => {
  const isDragging = useRef(false);
  const trackRef = useRef(null);

  const calculateVolume = useCallback((clientX) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pos = (clientX - rect.left) / rect.width;
    const clamped = Math.max(0, Math.min(1, pos));
    setVolume(clamped);
  }, [setVolume]);

  const handlePointerDown = (e) => {
    isDragging.current = true;
    calculateVolume(e.clientX);
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch (_) {}

    const onPointerMove = (moveEvent) => {
      if (isDragging.current) {
        calculateVolume(moveEvent.clientX);
      }
    };

    const onPointerUp = (upEvent) => {
      if (isDragging.current) {
        isDragging.current = false;
        try {
          upEvent.currentTarget?.releasePointerCapture?.(upEvent.pointerId);
        } catch (_) {}
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  return (
    <div
      ref={trackRef}
      onPointerDown={handlePointerDown}
      className="flex-1 h-7 flex items-center cursor-pointer select-none relative group/voltouch touch-none"
      title={`Volume: ${Math.round(volume * 100)}%`}
    >
      <div className="w-full h-[4px] bg-border-main/20 group-hover/voltouch:h-[6px] rounded-full relative overflow-hidden transition-all">
        <div
          className="h-full bg-text-primary group-hover/voltouch:bg-primary transition-colors rounded-full"
          style={{ width: `${volume * 100}%` }}
        />
      </div>
      <div
        className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full opacity-0 group-hover/voltouch:opacity-100 shadow-md transition-opacity pointer-events-none"
        style={{ left: `calc(${volume * 100}% - 7px)` }}
      />
    </div>
  );
});

const ProgressBar = memo(({ progress, seek }) => {
  const isDragging = useRef(false);
  const trackRef = useRef(null);

  const calculateSeek = useCallback((clientX) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    seek(percent);
  }, [seek]);

  const handlePointerDown = (e) => {
    isDragging.current = true;
    calculateSeek(e.clientX);
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch (_) {}

    const onPointerMove = (moveEvent) => {
      if (isDragging.current) {
        calculateSeek(moveEvent.clientX);
      }
    };

    const onPointerUp = (upEvent) => {
      if (isDragging.current) {
        isDragging.current = false;
        try {
          upEvent.currentTarget?.releasePointerCapture?.(upEvent.pointerId);
        } catch (_) {}
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  return (
    <div
      ref={trackRef}
      onPointerDown={handlePointerDown}
      className="relative w-full h-6 flex items-center cursor-pointer group touch-none select-none"
    >
      <div className="w-full h-[3px] bg-border-main/20 group-hover:h-[5px] rounded-full relative overflow-hidden transition-all">
        <div
          className="absolute left-0 top-0 bottom-0 bg-primary rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div
        className="w-3.5 h-3.5 bg-white rounded-full opacity-0 group-hover:opacity-100 shadow-md transition-opacity absolute top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ left: `calc(${progress}% - 7px)` }}
      />
    </div>
  );
});

const PlaybackControls = memo(({
  isShuffle, setIsShuffle, playPrevious, togglePlay, isBuffering, isPlaying, playNext, repeatMode, setRepeatMode
}) => (
  <div className="flex items-center justify-between w-full px-0">
    <Shuffle
      className={cn("w-[22px] h-[22px] transition-colors cursor-pointer", isShuffle ? "text-primary" : "text-text-secondary/40 hover:text-text-primary")}
      onClick={() => setIsShuffle(!isShuffle)}
    />
    <div className="flex items-center gap-7 md:gap-10">
      <SkipBack className="w-8 h-8 text-text-primary fill-current hover:text-primary transition-colors cursor-pointer active:scale-90" onClick={playPrevious} />

      <button
        className="group relative"
        onClick={togglePlay}
        disabled={isBuffering}
      >
        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block" />
        <div className="relative w-[72px] h-[72px] md:w-16 md:h-16 rounded-full bg-text-primary flex items-center justify-center shadow-xl group-active:scale-95 transition-transform overflow-hidden">
          {isBuffering ? (
            <Loader2 className="w-8 h-8 text-bg-surface animate-spin" />
          ) : isPlaying ? (
            <Pause className="text-bg-surface w-8 h-8 fill-current" />
          ) : (
            <Play className="text-bg-surface w-8 h-8 fill-current ml-1" />
          )}
        </div>
      </button>

      <SkipForward className="w-8 h-8 text-text-primary fill-current hover:text-primary transition-colors cursor-pointer active:scale-90" onClick={playNext} />
    </div>
    <Repeat
      className={cn("w-[22px] h-[22px] transition-colors cursor-pointer", repeatMode !== 'none' ? "text-primary" : "text-text-secondary/40 hover:text-text-primary")}
      onClick={() => setRepeatMode(repeatMode === 'none' ? 'all' : repeatMode === 'all' ? 'one' : 'none')}
    />
  </div>
));

const DesktopBottomScrubber = memo(({ duration, seek }) => {
  const { progress, currentTime } = usePlayerProgress();
  return (
    <div className="w-full flex items-center gap-2.5">
      <span className="text-[11px] font-mono font-bold text-text-secondary min-w-[34px] text-right">
        {formatTime(currentTime)}
      </span>
      <div
        className="flex-1 h-3 flex items-center cursor-pointer group/scrub relative"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
          seek(pct);
        }}
      >
        <div className="w-full h-1 group-hover/scrub:h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden relative transition-all">
          <div
            className="h-full bg-primary rounded-full transition-all duration-75 relative"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <span className="text-[11px] font-mono font-bold text-text-secondary min-w-[34px]">
        {formatTime(duration)}
      </span>
    </div>
  );
});

const DesktopAmbientBackdrop = memo(({ cover }) => (
  <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
    <div
      className="absolute inset-0 scale-110 blur-[48px] opacity-70 dark:opacity-35 transition-all duration-700 transform-gpu will-change-transform"
      style={{
        backgroundImage: `radial-gradient(circle at 35% 40%, var(--color-primary), transparent 65%), url(${cover})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover'
      }}
    />
    <div className="absolute inset-0 bg-[#f8f9fa]/85 dark:bg-[#0c0c0e]/90 transition-colors duration-300" />
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,rgba(var(--primary-rgb),0.10),transparent_70%)]" />
  </div>
));

const DesktopQueueTab = memo(({ queue, currentSong, isPlaying, playSong, setOptionsSong, activeItemRef }) => (
  <motion.div
    key="desktop-upnext"
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 20 }}
    className="space-y-2 pr-1"
  >
    {queue?.map((song) => {
      const isCurrent = currentSong?.id === song.id;
      return (
        <div
          key={song.id}
          ref={isCurrent ? activeItemRef : null}
          className={cn(
            "flex items-center gap-3.5 p-2.5 rounded-2xl transition-all cursor-pointer group/q border",
            isCurrent
              ? "bg-primary/10 border-primary/30 text-primary shadow-sm"
              : "bg-transparent hover:bg-black/5 dark:hover:bg-white/5 border-transparent text-text-primary"
          )}
          onClick={() => playSong(song)}
        >
          <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 relative shadow-sm bg-bg-surface">
            <SongImage src={song.thumbnail || song.cover} alt={song.title} className="w-full h-full object-cover" />
            {isCurrent && isPlaying ? (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <PlayingVisualizer className="h-3 gap-[1px]" />
              </div>
            ) : (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/q:opacity-100 transition-opacity">
                <Play className="w-4 h-4 text-white ml-0.5 fill-white" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn("text-sm font-bold truncate leading-tight", isCurrent ? "text-primary" : "text-text-primary group-hover/q:text-primary")}>
              {song.title}
            </p>
            <p className="text-xs text-text-secondary truncate mt-1">
              {song.artist}
            </p>
          </div>
          {isCurrent && isPlaying && (
            <PlayingVisualizer className="h-3 gap-[1px] hidden lg:flex" />
          )}
          <div className="flex items-center pr-1">
            <MoreHorizontal
              className="w-4 h-4 text-text-secondary hover:text-text-primary transition-colors cursor-pointer opacity-0 group-hover/q:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                setOptionsSong(song);
              }}
            />
          </div>
        </div>
      );
    })}
  </motion.div>
));

const DesktopLyricsTab = memo(({ lyrics, isLyricsLoading, duration, seek, isAutoScrollEnabled, setIsAutoScrollEnabled }) => {
  const { currentTime } = usePlayerProgress();
  const lyricsContainerRef = useRef(null);

  const activeIndex = useMemo(() => {
    if (!lyrics || lyrics.length === 0) return -1;
    const adjustedTime = currentTime + 0.15;
    return lyrics.findIndex((line, i) => {
      const nextLine = lyrics[i + 1];
      return adjustedTime >= line.time && (!nextLine || adjustedTime < nextLine.time);
    });
  }, [lyrics, currentTime]);

  useEffect(() => {
    if (lyrics?.length > 0 && lyricsContainerRef.current && isAutoScrollEnabled) {
      if (activeIndex !== -1) {
        const element = lyricsContainerRef.current.children[activeIndex];
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [activeIndex, lyrics, isAutoScrollEnabled]);

  return (
    <motion.div
      key="desktop-lyrics"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-6 pb-12 pr-4 pl-2 pt-2"
      ref={lyricsContainerRef}
    >
      {isLyricsLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm font-bold text-text-primary uppercase tracking-widest">Loading Lyrics...</p>
        </div>
      ) : lyrics?.length > 0 ? (
        lyrics.map((line, i) => (
          <p
            key={i}
            onClick={() => {
              if (line.time > 0) seek((line.time / duration) * 100);
              setIsAutoScrollEnabled(true);
            }}
            className={cn(
              "text-2xl lg:text-3xl font-black transition-all duration-300 cursor-pointer leading-snug",
              i === activeIndex
                ? "text-primary drop-shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] scale-[1.02] origin-left"
                : "text-text-secondary/40 hover:text-text-secondary"
            )}
          >
            {line.text}
          </p>
        ))
      ) : (
        <div className="flex flex-col items-center justify-center text-center py-20 gap-4 opacity-50">
          <p className="text-xl font-bold text-text-secondary">Lyrics unavailable</p>
        </div>
      )}
    </motion.div>
  );
});

const DesktopCreditsTab = memo(({ activeSong }) => (
  <motion.div
    key="desktop-credits"
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 20 }}
    className="space-y-8 pb-16 pr-4 pl-2 pt-4"
  >
    <div className="space-y-2 p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-border-main/5">
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-secondary/50">Performed by</p>
      <p className="text-2xl font-black text-text-primary tracking-tight">{activeSong.artist}</p>
    </div>

    {activeSong.album && (
      <div className="space-y-2 p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-border-main/5">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-secondary/50">Album</p>
        <p className="text-lg font-bold text-text-primary">{activeSong.album}</p>
      </div>
    )}

    <div className="grid grid-cols-2 gap-4">
      {activeSong.year && (
        <div className="space-y-1.5 p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-border-main/5">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-secondary/50">Released</p>
          <p className="text-sm font-bold text-text-secondary">{activeSong.year}</p>
        </div>
      )}
      {activeSong.genre && (
        <div className="space-y-1.5 p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-border-main/5">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-secondary/50">Genre</p>
          <p className="text-sm font-bold text-text-secondary">{activeSong.genre}</p>
        </div>
      )}
    </div>

    <div className="pt-4 space-y-4">
      <button
        onClick={() => window.open(`https://genius.com/search?q=${encodeURIComponent(`${activeSong.artist} ${activeSong.title}`)}`, '_blank')}
        className="w-full py-3.5 rounded-2xl border border-border-main/15 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all text-xs font-bold uppercase tracking-widest text-text-secondary hover:text-text-primary flex items-center justify-center gap-2 active:scale-95 shadow-sm"
      >
        View on Genius
      </button>
    </div>
  </motion.div>
));

const MusicPlayer = () => {
  const { user } = useAuth();
  const {
    songs,
    queue,
    currentSong,
    isPlaying,
    duration,
    togglePlay,
    playNext,
    playPrevious,
    playSong,
    seek,
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
    isShuffle,
    setIsShuffle,
    repeatMode,
    setRepeatMode,
    isBuffering,
    optionsSong,
    setOptionsSong,
    likedSongs,
    toggleLike,
    lyrics,
    isLyricsLoading,
    isFullScreen,
    setIsFullScreen
  } = usePlayer();

  const { progress, currentTime } = usePlayerProgress();

  const [activeTab, setActiveTab] = useState('upnext');
  const { showToast } = useToast();
  const [prevVolume, setPrevVolume] = useState(1.0);
  const [isAudioStudioOpen, setIsAudioStudioOpen] = useState(false);
  const [audioStudioTab, setAudioStudioTab] = useState('eq');
  const [offlineProgress, setOfflineProgress] = useState(null);
  const { playlists, createPlaylist, addSongToPlaylist } = usePlaylists();
  const [isPlaylistPickerOpen, setIsPlaylistPickerOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showNewPlaylistInput, setShowNewPlaylistInput] = useState(false);
  const [isTabCollapsed, setIsTabCollapsed] = useState(true);
  const [isLyricsExpanded, setIsLyricsExpanded] = useState(false);
  const [lyricsSubTab, setLyricsSubTab] = useState('lyrics');
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverX, setHoverX] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const isAppRoute = location.pathname.startsWith('/app');

  const relatedSongs = useMemo(() => {
    if (!currentSong || !songs) return [];
    const primaryArtist = currentSong.artist.split(/\s*,\s*|\s*&\s*|\s+and\s+/i)[0].trim().toLowerCase();

    return songs.filter(song =>
      song.id !== currentSong.id &&
      song.title !== currentSong.title &&
      (song.artist.toLowerCase().includes(primaryArtist) || currentSong.artist.toLowerCase().includes(song.artist.toLowerCase()))
    ).slice(0, 30);
  }, [currentSong, songs]);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isAnyModalOpen = isAudioStudioOpen || Boolean(optionsSong) || isPlaylistPickerOpen;

  useEffect(() => {
    if (isFullScreen || isAnyModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isFullScreen, isAnyModalOpen]);

  useEffect(() => {
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (!themeColorMeta) return;
    const prevColor = themeColorMeta.getAttribute('content');
    if (isFullScreen && !isDesktop) {
      themeColorMeta.setAttribute('content', '#000000');
    }
    return () => {
      if (prevColor && isFullScreen && !isDesktop) {
        themeColorMeta.setAttribute('content', prevColor);
      }
    };
  }, [isFullScreen, isDesktop]);


  const toggleMute = () => {
    if (volume > 0) {
      setPrevVolume(volume);
      setVolume(0);
    } else {
      setVolume(prevVolume || 0.7);
    }
  };

  const handleOptionClick = (msg) => {
    showToast(msg);
    setOptionsSong(null);
  };

  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const lyricsContainerRef = useRef(null);
  const activeQueueItemRef = useRef(null);
  const autoScrollTimeoutRef = useRef(null);

  const activeIndex = useMemo(() => {
    if (!lyrics.length) return -1;
    const adjustedTime = currentTime + 0.15;
    return lyrics.findIndex((line, i) => {
      const nextLine = lyrics[i + 1];
      return adjustedTime >= line.time && (!nextLine || adjustedTime < nextLine.time);
    });
  }, [lyrics, currentTime]);

  useEffect(() => {
    if (activeTab === 'lyrics' && lyrics.length > 0 && lyricsContainerRef.current && isAutoScrollEnabled) {
      const isMobile = window.innerWidth < 768;
      if (isMobile && isTabCollapsed) return;

      if (activeIndex !== -1) {
        const element = lyricsContainerRef.current.children[activeIndex];
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [activeIndex, activeTab, lyrics, isAutoScrollEnabled, isTabCollapsed]);

  const handleLyricsScroll = useCallback(() => {
    if (!isAutoScrollEnabled) {
      if (autoScrollTimeoutRef.current) clearTimeout(autoScrollTimeoutRef.current);
      autoScrollTimeoutRef.current = setTimeout(() => {
        setIsAutoScrollEnabled(true);
      }, 3000);
      return;
    }

    setIsAutoScrollEnabled(false);
    autoScrollTimeoutRef.current = setTimeout(() => {
      setIsAutoScrollEnabled(true);
    }, 3000);
  }, [isAutoScrollEnabled]);

  const activeSong = currentSong;

  useEffect(() => {
    if (activeTab === 'upnext' && activeQueueItemRef.current) {
      const isMobile = window.innerWidth < 768;
      if (!isMobile || !isTabCollapsed) {
        activeQueueItemRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }
    }
  }, [currentSong?.id, activeTab, isTabCollapsed, isFullScreen]);


  if (location.pathname === '/' || location.pathname.includes('admin-panel') || location.pathname === '/app/profile') return null;

  return (
    <>
      {currentSong && (
        <>
          <motion.div
            drag={isDesktop ? false : "x"}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, { offset, velocity }) => {
              if (isDesktop) return;
              if (offset.x > 100 || velocity.x > 500) {
                playPrevious();
              } else if (offset.x < -100 || velocity.x < -500) {
                playNext();
              }
            }}
            className={cn(
              "fixed left-0 right-0 h-20 bg-bg-surface border-t border-border-main/10 px-3 md:px-6 flex items-center justify-between z-[90] transition-all duration-300 md:h-20 md:bg-bg-surface/95 md:backdrop-blur-lg",
              !isDesktop && "cursor-grab active:cursor-grabbing",
              "bottom-0 border-b border-border-main/10 md:border-b-0",
              isFullScreen ? "opacity-0 pointer-events-none md:opacity-100 md:pointer-events-auto" : "opacity-100"
            )}
          >
            <div
              className="absolute top-0 left-0 right-0 h-4 -mt-2 z-10 group cursor-pointer flex items-center touch-none hidden md:flex select-none"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percentage = Math.max(0, Math.min(1, x / rect.width));
                setHoverTime(percentage * duration);
                setHoverX(x);
              }}
              onMouseLeave={() => setHoverTime(null)}
              onPointerDown={(e) => {
                const target = e.currentTarget;
                const handleSeekFromEvent = (ev) => {
                  const rect = target.getBoundingClientRect();
                  const pct = Math.max(0, Math.min(100, ((ev.clientX - rect.left) / rect.width) * 100));
                  seek(pct);
                };
                handleSeekFromEvent(e);
                try {
                  target.setPointerCapture?.(e.pointerId);
                } catch (_) {}

                const onPointerMove = (moveEv) => {
                  handleSeekFromEvent(moveEv);
                };
                const onPointerUp = (upEv) => {
                  try {
                    target.releasePointerCapture?.(upEv.pointerId);
                  } catch (_) {}
                  window.removeEventListener('pointermove', onPointerMove);
                  window.removeEventListener('pointerup', onPointerUp);
                };
                window.addEventListener('pointermove', onPointerMove);
                window.addEventListener('pointerup', onPointerUp);
              }}
            >
              <div className="w-full h-[2px] bg-border-main/20 relative transition-all duration-200 group-hover:h-[4px]">
                <motion.div
                  className="absolute left-0 top-0 bottom-0 bg-primary"
                  style={{ width: `${progress}%` }}
                  transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-primary rounded-full scale-0 group-hover:scale-100 transition-transform duration-200 shadow-lg translate-x-1/2" />
                </motion.div>
              </div>
              <AnimatePresence>
                {hoverTime !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full mb-2 -translate-x-1/2 bg-[#282828] text-white/90 text-[11px] font-bold px-2 py-1 rounded shadow-xl pointer-events-none whitespace-nowrap"
                    style={{ left: hoverX }}
                  >
                    {formatTime(hoverTime)}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-border-main/10 overflow-hidden md:hidden">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              />
            </div>

            <div className="flex md:hidden items-center justify-between w-full h-full gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0" onClick={() => setIsFullScreen(true)}>
                <motion.div
                  className="w-14 h-14 rounded-md overflow-hidden bg-bg-base border border-border-main/5 flex-shrink-0"
                  animate={{
                    scale: isPlaying ? [1, 1.05, 1] : 1,
                    boxShadow: isPlaying ? "0 0 20px rgba(29, 185, 84, 0.2)" : "none"
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <SongImage src={activeSong.cover} alt={activeSong.title} className="w-full h-full object-cover" />
                </motion.div>
                <div className="min-w-0 leading-tight">
                  <h4 className="text-text-primary font-medium text-sm truncate">{activeSong.title}</h4>
                  <p className="text-text-secondary text-xs truncate">{activeSong.artist}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0 text-text-primary">
                <button className="w-8 h-8 rounded-full bg-text-primary flex items-center justify-center" onClick={togglePlay} disabled={isBuffering}>
                  {isBuffering ? <Loader2 className="w-4 h-4 text-bg-surface animate-spin" /> : isPlaying ? <Pause className="text-bg-surface w-4 h-4 fill-current" /> : <Play className="text-bg-surface w-4 h-4 fill-current" />}
                </button>
                <SkipForward className="w-5 h-5 text-text-secondary hover:text-text-primary transition-colors cursor-pointer" onClick={playNext} />
              </div>
            </div>

            <div className="hidden md:flex items-center justify-between w-full h-full gap-6 px-4">
              <div className="flex items-center gap-3.5 min-w-[280px] max-w-[360px] shrink-0 overflow-hidden group/art">
                <div className="w-14 h-14 rounded-xl bg-bg-base overflow-hidden flex-shrink-0 cursor-pointer relative flex items-center justify-center shadow-md border border-border-main/10 group-hover/art:scale-105 transition-all" onClick={() => setIsFullScreen(true)}>
                  <SongImage src={activeSong.cover} alt={activeSong.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/art:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="min-w-0 leading-tight flex-1">
                  <h4 className="text-text-primary font-bold text-sm lg:text-[15px] truncate hover:text-primary transition-colors cursor-pointer" onClick={() => setIsFullScreen(true)}>{activeSong.title}</h4>
                  <p className="text-text-secondary text-xs lg:text-[13px] font-medium truncate mt-0.5 hover:text-text-primary transition-colors cursor-pointer">{activeSong.artist}</p>
                </div>
                <Heart
                  className={cn(
                    "w-5 h-5 transition-all cursor-pointer shrink-0 hover:scale-110 active:scale-95 ml-1",
                    likedSongs.includes(activeSong.id) ? "text-primary fill-current" : "text-text-secondary hover:text-text-primary"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLike(activeSong);
                  }}
                />
              </div>

              <div className="flex flex-col items-center flex-1 max-w-[680px] min-w-0 justify-center gap-1.5 px-2">
                <div className="flex items-center gap-6">
                  <button className="p-1.5 text-text-secondary hover:text-text-primary transition-colors active:scale-95" onClick={() => setIsShuffle(!isShuffle)} title="Shuffle">
                    <Shuffle className={cn("w-4 h-4", isShuffle ? "text-primary" : "text-text-secondary hover:text-text-primary")} />
                  </button>
                  <button className="p-1.5 text-text-secondary hover:text-text-primary transition-colors active:scale-95" onClick={playPrevious} title="Previous">
                    <SkipBack className="w-5 h-5 fill-current" />
                  </button>
                  <button
                    onClick={togglePlay}
                    disabled={isBuffering}
                    className="w-10 h-10 rounded-full bg-text-primary text-bg-surface flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md"
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    {isBuffering ? <Loader2 className="w-5 h-5 animate-spin" /> : isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                  </button>
                  <button className="p-1.5 text-text-secondary hover:text-text-primary transition-colors active:scale-95" onClick={playNext} title="Next">
                    <SkipForward className="w-5 h-5 fill-current" />
                  </button>
                  <button className="p-1.5 text-text-secondary hover:text-text-primary transition-colors active:scale-95" onClick={() => setRepeatMode(repeatMode === 'none' ? 'all' : repeatMode === 'all' ? 'one' : 'none')} title="Repeat">
                    <Repeat className={cn("w-4 h-4", repeatMode !== 'none' ? "text-primary" : "text-text-secondary hover:text-text-primary")} />
                  </button>
                </div>
                <DesktopBottomScrubber duration={duration} seek={seek} />
              </div>

              <div className="flex items-center justify-end gap-2 min-w-[280px] max-w-[360px] shrink-0 pr-1">
                <button
                  onClick={() => {
                    setAudioStudioTab('eq');
                    setIsAudioStudioOpen(true);
                  }}
                  className={cn(
                    "px-2.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 text-xs font-bold active:scale-95 border",
                    soundBoost > 100 || equalizerPreset !== 'Flat'
                      ? "bg-primary/20 text-primary border-primary/40 shadow-sm"
                      : "hover:bg-black/5 dark:hover:bg-white/10 text-text-secondary hover:text-text-primary border-transparent"
                  )}
                  title="Audio Studio (EQ, Boost & Effects)"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  {soundBoost > 100 && (
                    <span className="text-[11px] font-extrabold text-primary">{soundBoost}%</span>
                  )}
                </button>

                <div className="flex items-center gap-2 w-[120px] group/vol mx-1">
                  <button onClick={toggleMute} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors active:scale-95 text-text-secondary hover:text-text-primary">
                    {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <DraggableVolumeSlider volume={volume} setVolume={setVolume} />
                </div>

                <button
                  onClick={() => {
                    setOptionsSong(optionsSong?.id === activeSong.id ? null : activeSong);
                  }}
                  className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors active:scale-95 text-text-secondary hover:text-text-primary"
                  title="More options"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>

                <button
                  onClick={() => setIsFullScreen(!isFullScreen)}
                  className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors active:scale-95 text-text-secondary hover:text-text-primary ml-1"
                  title={isFullScreen ? "Minimize" : "Open now playing"}
                >
                  {isFullScreen ? <ChevronDown className="w-5 h-5" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            {isFullScreen && !isDesktop && (
              <motion.div
                key="mobile-expanded"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed inset-0 z-[60] flex flex-col overflow-hidden md:hidden no-scrollbar select-none overscroll-none"
                style={{
                  backgroundColor: '#000000',
                  '--bg-base': '#000000',
                  '--bg-surface': '#121212',
                  '--text-primary': '#ffffff',
                  '--text-secondary': '#a7a7a7',
                  '--border-main': 'rgba(255, 255, 255, 0.1)',
                  '--color-bg-base': '#000000',
                  '--color-bg-surface': '#121212',
                  '--color-text-primary': '#ffffff',
                  '--color-text-secondary': '#a7a7a7',
                  '--color-border-main': 'rgba(255, 255, 255, 0.1)'
                }}
              >
                <div className="h-[100dvh] md:h-screen flex flex-col pt-2 md:pt-8 px-0 md:px-8 pb-0 relative z-10 overflow-hidden">
                  <DynamicBackground cover={activeSong.cover} />

                  <div className="relative z-20 flex flex-col h-full w-full min-h-0">
                    <div className="relative flex items-center justify-between w-full px-4 pt-2 pb-2 md:mb-4 flex-shrink-0 z-[30] gap-3">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <button 
                          onClick={() => setIsFullScreen(false)} 
                          className="w-10 h-10 flex items-center justify-center text-text-primary hover:bg-white/10 rounded-full transition-all active:scale-90 shrink-0 -ml-2"
                          aria-label="Close player"
                        >
                          <ChevronDown className="w-7 h-7 drop-shadow-md" />
                        </button>

                        <div className="flex flex-col text-left min-w-0 flex-1">
                          <span className="text-[10px] font-bold tracking-[0.25em] text-text-secondary/50 uppercase leading-none truncate mb-1">
                            PLAYING FROM
                          </span>
                          <span className="text-xs font-black text-text-primary tracking-wider uppercase truncate max-w-full leading-tight">
                            {(activeSong.isYouTube || activeSong.source === 'youtube' || (typeof activeSong.id === 'string' && activeSong.id.startsWith('yt_')) || activeSong.videoId) ? 'YouTube Music' : 'Google Drive'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          className="w-10 h-10 flex items-center justify-center rounded-full text-text-primary hover:bg-white/10 transition-all active:scale-90"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLike(activeSong);
                          }}
                          aria-label={likedSongs.includes(activeSong.id) ? "Unlike" : "Like"}
                        >
                          <Heart
                            className={cn(
                              "w-5 h-5 transition-all",
                              likedSongs.includes(activeSong.id)
                                ? "text-primary fill-current drop-shadow-[0_0_8px_rgba(29,185,84,0.6)]"
                                : "text-text-primary hover:text-primary"
                            )}
                          />
                        </button>

                        <button
                          className={cn(
                            "w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-90",
                            soundBoost > 100 || equalizerPreset !== 'Flat' || equalizerBands.some(b => b !== 0) ? "text-primary bg-primary/20" : "text-text-primary hover:bg-white/10"
                          )}
                          onClick={() => {
                            setAudioStudioTab('eq');
                            setIsAudioStudioOpen(true);
                          }}
                          title="Audio Studio (EQ & Boost)"
                          aria-label="Audio Studio"
                        >
                          <Sliders className="w-5 h-5 text-text-primary" />
                        </button>

                        <button
                          className={cn(
                            "w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-90 md:hidden",
                            (lyrics.length > 0 || isLyricsLoading) ? "text-text-primary hover:bg-white/10" : "text-text-primary/30 cursor-default"
                          )}
                          onClick={() => {
                            if (lyrics.length > 0 || isLyricsLoading) {
                              setActiveTab('lyrics');
                              setIsTabCollapsed(false);
                              setTimeout(() => document.getElementById('mobile-tab-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
                            }
                          }}
                          aria-label="Lyrics"
                        >
                          {isLyricsLoading ? (
                            <Loader2 className="w-5 h-5 text-text-primary animate-spin" />
                          ) : (
                            <ListMusic className="w-5 h-5" />
                          )}
                        </button>

                        <button
                          className="w-10 h-10 flex items-center justify-center rounded-full text-text-primary hover:bg-white/10 transition-all active:scale-90"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOptionsSong(optionsSong?.id === activeSong.id ? null : activeSong);
                          }}
                          aria-label="More options"
                        >
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 flex items-center justify-center min-h-0 w-full max-w-7xl mx-auto px-0 md:px-8 pb-4">
                      <PlayerHero activeSong={activeSong} likedSongs={likedSongs} toggleLike={toggleLike} />
                    </div>

                    <div className="w-full max-w-5xl mx-auto pb-4 md:pb-0 relative z-30 px-8 md:px-0 flex-shrink-0">
                      <div className="flex flex-col gap-6 md:gap-4 w-full">
                        <div className="w-full">
                          <ProgressBar progress={progress} seek={seek} />
                          <TimeDisplay currentTime={currentTime} duration={duration} />
                        </div>

                        <PlaybackControls
                          isShuffle={isShuffle}
                          setIsShuffle={setIsShuffle}
                          playPrevious={playPrevious}
                          togglePlay={togglePlay}
                          isBuffering={isBuffering}
                          isPlaying={isPlaying}
                          playNext={playNext}
                          repeatMode={repeatMode}
                          setRepeatMode={setRepeatMode}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between w-full px-12 pb-6 pt-2 relative z-30 md:hidden flex-shrink-0">
                      <button
                        onClick={() => {
                          setActiveTab('upnext');
                          setIsTabCollapsed(false);
                        }}
                        className="text-[15px] font-bold text-white/60 hover:text-white transition-colors cursor-pointer"
                      >
                        Up next
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab('lyrics');
                          setIsTabCollapsed(false);
                        }}
                        className="text-[15px] font-bold text-white/60 hover:text-white transition-colors cursor-pointer"
                      >
                        Lyrics
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab('related');
                          setIsTabCollapsed(false);
                        }}
                        className="text-[15px] font-bold text-white/60 hover:text-white transition-colors cursor-pointer"
                      >
                        Related
                      </button>
                    </div>

                    <WaveVisualizer />
                  </div>
                </div>

                <AnimatePresence>
                  {!isTabCollapsed && (
                    <motion.div
                      key="mobile-tab-overlay"
                      initial={{ y: "100%" }}
                      animate={{ y: 0 }}
                      exit={{ y: "100%" }}
                      transition={{ duration: 0.3, ease: [0.2, 0, 0.6, 1] }}
                      className="fixed inset-0 z-[80] bg-[#1c1c1c] flex flex-col md:hidden overflow-hidden"
                    >
                      <div
                        className="flex items-center gap-3 px-4 py-3 bg-[#1c1c1c] shrink-0 active:bg-white/5 transition-colors"
                        onClick={() => setIsTabCollapsed(true)}
                      >
                        <div className="w-10 h-10 rounded overflow-hidden shadow-md shrink-0 bg-[#2a2a2a] flex items-center justify-center">
                          <SongImage src={activeSong.thumbnail || activeSong.cover} alt={activeSong.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center pt-0.5">
                          <p className="text-white font-bold text-[15px] leading-none mb-1 truncate">{activeSong.title}</p>
                          <p className="text-white/60 text-[13px] leading-none truncate">{activeSong.artist}</p>
                        </div>
                        <div className="flex items-center gap-4 shrink-0 px-2">
                          <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} disabled={isBuffering} className="p-1 active:scale-90 transition-transform">
                            {isBuffering ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : isPlaying ? <Pause className="w-6 h-6 text-white fill-current" /> : <Play className="w-6 h-6 text-white fill-current ml-0.5" />}
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); playNext(); }} className="p-1 active:scale-90 transition-transform">
                            <SkipForward className="w-6 h-6 text-white fill-current" />
                          </button>
                        </div>
                      </div>

                      <div className="flex font-semibold text-[15px] bg-[#1c1c1c] shrink-0 px-1 border-b border-white/5 relative z-20 shadow-sm">
                        {['upnext', 'lyrics', 'related'].map(tab => (
                          <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                              "flex-1 py-3 text-center transition-colors relative font-medium",
                              activeTab === tab ? "text-white" : "text-white/50"
                            )}
                          >
                            {tab === 'upnext' ? 'Up next' : tab === 'lyrics' ? 'Lyrics' : 'Related'}
                            {activeTab === tab && (
                              <motion.div
                                layoutId="mobile-active-tab"
                                className="absolute bottom-0 left-[15%] right-[15%] h-[2px] bg-white rounded-t-full"
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                              />
                            )}
                          </button>
                        ))}
                      </div>

                      <div className="flex-1 bg-[#151515] relative overflow-hidden flex flex-col">
                        <AnimatePresence mode="wait">
                          {activeTab === 'lyrics' && (
                            <motion.div
                              key="lyrics"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="absolute inset-0 overflow-hidden flex flex-col"
                            >
                              <div className="flex items-center gap-6 px-6 pt-6 pb-2 shrink-0">
                                <button
                                  onClick={() => setLyricsSubTab('lyrics')}
                                  className={cn(
                                    "text-[10px] font-black uppercase tracking-[0.3em] transition-all",
                                    lyricsSubTab === 'lyrics' ? "text-primary" : "text-white/30"
                                  )}
                                >
                                  LYRICS
                                </button>
                                <button
                                  onClick={() => setLyricsSubTab('credits')}
                                  className={cn(
                                    "text-[10px] font-black uppercase tracking-[0.3em] transition-all",
                                    lyricsSubTab === 'credits' ? "text-primary" : "text-white/30"
                                  )}
                                >
                                  CREDITS
                                </button>
                              </div>

                              <div className="flex-1 overflow-hidden relative">
                                <AnimatePresence mode="wait">
                                  {lyricsSubTab === 'lyrics' ? (
                                    <motion.div
                                      key="mobile-lyrics-list"
                                      ref={lyricsContainerRef}
                                      onScroll={handleLyricsScroll}
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -10 }}
                                      className="h-full overflow-y-auto no-scrollbar scroll-smooth pt-4 pb-40 px-6 space-y-8"
                                    >
                                      {isLyricsLoading ? (
                                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                                          <Loader2 className="w-10 h-10 text-white/50 animate-spin" />
                                        </div>
                                      ) : lyrics.length > 0 ? (
                                        lyrics.map((line, i) => (
                                          <motion.p
                                            key={i}
                                            initial={false}
                                            animate={{ opacity: i === activeIndex ? 1 : 0.4 }}
                                            transition={{ duration: 0.3 }}
                                            className={cn(
                                              "text-xl font-medium text-left transition-all duration-300 leading-snug",
                                              i === activeIndex ? "text-[#ffc800]" : "text-white/50 cursor-pointer hover:opacity-80"
                                            )}
                                            onClick={() => {
                                              line.time > 0 && seek((line.time / duration) * 100);
                                              setIsAutoScrollEnabled(true);
                                            }}
                                          >
                                            {line.text}
                                          </motion.p>
                                        ))
                                      ) : (
                                        <div className="flex flex-col items-center justify-center text-center py-20 gap-4 opacity-50">
                                          <p className="text-lg font-bold text-white">Lyrics unavailable</p>
                                          <button
                                            onClick={() => window.open(`https://genius.com/search?q=${encodeURIComponent(`${activeSong.artist} ${activeSong.title}`)}`, '_blank')}
                                            className="mt-4 px-6 py-2 rounded-full border border-white/20 text-[10px] font-bold hover:bg-white/10 transition-colors uppercase text-white"
                                          >
                                            Search external
                                          </button>
                                        </div>
                                      )}
                                    </motion.div>
                                  ) : (
                                    <motion.div
                                      key="mobile-credits-view"
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -10 }}
                                      className="h-full overflow-y-auto no-scrollbar pt-4 pb-40 px-6 space-y-10"
                                    >
                                      <div className="space-y-2">
                                        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20">PERFORMED BY</p>
                                        <p className="text-2xl font-black text-white">{activeSong.artist}</p>
                                      </div>

                                      {activeSong.album && (
                                        <div className="space-y-2">
                                          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20">ALBUM</p>
                                          <p className="text-lg font-bold text-white/80">{activeSong.album}</p>
                                        </div>
                                      )}

                                      <div className="grid grid-cols-2 gap-8">
                                        {activeSong.year && (
                                          <div className="space-y-2">
                                            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20">RELEASED</p>
                                            <p className="text-sm font-bold text-white/60">{activeSong.year}</p>
                                          </div>
                                        )}
                                        {activeSong.genre && (
                                          <div className="space-y-2">
                                            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20">GENRE</p>
                                            <p className="text-sm font-bold text-white/60">{activeSong.genre}</p>
                                          </div>
                                        )}
                                      </div>

                                      <div className="pt-10 space-y-8">
                                        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/5 to-transparent mb-10" />
                                        <div className="space-y-6">
                                          <div className="space-y-1">
                                            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20">SERVICE BY</p>
                                            <p className="text-sm font-bold text-white/60">SumanOnline.Com</p>
                                          </div>
                                          <div className="space-y-1">
                                            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20">DEVELOPED BY</p>
                                            <p className="text-sm font-bold text-white/60">Suman Chakrabortty</p>
                                          </div>
                                        </div>

                                        <button
                                          onClick={() => window.open(`https://genius.com/search?q=${encodeURIComponent(`${activeSong.artist} ${activeSong.title}`)}`, '_blank')}
                                          className="w-full py-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-[0.3em] text-white/60 hover:text-white flex items-center justify-center gap-3 active:scale-[0.98] mt-10"
                                        >
                                          VIEW DETAILED CREDITS ON GENIUS
                                        </button>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            </motion.div>
                          )}

                          {activeTab === 'upnext' && (
                            <motion.div
                              key="upnext"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="absolute inset-0 overflow-y-auto no-scrollbar scroll-smooth p-2 pb-32 space-y-1"
                            >
                              {queue?.map((song) => (
                                <div
                                  key={song.id}
                                  ref={currentSong?.id === song.id ? activeQueueItemRef : null}
                                  className={cn(
                                    "flex items-center gap-4 p-3 rounded-xl transition-colors cursor-pointer",
                                    currentSong?.id === song.id ? "bg-white/5" : "active:bg-white/5"
                                  )}
                                  onClick={() => playSong(song)}
                                >
                                  <div className="w-[44px] h-[44px] rounded-lg overflow-hidden flex-shrink-0 relative shadow-sm">
                                    <SongImage src={song.thumbnail || song.cover} alt={song.title} className="w-full h-full object-cover" />
                                    {currentSong?.id === song.id && isPlaying && (
                                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                        <PlayingVisualizer className="h-2.5 gap-[1px]" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className={cn("text-[15px] font-medium truncate leading-tight flex items-center gap-2", currentSong?.id === song.id ? "text-white" : "text-white/90")}>
                                      {song.title}
                                    </p>
                                    <p className="text-[13px] text-white/50 truncate mt-0.5">{song.artist}</p>
                                  </div>
                                  <div className="ml-auto flex-shrink-0 p-1">
                                    <MoreHorizontal className="w-5 h-5 text-white/50 active:text-white" onClick={(e) => { e.stopPropagation(); setOptionsSong(song); }} />
                                  </div>
                                </div>
                              ))}
                            </motion.div>
                          )}

                          {activeTab === 'related' && (
                            <motion.div
                              key="related"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="absolute inset-0 overflow-y-auto no-scrollbar scroll-smooth p-2 pb-32 space-y-1"
                            >
                              {relatedSongs.length > 0 ? (
                                relatedSongs.map((song) => (
                                  <div
                                    key={song.id}
                                    className="flex items-center gap-4 p-3 rounded-xl transition-colors cursor-pointer active:bg-white/5 hover:bg-white/5"
                                    onClick={() => playSong(song)}
                                  >
                                    <div className="w-[44px] h-[44px] rounded-lg overflow-hidden flex-shrink-0 relative shadow-sm">
                                      <SongImage src={song.thumbnail || song.cover} alt={song.title} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-[15px] font-medium truncate leading-tight flex items-center gap-2 text-text-primary">
                                        {song.title}
                                      </p>
                                      <p className="text-[13px] text-text-secondary/50 truncate mt-0.5">{song.artist}</p>
                                    </div>
                                    <div className="ml-auto flex-shrink-0 p-1">
                                      <MoreHorizontal className="w-5 h-5 text-text-secondary/50 active:text-text-primary" onClick={(e) => { e.stopPropagation(); setOptionsSong(song); }} />
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="p-8 text-center mt-10 opacity-50">
                                  <p className="text-white/70 font-bold mb-2">No related tracks found</p>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <AnimatePresence>
                          {activeTab === 'lyrics' && !isAutoScrollEnabled && (
                            <motion.button
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 20 }}
                              onClick={() => setIsAutoScrollEnabled(true)}
                              className="absolute bottom-8 right-6 bg-bg-surface/50 backdrop-blur-md border border-border-main/20 text-text-primary px-5 py-2.5 rounded-full text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl z-[80] active:scale-95 transition-all flex items-center gap-2 group"
                            >
                              <RefreshCw className="w-3.5 h-3.5 group-active:rotate-180 transition-transform duration-500" />
                              Sync
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {isFullScreen && isDesktop && (
              <motion.div
                key="desktop-expanded"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                style={{ willChange: "opacity" }}
                className="fixed top-16 md:left-64 right-0 bottom-20 z-[40] hidden md:flex overflow-hidden bg-[#f8f9fa] dark:bg-[#0c0c0e] transition-colors duration-300"
              >
                <DesktopAmbientBackdrop cover={activeSong.cover} />

                <div className="flex w-full h-full pt-6 px-6 pb-1 lg:pt-8 lg:px-10 lg:pb-1.5 gap-8 lg:gap-14 overflow-hidden mx-auto max-w-[1500px] relative z-10 items-center justify-center">
                  <div className="flex-1 flex flex-col items-center justify-between relative min-h-0 min-w-0 h-full pt-1 pb-0">
                    <div className="flex-1 flex items-center justify-center w-full min-h-0">
                      <div className="relative w-full max-w-[min(500px,58vh)] aspect-square rounded-3xl overflow-hidden shadow-[0_20px_50px_-15px_rgba(0,0,0,0.15)] dark:shadow-[0_30px_90px_rgba(0,0,0,0.9)] ring-1 ring-black/10 dark:ring-white/10 transition-all duration-700 ease-out group/hero flex items-center justify-center">
                        <SongImage
                          src={activeSong.cover}
                          alt={activeSong.title}
                          className="w-full h-full object-cover group-hover/hero:scale-105 transition-transform duration-700"
                        />
                      </div>
                    </div>
                    <div className="w-full flex justify-center shrink-0 pt-1.5 pb-0">
                      <SpectrumVisualizer className="w-full max-w-[min(500px,58vh)] rounded-2xl overflow-hidden bg-black/20 dark:bg-black/40 backdrop-blur-md px-3 py-1.5 border border-black/5 dark:border-white/5 opacity-85 hover:opacity-100 transition-opacity" height={48} barCount={48} />
                    </div>
                  </div>

                  <div className="w-[400px] lg:w-[460px] flex flex-col shrink-0 h-full relative glass-premium rounded-3xl p-5 border border-black/10 dark:border-white/10 shadow-xl dark:shadow-2xl overflow-hidden backdrop-blur-2xl">
                    <div className="flex items-center justify-between pb-3.5 border-b border-border-main/10 shrink-0">
                      <div className="flex items-center gap-1.5 p-1 bg-black/5 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/5">
                        {['upnext', 'lyrics', 'credits'].map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                              "px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                              activeTab === tab
                                ? "bg-white text-text-primary shadow-sm dark:bg-white/15 dark:text-white"
                                : "text-text-secondary hover:text-text-primary"
                            )}
                          >
                            {tab === 'upnext' ? 'Up Next' : tab === 'lyrics' ? 'Lyrics' : 'Credits'}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setIsFullScreen(false)}
                        className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-text-secondary hover:text-text-primary transition-all active:scale-90"
                        title="Minimize"
                      >
                        <ChevronDown className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pt-3 pb-2 relative z-10">
                      <AnimatePresence mode="wait">
                        {activeTab === 'upnext' && (
                          <DesktopQueueTab
                            queue={queue}
                            currentSong={currentSong}
                            isPlaying={isPlaying}
                            playSong={playSong}
                            setOptionsSong={setOptionsSong}
                            activeItemRef={activeQueueItemRef}
                          />
                        )}

                        {activeTab === 'lyrics' && (
                          <DesktopLyricsTab
                            lyrics={lyrics}
                            isLyricsLoading={isLyricsLoading}
                            duration={duration}
                            seek={seek}
                            isAutoScrollEnabled={isAutoScrollEnabled}
                            setIsAutoScrollEnabled={setIsAutoScrollEnabled}
                          />
                        )}

                        {activeTab === 'credits' && (
                          <DesktopCreditsTab activeSong={activeSong} />
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {optionsSong && (
        <div className="fixed inset-0 md:left-64 z-[70] flex flex-col justify-end overscroll-contain" onTouchMove={(e) => e.stopPropagation()}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOptionsSong(null)} />
          <div className={cn(
            "relative bg-bg-surface rounded-t-3xl pt-2 px-4 shadow-2xl border-t border-border-main/10 animate-in slide-in-from-bottom-full duration-300 pointer-events-auto pb-safe transition-colors mb-0 md:mb-20",
            isAppRoute && "pb-0 md:pb-5"
          )}>
            <div className="w-12 h-1 bg-border-main/20 rounded-full mx-auto mb-4" />

            <div className="flex items-center gap-4 mb-6 border-b border-border-main/10 pb-4">
              <div className="w-14 h-14 rounded overflow-hidden flex-shrink-0">
                <SongImage src={optionsSong.thumbnail || optionsSong.cover} alt={optionsSong.title} className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0 pr-4 flex-1">
                <p className="text-base font-bold text-text-primary truncate">{optionsSong.title}</p>
                <p className="text-sm text-text-secondary truncate">{optionsSong.artist}</p>
              </div>
              <button className="w-8 h-8 rounded-full bg-bg-surface/50 border border-border-main/10 flex items-center justify-center flex-shrink-0" onClick={() => setOptionsSong(null)}>
                <X className="w-5 h-5 text-text-primary" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[60vh] pb-2 space-y-1">
              {[
                { id: 'playNext', icon: ListPlus, label: 'Play next' },
                { id: 'addToQueue', icon: ListMusic, label: 'Add to queue' },
                { id: 'saveLibrary', icon: PlusCircle, label: 'Save to library' },
                { id: 'like', icon: Heart, label: 'Add to liked songs' },
                { id: 'equalizer', icon: Sliders, label: 'Audio Studio & Equalizer' },
                { id: 'share', icon: Share2, label: 'Share' },
                { id: 'saveOffline', icon: HardDrive, label: isTrackOffline(optionsSong?.id) ? 'Saved offline ✓' : 'Save for offline' },
                { id: 'download', icon: Download, label: 'Download' },
                { id: 'savePlaylist', icon: FolderPlus, label: 'Save to playlist' },
                { id: 'album', icon: Disc, label: 'Go to album' },
                { id: 'artist', icon: User, label: 'Go to artist' },
                { id: 'credits', icon: Info, label: 'View song credits' }
              ].map((opt, i) => (
                <button
                  key={i}
                  className="w-full flex items-center gap-4 p-3 hover:bg-bg-surface/80 rounded-xl transition-colors text-left"
                  onClick={async () => {
                    if (opt.id === 'credits') {
                      setIsFullScreen(true);
                      if (isDesktop) {
                        setActiveTab('credits');
                      } else {
                        setIsTabCollapsed(false);
                        setActiveTab('lyrics');
                        setLyricsSubTab('credits');
                      }
                      setOptionsSong(null);
                    } else if (opt.id === 'equalizer') {
                      setAudioStudioTab('eq');
                      setIsAudioStudioOpen(true);
                      setOptionsSong(null);
                    } else if (opt.id === 'share') {
                      const shareUrl = `${window.location.origin}/app/library?filter=Tracks&trackId=${encodeURIComponent(optionsSong.id)}`;
                      if (navigator.share) {
                        navigator.share({
                          title: optionsSong.title,
                          text: `Listen to ${optionsSong.title} by ${optionsSong.artist}`,
                          url: shareUrl
                        }).catch(console.error);
                      } else {
                        navigator.clipboard.writeText(shareUrl);
                        handleOptionClick('Link copied to clipboard');
                      }
                    } else if (opt.id === 'saveOffline') {
                      if (isTrackOffline(optionsSong.id)) {
                        await removeTrackOffline(optionsSong.id);
                        showToast(`Removed "${optionsSong.title}" from offline storage`);
                        setOptionsSong(null);
                        return;
                      }
                      showToast(`Saving "${optionsSong.title}" for offline...`);
                      setOptionsSong(null);
                      try {
                        const songToSave = { ...optionsSong, url: optionsSong.streamUrl || optionsSong.driveUrl };
                        await saveTrackOffline(songToSave, (pct) => setOfflineProgress(pct));
                        setOfflineProgress(null);
                        showToast(`"${optionsSong.title}" saved for offline playback ✓`);
                      } catch (err) {
                        setOfflineProgress(null);
                        showToast(`Failed to save offline: ${err.message}`);
                      }
                    } else if (opt.id === 'download') {
                      window.open(optionsSong.driveUrl, '_blank');
                      handleOptionClick(`Downloading ${optionsSong.title}...`);
                    } else if (opt.id === 'savePlaylist') {
                      setIsPlaylistPickerOpen(true);
                    } else if (opt.id === 'like') {
                      toggleLike(optionsSong);
                      setOptionsSong(null);
                    } else if (opt.id === 'artist') {
                      const primaryArtist = optionsSong.artist.split(/\s*,\s*|\s*&\s*|\s+and\s+/i)[0].trim();
                      navigate(`/app/library?filter=Artists&artist=${encodeURIComponent(primaryArtist)}`);
                      setOptionsSong(null);
                    } else if (opt.id === 'album') {
                      navigate(`/app/library?filter=Albums&album=${encodeURIComponent(optionsSong.album)}`);
                      setOptionsSong(null);
                    } else {
                      handleOptionClick(`${opt.label} functionality coming soon`);
                    }
                  }}
                >
                  <opt.icon className={cn(
                    "w-6 h-6",
                    opt.id === 'like' && likedSongs.includes(optionsSong.id) ? "text-primary fill-current" : "text-text-secondary"
                  )} />
                  <span className="text-base text-text-primary">
                    {opt.id === 'like' && likedSongs.includes(optionsSong.id) ? 'Remove from liked' : opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isPlaylistPickerOpen && (
          <div className="fixed inset-0 md:left-64 z-[100] flex items-end md:items-center justify-center p-4 overscroll-contain" onTouchMove={(e) => e.stopPropagation()}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => {
                setIsPlaylistPickerOpen(false);
                setShowNewPlaylistInput(false);
                setNewPlaylistName('');
              }}
            />
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              className="relative w-full max-w-md bg-bg-surface border border-border-main/10 rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden pb-8"
            >
              <div className="flex items-center justify-between p-6 border-b border-border-main/5">
                <h3 className="text-xl font-black text-text-primary">Save to Playlist</h3>
                <button
                  className="p-2 rounded-full hover:bg-bg-surface/50 transition-colors"
                  onClick={() => {
                    setIsPlaylistPickerOpen(false);
                    setShowNewPlaylistInput(false);
                    setNewPlaylistName('');
                  }}
                >
                  <X className="w-5 h-5 text-text-secondary" />
                </button>
              </div>

              <div className="p-4 space-y-2 overflow-y-auto max-h-[50vh] no-scrollbar">
                {playlists.filter(p => p.userId === user?.uid).length === 0 && !showNewPlaylistInput && (
                  <div className="py-10 text-center">
                    <FolderPlus className="w-12 h-12 text-text-secondary/30 mx-auto mb-3" />
                    <p className="text-text-secondary font-medium">No playlists created yet.</p>
                  </div>
                )}

                {playlists.filter(p => p.userId === user?.uid).map(playlist => (
                  <button
                    key={playlist.id}
                    className="w-full flex items-center gap-4 p-4 hover:bg-bg-surface/50 rounded-xl transition-all group"
                    onClick={async () => {
                      await addSongToPlaylist(playlist.id, optionsSong);
                      handleOptionClick(`Added to ${playlist.name}`);
                      setIsPlaylistPickerOpen(false);
                    }}
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-bg-base flex items-center justify-center border border-border-main/5 relative">
                      {playlist.songs && playlist.songs.length > 0 ? (
                        <SongImage src={playlist.songs[0].thumbnail || playlist.songs[0].cover} alt={playlist.name} className="w-full h-full object-cover" />
                      ) : (
                        <ListMusic className="w-6 h-6 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-bold text-text-primary group-hover:text-primary transition-colors">{playlist.name}</p>
                      <p className="text-xs text-text-secondary font-medium">{playlist.songs?.length || 0} songs</p>
                    </div>
                  </button>
                ))}

                {showNewPlaylistInput ? (
                  <div className="p-2 space-y-3">
                    <input
                      autoFocus
                      type="text"
                      id="save-playlist-input"
                      name="save-playlist-input"
                      placeholder="Enter playlist name..."
                      className="w-full bg-bg-base border border-border-main/10 rounded-xl py-4 px-5 text-text-primary placeholder-text-secondary/50 focus:ring-2 focus:ring-primary/50 text-lg font-bold"
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter' && newPlaylistName.trim()) {
                          const plId = await createPlaylist(newPlaylistName);
                          await addSongToPlaylist(plId.id || plId, optionsSong);
                          handleOptionClick(`Created and added to ${newPlaylistName}`);
                          setIsPlaylistPickerOpen(false);
                          setShowNewPlaylistInput(false);
                          setNewPlaylistName('');
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <button
                        className="flex-1 py-3 rounded-xl bg-primary text-black font-black uppercase tracking-widest text-xs disabled:opacity-50"
                        disabled={!newPlaylistName.trim()}
                        onClick={async () => {
                          const plId = await createPlaylist(newPlaylistName);
                          await addSongToPlaylist(plId.id || plId, optionsSong);
                          handleOptionClick(`Created and added to ${newPlaylistName}`);
                          setIsPlaylistPickerOpen(false);
                          setShowNewPlaylistInput(false);
                          setNewPlaylistName('');
                        }}
                      >
                        Create & Add
                      </button>
                      <button
                        className="px-6 py-3 rounded-xl bg-bg-base text-text-primary border border-border-main/10 font-bold text-xs"
                        onClick={() => setShowNewPlaylistInput(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="w-full flex items-center justify-center gap-3 p-5 mt-4 border-2 border-dashed border-border-main/20 rounded-2xl text-text-secondary hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all group"
                    onClick={() => setShowNewPlaylistInput(true)}
                  >
                    <PlusCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    <span className="font-black uppercase tracking-widest text-xs">Create New Playlist</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAudioStudioOpen && (
          <AudioStudioModal
            isOpen={isAudioStudioOpen}
            onClose={() => setIsAudioStudioOpen(false)}
            initialTab={audioStudioTab}
            equalizerBands={equalizerBands}
            setEqualizerBand={setEqualizerBand}
            equalizerPreset={equalizerPreset}
            setEqualizerPreset={setEqualizerPreset}
            crossfade={crossfade}
            setCrossfade={setCrossfade}
            soundBoost={soundBoost}
            setSoundBoost={setSoundBoost}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default MusicPlayer;
