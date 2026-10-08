import { useContext } from 'react';
import { PlayerContext, PlayerProgressContext } from './PlayerContext';

export const usePlayer = () => useContext(PlayerContext);
export const usePlayerProgress = () => useContext(PlayerProgressContext);
