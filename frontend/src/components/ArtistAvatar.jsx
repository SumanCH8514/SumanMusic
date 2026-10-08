import React, { useState, useEffect, useMemo, memo } from 'react';
import { cn } from '../lib/utils';
import { fetchArtistImage, getCachedArtistImageSync, isGenericImage } from '../services/artistService';

const ArtistAvatar = memo(({ artistName, fallbackCover, className }) => {
  const [imageUrl, setImageUrl] = useState(() => {
    const memoryHit = getCachedArtistImageSync(artistName);
    if (memoryHit && !isGenericImage(memoryHit)) return memoryHit;
    return !isGenericImage(fallbackCover) ? fallbackCover : null;
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetchArtistImage(artistName, fallbackCover).then(url => {
      if (isMounted && url) {
        setImageUrl(url);
      }
    });
    return () => { isMounted = false; };
  }, [artistName, fallbackCover]);

  const initials = useMemo(() => {
    if (!artistName) return 'A';
    return artistName
      .split(' ')
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase() || 'A';
  }, [artistName]);

  const gradientClass = useMemo(() => {
    const gradients = [
      'from-rose-500 to-purple-700',
      'from-blue-600 to-indigo-800',
      'from-emerald-500 to-teal-800',
      'from-amber-500 to-orange-700',
      'from-violet-600 to-fuchsia-800',
      'from-cyan-500 to-blue-700',
    ];
    let hash = 0;
    const name = artistName || 'Artist';
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return gradients[Math.abs(hash) % gradients.length];
  }, [artistName]);

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={artistName}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setImageUrl(null)}
        className={cn(
          "w-full h-full object-cover transition-all duration-700",
          loaded ? "opacity-100 scale-100" : "opacity-30 scale-105 blur-sm",
          className
        )}
      />
    );
  }

  return (
    <div className={cn(
      "w-full h-full flex items-center justify-center bg-gradient-to-br text-white font-black select-none shadow-inner",
      gradientClass,
      className
    )}>
      <span className="text-xl md:text-3xl tracking-wider font-extrabold">{initials}</span>
    </div>
  );
});

export default ArtistAvatar;
