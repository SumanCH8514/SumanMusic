import React, { useState, useEffect, useMemo } from 'react';
import { cn } from '../lib/utils';
import { Disc3 } from 'lucide-react';

/**
 * Deterministic color generator derived from title and artist string.
 * Generates rich, modern HSL mesh gradients inspired by Apple Music & YT Music.
 */
const getGradientStyles = (str = '') => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const h1 = Math.abs(hash) % 360;
  const h2 = (h1 + 45 + (Math.abs(hash >> 3) % 90)) % 360;
  const h3 = (h2 + 60 + (Math.abs(hash >> 6) % 120)) % 360;

  const s1 = 70 + (Math.abs(hash >> 2) % 20);
  const s2 = 65 + (Math.abs(hash >> 4) % 20);
  const l1 = 30 + (Math.abs(hash >> 5) % 20);
  const l2 = 20 + (Math.abs(hash >> 7) % 20);

  return {
    background: `radial-gradient(circle at 20% 20%, hsl(${h1}, ${s1}%, ${l1}%), transparent 70%),
                 radial-gradient(circle at 80% 80%, hsl(${h2}, ${s2}%, ${l2}%), transparent 70%),
                 hsl(${h3}, 40%, 15%)`,
    initials: (str.trim().slice(0, 2) || '🎵').toUpperCase()
  };
};

const SongImage = ({ src, alt, title = '', artist = '', className, ...props }) => {
  const [loadedSrc, setLoadedSrc] = useState(null);
  const [hasError, setHasError] = useState(false);

  const seed = useMemo(() => `${title}_${artist}_${alt || ''}`, [title, artist, alt]);
  const gradient = useMemo(() => getGradientStyles(seed), [seed]);

  useEffect(() => {
    if (!src || src.includes('placeholder')) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoadedSrc(null);
      setHasError(false);
      return;
    }

    setHasError(false);
    let isMounted = true;
    const img = new Image();
    img.src = src;
    img.onload = () => {
      if (isMounted) setLoadedSrc(src);
    };
    img.onerror = () => {
      if (isMounted) setHasError(true);
    };

    return () => {
      isMounted = false;
    };
  }, [src]);

  return (
    <div
      className={cn(
        "relative overflow-hidden flex items-center justify-center select-none rounded-xl transition-all duration-300",
        className
      )}
      style={!loadedSrc || hasError ? { background: gradient.background } : undefined}
      {...props}
    >
      {/* 1. Dynamic Generative Artwork Fallback (0ms display) */}
      {(!loadedSrc || hasError) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-white/90">
          <div className="relative flex items-center justify-center">
            {/* Vinyl Accent Overlay */}
            <Disc3 className="w-7 h-7 text-white/40 animate-spin-slow" />
            <span className="absolute text-[10px] font-black tracking-widest text-white/90">
              {gradient.initials}
            </span>
          </div>
          {title && (
            <span className="mt-1 text-[9px] font-medium text-white/70 truncate max-w-[85%] text-center leading-tight">
              {title}
            </span>
          )}
        </div>
      )}

      {/* 2. High-Res Cover Artwork with Smooth Fade-in */}
      {loadedSrc && !hasError && (
        <img
          src={loadedSrc}
          alt={alt || title || 'Song Artwork'}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-500 ease-out",
            loadedSrc ? "opacity-100" : "opacity-0"
          )}
        />
      )}
    </div>
  );
};

export default SongImage;

