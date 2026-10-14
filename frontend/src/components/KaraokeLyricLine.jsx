import React, { memo } from 'react';
import { motion } from 'framer-motion';
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

export const KaraokeLyricLine = memo(({
  line,
  isActive,
  currentTime,
  translationText,
  onClick,
  onWordClick,
  align = 'center',
  size = 'md',
  lyricsStyle = 'rhythmic',
  lyricsColor = '#ffffff',
  className = ''
}) => {
  const activeColor = lyricsColor || '#ffffff';

  if (line?.isCountdown) {
    return (
      <motion.div
        initial={false}
        animate={{
          opacity: isActive ? 1 : 0.22,
          scale: isActive ? 1.05 : 0.95
        }}
        transition={{ type: "spring", damping: 24, stiffness: 200 }}
        onClick={onClick}
        className={cn(
          "flex items-center gap-3 py-4 px-3 select-none cursor-pointer transition-all duration-300",
          align === 'left' ? "justify-start pl-3" : "justify-center",
          className
        )}
      >
        <span
          className={cn(
            "w-2.5 h-2.5 rounded-full transition-all duration-300",
            isActive ? "animate-pulse" : "bg-white/30"
          )}
          style={isActive ? {
            backgroundColor: activeColor,
            boxShadow: `0 0 12px ${hexToRgba(activeColor, 0.9)}`
          } : undefined}
        />
        <span
          className={cn(
            "w-2.5 h-2.5 rounded-full transition-all duration-300",
            isActive ? "animate-pulse [animation-delay:300ms]" : "bg-white/30"
          )}
          style={isActive ? {
            backgroundColor: activeColor,
            boxShadow: `0 0 12px ${hexToRgba(activeColor, 0.9)}`
          } : undefined}
        />
        <span
          className={cn(
            "w-2.5 h-2.5 rounded-full transition-all duration-300",
            isActive ? "animate-pulse [animation-delay:600ms]" : "bg-white/30"
          )}
          style={isActive ? {
            backgroundColor: activeColor,
            boxShadow: `0 0 12px ${hexToRgba(activeColor, 0.9)}`
          } : undefined}
        />
      </motion.div>
    );
  }

  const isLineStyle = lyricsStyle === 'line';
  const hasWords = !isLineStyle && Array.isArray(line?.words) && line.words.length > 0;

  const sizeClasses = {
    sm: "text-lg md:text-xl font-bold leading-relaxed",
    md: "text-xl md:text-2xl lg:text-3xl font-black leading-snug tracking-tight",
    lg: "text-2xl md:text-3xl lg:text-4xl font-black leading-tight tracking-tight"
  }[size] || "text-xl md:text-2xl font-black leading-snug";

  const alignClasses = {
    center: "text-center justify-center",
    left: "text-left justify-start"
  }[align] || "text-center justify-center";

  return (
    <motion.div
      initial={false}
      animate={{
        opacity: isActive ? 1 : 0.28,
        scale: isActive ? (isLineStyle ? 1.015 : 1.035) : 1,
        filter: isActive ? 'blur(0px)' : (isLineStyle ? 'blur(0.8px)' : 'blur(1.2px)')
      }}
      transition={{ type: "spring", damping: 26, stiffness: 220 }}
      onClick={onClick}
      style={{
        filter: isActive
          ? (isLineStyle ? undefined : `drop-shadow(0 0 24px ${hexToRgba(activeColor, 0.35)})`)
          : undefined
      }}
      className={cn(
        "cursor-pointer transition-all duration-300 select-none py-1.5 px-3 rounded-2xl group flex flex-col",
        alignClasses,
        !isActive && "hover:opacity-75 hover:filter-none",
        className
      )}
    >
      <div className={cn("inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5", sizeClasses, alignClasses)}>
        {isLineStyle ? (
          <span
            className={cn(
              "transition-all duration-200 inline-block font-extrabold tracking-tight",
              !isActive && "text-white/30 group-hover:text-white/55"
            )}
            style={isActive ? {
              color: activeColor,
              textShadow: `0 0 20px ${hexToRgba(activeColor, 0.45)}`
            } : undefined}
          >
            {line?.text}
          </span>
        ) : hasWords ? (
          line.words.map((word, idx) => {
            const wordStart = word.time;
            const wordEnd = word.time + (word.duration || 0.3);
            const isWordPast = currentTime >= wordEnd;
            const isWordActive = isActive && currentTime >= wordStart && currentTime < wordEnd;
            const progress = isWordActive
              ? Math.min(1, Math.max(0, (currentTime - wordStart) / (word.duration || 0.3)))
              : isWordPast
                ? 1
                : 0;

            const progressPct = (progress * 100).toFixed(1);
            const inactiveColor = hexToRgba(activeColor, 0.32);

            return (
              <span
                key={idx}
                onClick={(e) => {
                  if (onWordClick) {
                    e.stopPropagation();
                    onWordClick(word.time);
                  }
                }}
                style={{
                  backgroundImage: isWordActive
                    ? `linear-gradient(to right, ${activeColor} 0%, ${activeColor} ${progressPct}%, ${inactiveColor} ${progressPct}%, ${inactiveColor} 100%)`
                    : undefined,
                  WebkitBackgroundClip: isWordActive ? 'text' : undefined,
                  WebkitTextFillColor: isWordActive ? 'transparent' : undefined,
                  color: !isWordActive && isWordPast && isActive ? activeColor : undefined,
                  textShadow: isWordActive
                    ? `0 0 16px ${hexToRgba(activeColor, 0.95)}, 0 0 28px ${hexToRgba(activeColor, 0.5)}`
                    : undefined
                }}
                className={cn(
                  "inline-block transition-transform duration-150 origin-bottom",
                  isWordActive && "scale-[1.08] font-black",
                  !isWordActive && isWordPast && isActive && "font-black drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]",
                  !isWordActive && !isWordPast && isActive && "text-white/35",
                  !isActive && "text-text-secondary/70 group-hover:text-text-secondary"
                )}
              >
                {word.text}
              </span>
            );
          })
        ) : (
          (() => {
            const lineDur = line?.duration || 3.5;
            const lineProgress = isActive
              ? Math.min(1, Math.max(0, (currentTime - (line?.time || 0)) / lineDur))
              : (currentTime >= (line?.time || 0) + lineDur ? 1 : 0);
            const linePct = (lineProgress * 100).toFixed(1);
            const inactiveColor = hexToRgba(activeColor, 0.35);

            return (
              <span
                style={{
                  backgroundImage: isActive
                    ? `linear-gradient(to right, ${activeColor} 0%, ${activeColor} ${linePct}%, ${inactiveColor} ${linePct}%, ${inactiveColor} 100%)`
                    : undefined,
                  WebkitBackgroundClip: isActive ? 'text' : undefined,
                  WebkitTextFillColor: isActive ? 'transparent' : undefined,
                  textShadow: isActive ? `0 0 18px ${hexToRgba(activeColor, 0.45)}` : undefined
                }}
                className={cn(
                  "transition-all duration-150 inline-block",
                  isActive ? "font-black" : "text-text-secondary/50"
                )}
              >
                {line?.text}
              </span>
            );
          })()
        )}
      </div>

      {translationText && translationText.trim().toLowerCase() !== (line?.text || '').trim().toLowerCase() && (
        <p
          className={cn(
            "text-sm md:text-base font-semibold tracking-normal transition-all duration-300 mt-1",
            align === 'left' ? "text-left" : "text-center",
            isActive ? "text-white/85 drop-shadow-[0_0_10px_rgba(255,255,255,0.25)]" : "text-white/35 group-hover:text-white/60"
          )}
        >
          {translationText}
        </p>
      )}
    </motion.div>
  );
});
