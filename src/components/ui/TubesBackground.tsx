"use client";

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

// Helper for random colors
const randomColors = (count: number) => {
  return new Array(count)
    .fill(0)
    .map(() => "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'));
};

interface TubesBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  enableClickInteraction?: boolean;
}

export function TubesBackground({
  children,
  className,
  enableClickInteraction = true,
}: TubesBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const tubesRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;
    let cleanup: (() => void) | undefined;

    const initTubes = async () => {
      if (!canvasRef.current) return;

      try {
        // @ts-ignore
        const module = await import('threejs-components/build/cursors/tubes1.min.js');
        const TubesCursor = module.default || module;

        if (!mounted) return;

        const app = TubesCursor(canvasRef.current, {
          tubes: {
            colors: ["#f967fb", "#53bc28", "#6958d5"],
            lights: {
              intensity: 200,
              colors: ["#83f36e", "#fe8a2e", "#ff008a", "#60aed5"],
            },
          },
        });

        tubesRef.current = app;
        if (mounted) setIsLoaded(true);

        const handleResize = () => {};
        window.addEventListener('resize', handleResize);
        cleanup = () => window.removeEventListener('resize', handleResize);
      } catch (error) {
        console.warn("TubesBackground: WebGL animation failed to load, using CSS fallback.", error);
        if (mounted) setHasFailed(true);
      }
    };

    initTubes();

    return () => {
      mounted = false;
      if (cleanup) cleanup();
    };
  }, []);

  const handleClick = () => {
    if (!enableClickInteraction || !tubesRef.current) return;
    const colors = randomColors(3);
    const lightsColors = randomColors(4);
    tubesRef.current.tubes?.setColors(colors);
    tubesRef.current.tubes?.setLightsColors(lightsColors);
  };

  return (
    <div
      className={cn("relative w-full overflow-hidden", className)}
      onClick={handleClick}
    >
      {/* CSS gradient fallback shown when WebGL fails OR as initial background
          while the canvas loads — this prevents the white flash */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-1000",
          // Keep the fallback visible when WebGL fails; hide it once tubes loaded
          isLoaded ? "opacity-0" : "opacity-100"
        )}
        style={{
          background: hasFailed
            ? `
              radial-gradient(ellipse at 20% 50%, rgba(105, 88, 213, 0.4) 0%, transparent 60%),
              radial-gradient(ellipse at 80% 20%, rgba(249, 103, 251, 0.3) 0%, transparent 55%),
              radial-gradient(ellipse at 60% 80%, rgba(83, 188, 40, 0.25) 0%, transparent 50%),
              #0f1115
            `
            : '#0f1115',
        }}
      />

      {/* WebGL canvas — z-index 0 so it stays behind content overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block"
        style={{ touchAction: 'none', zIndex: 0 }}
      />

      {/* Content Overlay — z-index 10 ensures it always renders above the canvas */}
      <div className="relative w-full h-full" style={{ zIndex: 10 }}>
        {children}
      </div>
    </div>
  );
}

export default TubesBackground;
