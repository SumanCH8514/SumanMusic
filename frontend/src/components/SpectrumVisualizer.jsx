import React, { useEffect, useRef, memo } from 'react';
import { usePlayer } from '../context/usePlayer';

const SpectrumVisualizer = memo(({ className, height = 90, barCount = 36 }) => {
  const { isPlaying, getFrequencyData } = usePlayer();
  const canvasRef = useRef(null);
  const dataArrayRef = useRef(new Uint8Array(64));
  const animFrameRef = useRef(null);
  const smoothedBarsRef = useRef(new Float32Array(barCount));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animTime = 0;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const h = canvas.clientHeight;

      if (canvas.width !== width * dpr || canvas.height !== h * dpr) {
        canvas.width = width * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, h);

      animTime += 0.04;
      const hasReal = isPlaying && getFrequencyData ? getFrequencyData(dataArrayRef.current) : false;
      const freqData = dataArrayRef.current;

      const gap = 3;
      const totalBarWidth = (width - gap * (barCount - 1)) / barCount;
      const barWidth = Math.max(2, totalBarWidth);

      const gradient = ctx.createLinearGradient(0, h, 0, 0);
      gradient.addColorStop(0, 'rgba(29, 185, 84, 0.25)');
      gradient.addColorStop(0.6, '#1db954');
      gradient.addColorStop(1, '#6ee7b7');

      for (let i = 0; i < barCount; i++) {
        let target = 0.05;
        if (hasReal) {
          const binIndex = Math.min(freqData.length - 1, Math.floor((i / barCount) * 48));
          target = Math.max(0.05, (freqData[binIndex] || 0) / 255);
        } else if (isPlaying) {
          target = 0.15 + 0.55 * Math.abs(Math.sin(animTime * 1.8 + i * 0.25) * Math.cos(animTime * 0.9 + i * 0.1));
        }

        smoothedBarsRef.current[i] += (target - smoothedBarsRef.current[i]) * 0.28;
        const barHeight = Math.max(3, smoothedBarsRef.current[i] * (h - 6));
        const x = i * (barWidth + gap);
        const y = h - barHeight;

        ctx.fillStyle = gradient;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barWidth, barHeight, [3, 3, 0, 0]);
        } else {
          ctx.rect(x, y, barWidth, barHeight);
        }
        ctx.fill();
      }

      if (isPlaying) {
        animFrameRef.current = requestAnimationFrame(render);
      }
    };

    render();

    if (isPlaying) {
      animFrameRef.current = requestAnimationFrame(render);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, getFrequencyData, barCount]);

  return (
    <div className={className} style={{ height }}>
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
});

export default SpectrumVisualizer;
