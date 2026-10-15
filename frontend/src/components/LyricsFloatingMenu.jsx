import React, { useState, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, RotateCw, Languages, ChevronRight, ChevronLeft, Check, Minus, Plus, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

const hexToRgba = (hex, alpha = 1) => {
  if (!hex || typeof hex !== 'string') return `rgba(255, 255, 255, ${alpha})`;
  let c = hex.replace('#', '').trim();
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  if (c.length !== 6) return `rgba(255, 255, 255, ${alpha})`;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const LyricsFloatingMenu = memo(({
  _currentSong,
  currentSource = 'binilyrics',
  currentStyle = 'rhythmic',
  currentTranslationMode = 'en',
  currentColor = '#ffffff',
  offset = 0,
  isTranslating = false,
  isTranslationLoading = false,
  isReloading = false,
  onToggleTranslation,
  onChangeTranslationMode,
  onChangeOffset,
  onChangeSource,
  onChangeStyle,
  onChangeColor,
  onReload,
  placement = 'bottom',
  size = 'md',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
        setActiveSubmenu(null);
      }
    };
    if (isOpen) {
      document.addEventListener('pointerdown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
    };
  }, [isOpen]);

  const sources = [
    {
      id: 'auto',
      label: 'Smart Auto',
      badge: 'RECOMMENDED',
      badgeStyle: 'bg-primary/20 text-primary border-primary/30',
      desc: 'Prioritizes true syllable & word sync'
    },
    {
      id: 'binilyrics',
      label: 'Apple Music',
      badge: 'KARAOKE',
      badgeStyle: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      desc: 'LyricsPlus word-by-word timing'
    },
    {
      id: 'lrcred',
      label: 'LRC.red Enhanced',
      badge: 'ENHANCED',
      badgeStyle: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
      desc: 'Apple Music synced timestamps'
    },
    {
      id: 'lrclib',
      label: 'LRCLib Database',
      badge: 'SYNCED',
      badgeStyle: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
      desc: 'Line-level sync with karaoke sweep'
    },
    {
      id: 'ovh',
      label: 'Static Plain Lyrics',
      badge: 'PLAIN',
      badgeStyle: 'bg-white/10 text-white/50 border-white/15',
      desc: 'Standard unsynchronized text'
    }
  ];

  const currentSourceLabel = sources.find((s) => s.id === currentSource)?.label || 'Smart Auto';

  const styles = [
    {
      id: 'rhythmic',
      label: 'Rhythmic Pulsing',
      badge: 'DYNAMIC',
      badgeStyle: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      desc: 'Word-by-word karaoke glow & rhythmic syllable pulses'
    },
    {
      id: 'line',
      label: 'Line by line',
      badge: 'CLASSIC',
      badgeStyle: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
      desc: 'Unified line-by-line focus highlighting'
    }
  ];

  const currentStyleLabel = styles.find((s) => s.id === currentStyle)?.label || 'Rhythmic Pulsing';

  const colors = [
    { id: 'white', label: 'Crisp White', hex: '#ffffff', badge: 'DEFAULT', badgeStyle: 'bg-white/10 text-white/80 border-white/20' },
    { id: 'emerald', label: 'Emerald Glow', hex: '#10b981', badge: 'SPOTIFY', badgeStyle: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
    { id: 'cyan', label: 'Neon Cyan', hex: '#06b6d4', badge: 'CYAN', badgeStyle: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' },
    { id: 'rose', label: 'Electric Rose', hex: '#f43f5e', badge: 'ROSE', badgeStyle: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
    { id: 'amber', label: 'Sunset Amber', hex: '#f59e0b', badge: 'AMBER', badgeStyle: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
    { id: 'purple', label: 'Cyber Violet', hex: '#a855f7', badge: 'VIOLET', badgeStyle: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
    { id: 'sky', label: 'Ice Blue', hex: '#38bdf8', badge: 'ICE', badgeStyle: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
    { id: 'lime', label: 'Neon Lime', hex: '#84cc16', badge: 'LIME', badgeStyle: 'bg-lime-500/15 text-lime-300 border-lime-500/30' },
    { id: 'coral', label: 'Coral Orange', hex: '#fb923c', badge: 'CORAL', badgeStyle: 'bg-orange-500/15 text-orange-300 border-orange-500/30' }
  ];

  const currentColorHex = currentColor || '#ffffff';
  const currentColorItem = colors.find((c) => c.hex.toLowerCase() === currentColorHex.toLowerCase());
  const currentColorLabel = currentColorItem?.label || 'Custom';

  const translationModes = [
    {
      id: 'rom',
      label: 'English Alphabet',
      badge: 'CONVERTER',
      badgeStyle: 'bg-primary/20 text-primary border-primary/30',
      desc: 'Phonetic English alphabet sing-along'
    },
    {
      id: 'en',
      label: 'English Meaning',
      badge: 'MEANING',
      badgeStyle: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      desc: 'Line-by-line meaning in English'
    },
    {
      id: 'hi',
      label: 'Hindi Translation (हिन्दी)',
      badge: 'HINDI',
      badgeStyle: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
      desc: 'Translate lyrics into Hindi'
    },
    {
      id: 'es',
      label: 'Spanish Translation (Español)',
      badge: 'SPANISH',
      badgeStyle: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
      desc: 'Translate lyrics into Spanish'
    },
    {
      id: 'off',
      label: 'Turn Off Translation',
      badge: 'OFF',
      badgeStyle: 'bg-white/10 text-white/50 border-white/15',
      desc: 'Hide translated subtitles'
    }
  ];

  const currentTranslationLabel = isTranslating
    ? (translationModes.find((t) => t.id === currentTranslationMode)?.label || 'English Alphabet (Romanized)')
    : 'Off';

  return (
    <div ref={menuRef} className={cn("relative flex items-center gap-2 select-none", className)}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: placement === 'top' ? -8 : 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: placement === 'top' ? -8 : 10, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className={cn(
              "absolute right-0 w-[19.5rem] bg-[#141416]/98 dark:bg-[#101012]/98 backdrop-blur-3xl border border-white/15 rounded-2xl p-2 shadow-[0_24px_70px_rgba(0,0,0,0.85)] z-50 text-white font-medium text-xs overflow-hidden",
              placement === 'top' ? "top-10" : "bottom-14"
            )}
          >
            {activeSubmenu === 'offset' ? (
              <div className="p-1 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/10 px-1">
                  <button
                    onClick={() => setActiveSubmenu(null)}
                    className="p-1 -ml-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 flex items-center gap-1 text-xs font-semibold transition-all active:scale-95"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">Lyrics Offset</span>
                  <span className="text-xs font-mono font-bold text-primary">{offset > 0 ? `+${offset}` : offset}ms</span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    onClick={() => onChangeOffset(offset - 100)}
                    className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 active:scale-95 transition-all text-xs font-bold flex items-center justify-center gap-1"
                  >
                    <Minus className="w-3 h-3" /> 100ms
                  </button>
                  <button
                    onClick={() => onChangeOffset(0)}
                    className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 active:scale-95 transition-all text-xs font-bold text-white/60 hover:text-white"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => onChangeOffset(offset + 100)}
                    className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 active:scale-95 transition-all text-xs font-bold flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> 100ms
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {[-500, -200, 200, 500].map((step) => (
                    <button
                      key={step}
                      onClick={() => onChangeOffset(step)}
                      className={cn(
                        "py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all border",
                        offset === step
                          ? "bg-white/20 border-white/30 text-white"
                          : "bg-white/5 border-white/5 text-white/60 hover:text-white"
                      )}
                    >
                      {step > 0 ? `+${step}` : step}
                    </button>
                  ))}
                </div>
              </div>
            ) : activeSubmenu === 'source' ? (
              <div className="p-1 space-y-1">
                <div className="flex items-center justify-between pb-2 mb-1 border-b border-white/10 px-1">
                  <button
                    onClick={() => setActiveSubmenu(null)}
                    className="p-1 -ml-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 flex items-center gap-1 text-xs font-semibold transition-all active:scale-95"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">Lyrics Source</span>
                  <div className="w-12" />
                </div>
                <div className="space-y-1 max-h-64 overflow-y-auto no-scrollbar">
                  {sources.map((s) => {
                    const isSelected = currentSource === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          onChangeSource(s.id);
                          setActiveSubmenu(null);
                          setIsOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between p-2.5 rounded-xl transition-all text-left group border",
                          isSelected
                            ? "bg-white/10 border-white/20 text-white shadow-sm"
                            : "border-transparent hover:bg-white/[0.06] text-white/80 hover:text-white"
                        )}
                      >
                        <div className="space-y-0.5 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-white">{s.label}</span>
                            {s.badge && (
                              <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded-md border tracking-wider", s.badgeStyle)}>
                                {s.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[10.5px] text-white/55 leading-tight">{s.desc}</p>
                        </div>
                        {isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5 text-primary" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-white/15 group-hover:border-white/30 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : activeSubmenu === 'style' ? (
              <div className="p-1 space-y-1">
                <div className="flex items-center justify-between pb-2 mb-1 border-b border-white/10 px-1">
                  <button
                    onClick={() => setActiveSubmenu(null)}
                    className="p-1 -ml-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 flex items-center gap-1 text-xs font-semibold transition-all active:scale-95"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">Lyrics Style</span>
                  <div className="w-12" />
                </div>
                <div className="space-y-1">
                  {styles.map((s) => {
                    const isSelected = currentStyle === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          onChangeStyle?.(s.id);
                          setActiveSubmenu(null);
                          setIsOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between p-2.5 rounded-xl transition-all text-left group border",
                          isSelected
                            ? "bg-white/10 border-white/20 text-white shadow-sm"
                            : "border-transparent hover:bg-white/[0.06] text-white/80 hover:text-white"
                        )}
                      >
                        <div className="space-y-0.5 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-white">{s.label}</span>
                            {s.badge && (
                              <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded-md border tracking-wider", s.badgeStyle)}>
                                {s.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[10.5px] text-white/55 leading-tight">{s.desc}</p>
                        </div>
                        {isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5 text-primary" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-white/15 group-hover:border-white/30 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : activeSubmenu === 'color' ? (
              <div className="p-1 space-y-2">
                <div className="flex items-center justify-between pb-2 mb-1 border-b border-white/10 px-1">
                  <button
                    onClick={() => setActiveSubmenu(null)}
                    className="p-1 -ml-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 flex items-center gap-1 text-xs font-semibold transition-all active:scale-95"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">Lyrics Font Color</span>
                  <button
                    onClick={() => onChangeColor?.('#ffffff')}
                    className="text-[11px] font-bold text-white/50 hover:text-white transition-colors"
                  >
                    Reset
                  </button>
                </div>

                <div
                  className="p-2.5 rounded-xl border border-white/10 bg-black/40 flex flex-col items-center justify-center text-center select-none"
                  style={{
                    boxShadow: `0 0 20px ${hexToRgba(currentColorHex, 0.15)} inset`
                  }}
                >
                  <span className="text-[9.5px] uppercase font-bold tracking-widest text-white/40 mb-0.5">Live Preview</span>
                  <p
                    className="text-sm font-black tracking-tight transition-all duration-200"
                    style={{
                      color: currentColorHex,
                      textShadow: `0 0 16px ${hexToRgba(currentColorHex, 0.7)}, 0 0 26px ${hexToRgba(currentColorHex, 0.35)}`
                    }}
                  >
                    ♪ Sing with your style ♪
                  </p>
                </div>

                <div className="space-y-1 max-h-52 overflow-y-auto no-scrollbar pr-0.5">
                  {colors.map((c) => {
                    const isSelected = currentColorHex.toLowerCase() === c.hex.toLowerCase();
                    return (
                      <button
                        key={c.id}
                        onClick={() => {
                          onChangeColor?.(c.hex);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between p-2 rounded-xl transition-all text-left group border",
                          isSelected
                            ? "bg-white/10 border-white/20 text-white shadow-sm"
                            : "border-transparent hover:bg-white/[0.06] text-white/80 hover:text-white"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-4 h-4 rounded-full border border-white/30 shrink-0 shadow-sm"
                            style={{
                              backgroundColor: c.hex,
                              boxShadow: `0 0 10px ${c.hex}88`
                            }}
                          />
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-white">{c.label}</span>
                            {c.badge && (
                              <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded-md border tracking-wider", c.badgeStyle)}>
                                {c.badge}
                              </span>
                            )}
                          </div>
                        </div>
                        {isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5 text-primary" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-white/15 group-hover:border-white/30 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold text-white/70">Custom Color</span>
                  <label className="relative cursor-pointer flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-white">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0 shadow-sm"
                      style={{ backgroundColor: currentColorHex }}
                    />
                    <span>{currentColorHex.toUpperCase()}</span>
                    <input
                      type="color"
                      value={currentColorHex.startsWith('#') && currentColorHex.length === 7 ? currentColorHex : '#ffffff'}
                      onChange={(e) => onChangeColor?.(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </label>
                </div>
              </div>
            ) : activeSubmenu === 'translation' ? (
              <div className="p-1 space-y-1">
                <div className="flex items-center justify-between pb-2 mb-1 border-b border-white/10 px-1">
                  <button
                    onClick={() => setActiveSubmenu(null)}
                    className="p-1 -ml-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 flex items-center gap-1 text-xs font-semibold transition-all active:scale-95"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">Lyrics Translation</span>
                  <div className="w-12" />
                </div>
                <div className="space-y-1">
                  {translationModes.map((t) => {
                    const isSelected = isTranslating ? currentTranslationMode === t.id : t.id === 'off';
                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          onChangeTranslationMode?.(t.id);
                          setActiveSubmenu(null);
                          setIsOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between p-2.5 rounded-xl transition-all text-left group border",
                          isSelected
                            ? "bg-white/10 border-white/20 text-white shadow-sm"
                            : "border-transparent hover:bg-white/[0.06] text-white/80 hover:text-white"
                        )}
                      >
                        <div className="space-y-0.5 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-white">{t.label}</span>
                            {t.badge && (
                              <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded-md border tracking-wider", t.badgeStyle)}>
                                {t.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[10.5px] text-white/55 leading-tight">{t.desc}</p>
                        </div>
                        {isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5 text-primary" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-white/15 group-hover:border-white/30 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-1 space-y-0.5">
                <button
                  onClick={() => setActiveSubmenu('offset')}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/10 active:bg-white/15 transition-all text-xs"
                >
                  <span className="text-white/80">Lyrics Offset</span>
                  <span className="text-white/40 font-mono text-[11px] flex items-center gap-1">
                    {offset}ms
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </button>

                <button
                  onClick={() => setActiveSubmenu('source')}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/10 active:bg-white/15 transition-all text-xs"
                >
                  <span className="text-white/80">Change Lyrics Source</span>
                  <span className="text-white/40 text-[11px] flex items-center gap-1">
                    {currentSourceLabel}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </button>

                <button
                  onClick={() => setActiveSubmenu('style')}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/10 active:bg-white/15 transition-all text-xs"
                >
                  <span className="text-white/80">Lyrics Style</span>
                  <span className="text-white/40 text-[11px] flex items-center gap-1">
                    {currentStyleLabel}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </button>

                <button
                  onClick={() => setActiveSubmenu('color')}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/10 active:bg-white/15 transition-all text-xs"
                >
                  <span className="text-white/80">Lyrics Font Color</span>
                  <span className="text-white/40 text-[11px] flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0 shadow-sm"
                      style={{ backgroundColor: currentColorHex }}
                    />
                    {currentColorLabel}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </button>

                <button
                  onClick={() => setActiveSubmenu('translation')}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/10 active:bg-white/15 transition-all text-xs"
                >
                  <span className="text-white/80">Lyrics Translation</span>
                  <span className="text-white/40 text-[11px] flex items-center gap-1">
                    {currentTranslationLabel}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </button>

                <div className="h-px bg-white/10 my-1" />

                <button
                  onClick={() => {
                    onReload();
                    setIsOpen(false);
                  }}
                  disabled={isReloading}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/10 active:bg-white/15 transition-all text-xs text-white"
                >
                  <span className="text-white/90">Reload Lyrics</span>
                  <RotateCw className={cn("w-3.5 h-3.5 text-white/70", isReloading && "animate-spin text-primary")} />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className={cn(
        "flex items-center backdrop-blur-2xl border border-white/10 shadow-lg",
        size === 'sm'
          ? "gap-1 p-0.5 rounded-xl bg-white/5 dark:bg-white/5"
          : "gap-1.5 p-1 rounded-2xl bg-black/40 dark:bg-black/50"
      )}>
        <button
          onClick={onToggleTranslation}
          title={isTranslating ? "Hide translation" : "Translate lyrics (English Alphabet)"}
          className={cn(
            "transition-all active:scale-90 flex items-center justify-center",
            size === 'sm' ? "p-1.5 rounded-lg" : "p-2.5 rounded-xl",
            isTranslating
              ? "bg-white text-black font-black shadow-md"
              : "text-white/70 hover:text-white hover:bg-white/10"
          )}
        >
          {isTranslationLoading ? (
            <Loader2 className={cn("animate-spin text-primary", size === 'sm' ? "w-3.5 h-3.5" : "w-4 h-4")} />
          ) : (
            <Languages className={cn(size === 'sm' ? "w-3.5 h-3.5" : "w-4 h-4")} />
          )}
        </button>

        <button
          onClick={() => setIsOpen((prev) => !prev)}
          title="Lyrics options & settings"
          aria-label="Lyrics settings"
          className={cn(
            "transition-all active:scale-90 flex items-center justify-center",
            size === 'sm' ? "p-1.5 rounded-lg" : "p-2.5 rounded-xl",
            isOpen
              ? "bg-white/20 text-white"
              : "text-white/70 hover:text-white hover:bg-white/10"
          )}
        >
          <Settings className={cn(size === 'sm' ? "w-3.5 h-3.5" : "w-4 h-4", isReloading && "animate-spin text-primary")} />
        </button>
      </div>
    </div>
  );
});
