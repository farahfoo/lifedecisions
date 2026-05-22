import React, { useState, useEffect, useRef } from 'react';
import { Sparkle, Star } from 'lucide-react';

export function BouncingMagicalStar() {
  const [position, setPosition] = useState({ x: 100, y: 150 });
  const [trail, setTrail] = useState<{ x: number; y: number }[]>([]);
  const [brightness, setBrightness] = useState(1);
  
  const stateRef = useRef({
    x: 100,
    y: 150,
    vx: 0.6, // slow motion velocity
    vy: 0.4,
    width: typeof window !== 'undefined' ? window.innerWidth : 800,
    height: typeof window !== 'undefined' ? window.innerHeight : 600,
    trailHistory: [] as { x: number; y: number }[]
  });

  useEffect(() => {
    const handleResize = () => {
      stateRef.current.width = window.innerWidth;
      stateRef.current.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    // Randomize initial starting velocity slightly to be distinct
    stateRef.current.vx = (Math.random() > 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.4);
    stateRef.current.vy = (Math.random() > 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.4);
    // Initial position
    stateRef.current.x = Math.random() * (stateRef.current.width - 150) + 50;
    stateRef.current.y = Math.random() * (stateRef.current.height - 150) + 50;

    let animId: number;
    const update = () => {
      const state = stateRef.current;
      const starSize = 56; // approximate render bounding box

      // Move star
      state.x += state.vx;
      state.y += state.vy;

      // Bounce horizontal
      if (state.x < 10) {
        state.x = 10;
        state.vx = Math.abs(state.vx) * (0.9 + Math.random() * 0.2); // slight speed wobble
      } else if (state.x > state.width - starSize) {
        state.x = state.width - starSize;
        state.vx = -Math.abs(state.vx) * (0.9 + Math.random() * 0.2);
      }

      // Bounce vertical
      if (state.y < 10) {
        state.y = 10;
        state.vy = Math.abs(state.vy) * (0.9 + Math.random() * 0.2);
      } else if (state.y > state.height - starSize) {
        state.y = state.height - starSize;
        state.vy = -Math.abs(state.vy) * (0.9 + Math.random() * 0.2);
      }

      // Consolidate trail history (need enough frames of delay to see separation)
      state.trailHistory.unshift({ x: state.x, y: state.y });
      if (state.trailHistory.length > 50) {
        state.trailHistory.pop();
      }

      setPosition({ x: state.x, y: state.y });
      setTrail([...state.trailHistory]);

      // Calculate slow bright-dim heartbeat (pulse opacity between 0.35 and 0.95 every few seconds)
      const pulse = 0.65 + 0.3 * Math.sin(Date.now() / 1200);
      setBrightness(pulse);

      animId = requestAnimationFrame(update);
    };

    animId = requestAnimationFrame(update);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  // Extract trailing coordinates with distinct indices for three mini trail stars (e.g., 10th, 22nd, 34th historical frame)
  const trailIndices = [12, 24, 36];
  const miniStars = trailIndices.map((historyIdx, i) => {
    const pt = trail[historyIdx];
    if (!pt) return null;

    // Each mini star has its own blink heartbeat based on sine functions with phase shifts
    const miniBlink = 0.5 + 0.5 * Math.sin((Date.now() / 500) + i * 1.5);
    const sizeMap = [18, 14, 10]; // scale down trail sizes further down the list

    return (
      <div
        key={`mini-${i}`}
        style={{
          position: 'fixed',
          left: pt.x + 20, // center offset corresponding relative to main 48px star
          top: pt.y + 20,
          opacity: miniBlink * (1 - i * 0.25), // progressive fade of trail
          zIndex: 40,
          pointerEvents: 'none',
          willChange: 'transform, opacity',
          transition: 'opacity 0.1s ease-out'
        }}
        className="text-yellow-300 drop-shadow-[0_0_8px_rgba(253,224,71,0.8)]"
      >
        <Star 
          size={sizeMap[i]} 
          className="fill-yellow-300 stroke-yellow-400"
        />
      </div>
    );
  });

  return (
    <>
      {/* 3 render-behind mini trail stars */}
      {miniStars}

      {/* Primary interactive glowing bounding star sparkle */}
      <div
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          opacity: brightness,
          zIndex: 41,
          pointerEvents: 'none',
          willChange: 'transform, opacity'
        }}
        className="text-yellow-400 drop-shadow-[0_0_20px_rgba(234,179,8,0.9)] flex items-center justify-center"
      >
        <Sparkle 
          size={48} 
          className="fill-yellow-400 stroke-yellow-500 animate-[spin_10s_linear_infinite]"
        />
      </div>
    </>
  );
}
