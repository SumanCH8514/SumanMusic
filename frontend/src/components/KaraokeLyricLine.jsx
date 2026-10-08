import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

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
  className = ''
}) => {
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
            isActive
              ? "bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)] animate-pulse"
              : "bg-white/30"
          )}
        />
        <span
          className={cn(
            "w-2.5 h-2.5 rounded-full transition-all duration-300",
            isActive
              ? "bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)] animate-pulse [animation-delay:300ms]"
              : "bg-white/30"
          )}
        />
        <span
          className={cn(
            "w-2.5 h-2.5 rounded-full transition-all duration-300",
            isActive
              ? "bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)] animate-pulse [animation-delay:600ms]"
              : "bg-white/30"
          )}
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
      className={cn(
        "cursor-pointer transition-all duration-300 select-none py-1.5 px-3 rounded-2xl group flex flex-col",
        alignClasses,
        isActive
          ? (isLineStyle ? "" : "drop-shadow-[0_0_24px_rgba(255,255,255,0.35)]")
          : "hover:opacity-75 hover:filter-none",
        className
      )}
    >
      <div className={cn("inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5", sizeClasses, alignClasses)}>
        {isLineStyle ? (
          <span
            className={cn(
              "transition-all duration-200 inline-block font-extrabold tracking-tight",
              isActive
                ? "text-white"
                : "text-white/30 group-hover:text-white/55"
            )}
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
                    ? `linear-gradient(to right, var(--color-text-primary, #ffffff) 0%, var(--color-text-primary, #ffffff) ${progressPct}%, rgba(255, 255, 255, 0.3) ${progressPct}%, rgba(255, 255, 255, 0.3) 100%)`
                    : undefined,
                  WebkitBackgroundClip: isWordActive ? 'text' : undefined,
                  WebkitTextFillColor: isWordActive ? 'transparent' : undefined
                }}
                className={cn(
                  "inline-block transition-transform duration-150 origin-bottom",
                  isWordActive && "scale-[1.08] font-black text-white drop-shadow-[0_0_16px_rgba(255,255,255,0.95)] drop-shadow-[0_0_28px_rgba(255,255,255,0.5)]",
                  !isWordActive && isWordPast && isActive && "text-text-primary",
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

            return (
              <span
                style={{
                  backgroundImage: isActive
                    ? `linear-gradient(to right, var(--color-text-primary, #ffffff) 0%, var(--color-text-primary, #ffffff) ${linePct}%, rgba(255, 255, 255, 0.35) ${linePct}%, rgba(255, 255, 255, 0.35) 100%)`
                    : undefined,
                  WebkitBackgroundClip: isActive ? 'text' : undefined,
                  WebkitTextFillColor: isActive ? 'transparent' : undefined
                }}
                className={cn(
                  "transition-all duration-150 inline-block",
                  isActive ? "font-black drop-shadow-[0_0_18px_rgba(255,255,255,0.4)]" : "text-text-secondary/50"
                )}
              >
                {line?.text}
              </span>
            );
          })()
        )}
      </div>

      {translationText && (
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
