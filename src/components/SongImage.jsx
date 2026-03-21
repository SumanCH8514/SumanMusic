import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import placeholderImg from '../assets/placeholder_song.png';

const SongImage = ({ src, alt, className, ...props }) => {
  const [error, setError] = useState(false);
  const [imgSrc, setImgSrc] = useState(src);

  useEffect(() => {
    setImgSrc(src);
    setError(false);
  }, [src]);

  const handleError = () => {
    setError(true);
    setImgSrc(placeholderImg);
  };

  return (
    <img
      src={imgSrc || placeholderImg}
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
