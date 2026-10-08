import React, { memo, useEffect, useRef } from 'react';
import { cn } from '../lib/utils';
import { usePlayer } from '../context/usePlayer';

const PlayingVisualizer = memo(({ className, barClassName, isDark = false, barsCount = 4 }) => {
  const { isPlaying, getFrequencyData } = usePlayer();
  const barsRef = useRef([]);
  const animFrameRef = useRef(null);
  const dataArrayRef = useRef(new Uint8Array(64));

  useEffect(() => {
    if (!isPlaying) {
      barsRef.current.forEach(bar => {
        if (bar) bar.style.transform = 'scaleY(0.2)';
      });
      return;
    }

    let step = 0;
    const update = () => {
      const hasRealData = getFrequencyData ? getFrequencyData(dataArrayRef.current) : false;
      const data = dataArrayRef.current;
      step += 0.08;
      const binStep = Math.max(1, Math.floor(data.length / (barsCount + 1)));

      for (let i = 0; i < barsCount; i++) {
        const bar = barsRef.current[i];
        if (!bar) continue;

        let scale = 0.2;
        if (hasRealData && data[i * binStep] > 0) {
          const val = data[i * binStep] / 255;
          scale = Math.max(0.15, Math.min(1, val * 1.3));
        } else {
          scale = 0.25 + 0.65 * Math.abs(Math.sin(step + i * 0.9));
        }
        bar.style.transform = `scaleY(${scale})`;
      }

      animFrameRef.current = requestAnimationFrame(update);
    };

    animFrameRef.current = requestAnimationFrame(update);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, getFrequencyData, barsCount]);

  return (
    <div className={cn("flex items-end gap-[2px] h-3.5 select-none pointer-events-none", className)}>
      {Array.from({ length: barsCount }, (_, i) => (
        <span
          key={i}
          ref={el => (barsRef.current[i] = el)}
          className={cn(
            "w-[2px] h-full rounded-full origin-bottom transform-gpu will-change-transform transition-transform duration-75",
            isDark ? "bg-black" : "bg-primary",
            barClassName
          )}
          style={{ transform: 'scaleY(0.2)' }}
        />
      ))}
    </div>
  );
});

export default PlayingVisualizer;
