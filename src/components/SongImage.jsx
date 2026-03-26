import React, { useState } from 'react';
import { cn } from '../lib/utils';
import placeholderImg from '../assets/placeholder_song.png';

const SongImage = ({ src, alt, className, ...props }) => {
  const [error, setError] = useState(false);

  const handleError = () => {
    setError(true);
  };
  
  const currentSrc = error || !src ? placeholderImg : src;

  return (
    <img
      key={src}
      src={currentSrc}
      alt={alt}
      className={cn(
        "object-cover",
        error && "opacity-80", // Subtle visual hint for placeholder
        className
      )}
      onError={handleError}
      {...props}
    />
  );
};

export default SongImage;
