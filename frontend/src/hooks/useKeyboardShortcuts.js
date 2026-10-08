import { useEffect } from 'react';

export const useKeyboardShortcuts = ({
  isPlaying,
  togglePlay,
  seek,
  currentTime,
  duration,
  volume,
  setVolume,
  toggleLike,
  currentSong,
  isFullScreen,
  setIsFullScreen,
  isShuffle,
  setIsShuffle,
  repeatMode,
  setRepeatMode,
  showToast
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        activeTag === 'select' ||
        document.activeElement?.isContentEditable
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const target = Math.max(0, (currentTime || 0) - 5);
        seek(target);
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const target = Math.min(duration || 0, (currentTime || 0) + 5);
        seek(target);
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const newVol = Math.min(1, Math.round(((volume || 1) + 0.05) * 100) / 100);
        setVolume(newVol);
        if (showToast) showToast(`Volume: ${Math.round(newVol * 100)}%`, 'info');
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const newVol = Math.max(0, Math.round(((volume || 1) - 0.05) * 100) / 100);
        setVolume(newVol);
        if (showToast) showToast(`Volume: ${Math.round(newVol * 100)}%`, 'info');
        return;
      }

      if ((e.key === 'm' || e.key === 'M') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (volume > 0) {
          localStorage.setItem('suman_music_pre_mute_vol', String(volume));
          setVolume(0);
          if (showToast) showToast('Muted', 'info');
        } else {
          const prev = parseFloat(localStorage.getItem('suman_music_pre_mute_vol') || '0.7');
          setVolume(prev > 0 ? prev : 0.7);
          if (showToast) showToast('Unmuted', 'info');
        }
        return;
      }

      if ((e.key === 'l' || e.key === 'L') && !e.ctrlKey && !e.metaKey) {
        if (currentSong && toggleLike) {
          e.preventDefault();
          toggleLike(currentSong);
        }
        return;
      }

      if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (setIsFullScreen) {
          setIsFullScreen(!isFullScreen);
        }
        return;
      }

      if ((e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (setIsShuffle) {
          const nextShuffle = !isShuffle;
          setIsShuffle(nextShuffle);
          if (showToast) showToast(nextShuffle ? 'Shuffle enabled' : 'Shuffle disabled', 'info');
        }
        return;
      }

      if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (setRepeatMode) {
          const modes = ['none', 'all', 'one'];
          const currentIndex = modes.indexOf(repeatMode || 'none');
          const nextMode = modes[(currentIndex + 1) % modes.length];
          setRepeatMode(nextMode);
          if (showToast) {
            const labels = { none: 'Repeat off', all: 'Repeat all', one: 'Repeat current' };
            showToast(labels[nextMode], 'info');
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isPlaying,
    togglePlay,
    seek,
    currentTime,
    duration,
    volume,
    setVolume,
    toggleLike,
    currentSong,
    isFullScreen,
    setIsFullScreen,
    isShuffle,
    setIsShuffle,
    repeatMode,
    setRepeatMode,
    showToast
  ]);
};
