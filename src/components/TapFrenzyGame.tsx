import React, { useState, useEffect, useRef } from 'react';
import { Play, Sparkles, ShoppingBag, RotateCcw, Timer, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DecisionHistoryEntry } from '../types';

interface TapFrenzyGameProps {
  onSaveDecision: (entry: Omit<DecisionHistoryEntry, 'id' | 'timestamp'>) => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  emoji: string;
}

const BUTTON_COLORS = [
  'bg-red-500 hover:bg-red-600 border-red-700 active:bg-red-800 text-white',
  'bg-blue-500 hover:bg-blue-600 border-blue-700 active:bg-blue-800 text-white',
  'bg-green-500 hover:bg-green-600 border-green-700 active:bg-green-800 text-white',
  'bg-amber-500 hover:bg-amber-600 border-amber-700 active:bg-amber-800 text-white',
  'bg-purple-500 hover:bg-purple-600 border-purple-700 active:bg-purple-800 text-white',
  'bg-pink-500 hover:bg-pink-600 border-pink-700 active:bg-pink-800 text-white',
];

const TAP_EMOJIS = ['💥', '🌟', '✨', '⚡', '🍿', '🔥', '🎈', '🎉'];

export function TapFrenzyGame({ onSaveDecision }: TapFrenzyGameProps) {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(7);
  
  // Position of button in percentage coordinates within the playground container
  const [buttonPos, setButtonPos] = useState({ x: 50, y: 50 });
  const [buttonColorIdx, setButtonColorIdx] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [hasSaved, setHasSaved] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesIdRef = useRef(0);

  // Play tap sound using oscillator
  const playTapSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gainSetting = ctx.createGain();
      osc.connect(gainSetting);
      gainSetting.connect(ctx.destination);
      
      osc.type = 'sine';
      // Pitch goes up with core scores
      const pitch = Math.min(1200, 300 + score * 10);
      osc.frequency.setValueAtTime(pitch, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(pitch * 1.5, ctx.currentTime + 0.1);
      
      gainSetting.gain.setValueAtTime(0.05, ctx.currentTime);
      gainSetting.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (_) {}
  };

  // Play game end buzzer sound
  const playEndSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gainSetting = ctx.createGain();
      osc.connect(gainSetting);
      gainSetting.connect(ctx.destination);
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(330, ctx.currentTime); // Mi 4
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.15); // La 4
      osc.frequency.setValueAtTime(554.37, ctx.currentTime + 0.3); // Do# 5
      gainSetting.gain.setValueAtTime(0.06, ctx.currentTime);
      gainSetting.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (_) {}
  };

  // Start the game loop
  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setTimeLeft(7);
    setButtonPos({ x: 50, y: 50 });
    setButtonColorIdx(Math.floor(Math.random() * BUTTON_COLORS.length));
    setParticles([]);
    setHasSaved(false);
    playTapSound();
  };

  // Stop the timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Timer Countdown Effect
  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setGameState('ended');
            playEndSound();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  // Save decision when game ends
  useEffect(() => {
    if (gameState === 'ended' && !hasSaved) {
      onSaveDecision({
        gameType: 'tap',
        title: 'Tap Frenzy Game',
        result: `Scored ${score} taps ($${score * 3} Spending Allowance)`,
      });
      setHasSaved(true);
    }
  }, [gameState, score, hasSaved, onSaveDecision]);

  const handleTap = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (gameState !== 'playing') return;
    
    playTapSound();
    setScore(prev => prev + 1);

    // Relocate the button inside the playground container
    const randomX = Math.round(15 + Math.random() * 70); // 15% to 85% to stay well on screen
    const randomY = Math.round(15 + Math.random() * 70);
    setButtonPos({ x: randomX, y: randomY });

    // Cycle to a new bright color
    setButtonColorIdx((prev) => (prev + 1) % BUTTON_COLORS.length);

    // Create a visual wave of explosion particles
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const newParticles = Array.from({ length: 4 }).map((_, i) => ({
        id: particlesIdRef.current++,
        x: clickX,
        y: clickY,
        color: ['text-red-500', 'text-yellow-400', 'text-blue-400', 'text-green-500', 'text-pink-500'][Math.floor(Math.random() * 5)],
        emoji: TAP_EMOJIS[Math.floor(Math.random() * TAP_EMOJIS.length)],
      }));

      setParticles((prev) => [...prev, ...newParticles]);
    }
  };

  // Clean up old particles
  useEffect(() => {
    if (particles.length > 0) {
      const timer = setTimeout(() => {
        setParticles((prev) => prev.slice(4));
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [particles]);

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
      
      {/* Title & Banner */}
      <div className="text-center mb-4">
        <span className="font-sans font-semibold text-[11px] tracking-wider text-primary uppercase">Cartoon Frenzy Arcade</span>
        <h2 className="font-display font-extrabold text-3xl text-[#131b2e] mt-0.5 select-none flex items-center justify-center gap-1.5">
          <span>⚡ Tap Frenzy</span>
        </h2>
        <p className="font-sans text-xs text-on-surface-variant max-w-xs mx-auto mt-1 leading-relaxed">
          The ultimate arcade clicker! Challenge your reaction speeds to win a virtual shopping budget limit.
        </p>
      </div>

      {/* Main Game Screen Portal Container */}
      <div 
        id="tap-frenzy-portal"
        className="w-full bg-white rounded-3xl border-4 border-[#131b2e] shadow-[0px_16px_0px_#131b2e] p-6 relative overflow-hidden flex flex-col justify-between select-none"
        style={{ minHeight: '440px' }}
      >
        
        {/* Status Dashboard HUD */}
        <div className="flex items-center justify-between bg-yellow-100 border-2 border-[#131b2e] rounded-xl px-4 py-2 mt-1 shadow-[4px_4px_0px_#131b2e] relative z-10">
          <div className="flex items-center gap-1">
            <Timer className="w-4 h-4 text-[#131b2e]" />
            <span className="font-mono text-sm font-black text-[#131b2e] uppercase">
              Time: {timeLeft}s
            </span>
          </div>
          
          <div className="flex items-center gap-1 bg-white border border-[#131b2e] px-2.5 py-0.5 rounded-md shadow-[2px_2px_0px_#131b2e]">
            <Trophy className="w-4 h-4 text-amber-500 fill-amber-300" />
            <span className="font-mono text-sm font-black text-[#131b2e]">
              Score: {score}
            </span>
          </div>
        </div>

        {/* Action Window Panel */}
        <div 
          ref={containerRef} 
          className="relative flex-grow min-h-[300px] bg-slate-50 border-2 border-dashed border-[#131b2e]/30 rounded-2xl my-4 overflow-hidden"
        >
          {/* Decorative Sparkles background */}
          <div className="absolute inset-0 opacity-5 pointer-events-none grid grid-cols-4 grid-rows-4">
            {Array.from({ length: 16 }).map((_, idx) => (
              <div key={idx} className="flex items-center justify-center text-xl">✨</div>
            ))}
          </div>

          <AnimatePresence>
            {gameState === 'idle' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-white/95"
              >
                <div className="w-16 h-16 rounded-full bg-pink-100 border-2 border-[#131b2e] flex items-center justify-center text-3xl mb-3 shadow-[3px_3px_0px_#131b2e]">
                  ⚡
                </div>
                <h3 className="font-display font-black text-xl text-[#131b2e] uppercase text-center">Ready for a frenzy?</h3>
                <p className="font-sans text-xs text-on-surface-variant max-w-xs text-center mt-1 leading-relaxed">
                  A high-velocity colorful bubble button will spawn. Tap it as fast as you possibly can in 7 seconds — each tap is worth $3 of shopping allowance!
                </p>
                <button
                  onClick={startGame}
                  className="mt-4 bg-lime-400 hover:bg-lime-500 text-[#131b2e] font-display font-black text-sm uppercase px-5 py-2.5 rounded-full border-2 border-[#131b2e] shadow-[4px_4px_0px_#131b2e] hover:shadow-[2px_2px_0px_#131b2e] hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center gap-1.5 focus:outline-none"
                >
                  <Play className="w-4 h-4 text-[#131b2e] fill-[#131b2e]" />
                  <span>Start Clickathon</span>
                </button>
              </motion.div>
            )}

            {gameState === 'playing' && (
              <motion.button
                key={`${buttonPos.x}-${buttonPos.y}`}
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: Math.sin(timeLeft) * 5 }}
                exit={{ scale: 0 }}
                transition={{ type: 'spring', stiffness: 450, damping: 15 }}
                onClick={handleTap}
                style={{
                  position: 'absolute',
                  left: `${buttonPos.x}%`,
                  top: `${buttonPos.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className={`w-16 h-16 rounded-full border-3 border-[#131b2e] font-display font-black text-xl flex items-center justify-center shadow-[4px_4px_0px_#131b2e] cursor-pointer hover:scale-105 active:scale-95 transition-transform select-none focus:outline-none ${BUTTON_COLORS[buttonColorIdx]}`}
              >
                TAP!
              </motion.button>
            )}

            {gameState === 'ended' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center p-5 bg-white/95"
              >
                {/* Simulated Confetti graphics backing */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden block">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ y: -20, x: Math.random() * 400, opacity: 1 }}
                      animate={{ y: 350, opacity: 0 }}
                      transition={{ duration: 2.5 + Math.random() * 1.5, repeat: Infinity, delay: Math.random() * 2 }}
                      className="absolute text-xl"
                      style={{ left: `${Math.random() * 90}%` }}
                    >
                      {['🎉', '🍬', '✨', '🎈', '💸', '💫'][Math.floor(Math.random() * 6)]}
                    </motion.div>
                  ))}
                </div>

                <div className="w-20 h-20 rounded-2xl bg-amber-100 border-3 border-[#131b2e] flex items-center justify-center text-4xl mb-3 shadow-[4px_4px_0px_#131b2e] animate-bounce">
                  <ShoppingBag className="w-10 h-10 text-amber-500 fill-amber-200" />
                </div>
                
                <h3 className="font-display font-black text-2xl text-[#131b2e] uppercase text-center">Frenzy Complete!</h3>
                
                {/* Playful Shopping message */}
                <div className="my-2 p-4 bg-amber-50 border-2 border-dashed border-[#131b2e] rounded-xl text-center max-w-sm">
                  <p className="font-sans text-sm font-semibold text-[#131b2e] leading-snug">
                    You tapped <span className="bg-yellow-300 text-[#131b2e] px-1.5 py-0.5 rounded font-black text-base">{score}</span> times! 🎉 
                  </p>
                  <p className="font-sans text-xs font-bold text-amber-800 mt-1">
                    That means you can spend <span className="text-lime-700 font-extrabold text-sm">${score * 3}</span> on shopping today!
                  </p>
                </div>

                <div className="flex gap-3 mt-3">
                  <button
                    onClick={startGame}
                    className="bg-lime-400 hover:bg-lime-500 text-[#131b2e] font-display font-black text-xs uppercase px-4.5 py-2.5 rounded-full border-2 border-[#131b2e] shadow-[4px_4px_0px_#131b2e] hover:shadow-[2px_2px_0px_#131b2e] hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center gap-1 focus:outline-none"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Try Again</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Floating Tap Explosion Particle elements */}
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 1, scale: 0.5, x: p.x - 12, y: p.y - 12 }}
              animate={{ opacity: 0, scale: 1.8, y: p.y - 100, x: p.x + (Math.random() - 0.5) * 80 }}
              transition={{ duration: 0.65, ease: 'easeOut' }}
              className={`absolute text-xl pointer-events-none select-none font-bold ${p.color}`}
            >
              {p.emoji}
            </motion.div>
          ))}
        </div>

        {/* Playroom Bottom Footer Bar */}
        <div className="text-center font-mono text-[9px] text-outline uppercase tracking-wider select-none mt-1">
          {gameState === 'playing' ? "⚡ DOUBLE TAP EXTRA FOR CARTOON BONUS! ⚡" : "🎡 SPARK GAMES CHANCE CORP © 2026"}
        </div>

      </div>

    </div>
  );
}
