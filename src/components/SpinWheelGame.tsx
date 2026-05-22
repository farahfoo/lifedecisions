import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, RotateCcw, Play, CheckCircle2, AlertTriangle, Sparkles, Wand2, Dices } from 'lucide-react';
import { DecisionHistoryEntry } from '../types';

interface SpinWheelGameProps {
  onSaveDecision: (entry: Omit<DecisionHistoryEntry, 'id' | 'timestamp'>) => void;
  onRequestSuggestions?: (prompt: string, count: number) => Promise<string[]>;
  isAiLoading?: boolean;
}

const CATEGORIES: Record<string, string[]> = {
  'Food': [
    'Pizza', 'Sushi', 'Burgers', 'Tacos', 'Pasta', 'Salad', 'Steak', 'Ramen',
    'Dim Sum', 'Pho', 'Indian Curry', 'Greek Salad', 'French Toast', 'Burritos',
    'Noodles', 'Fish & Chips', 'Kebab', 'Hot Dog', 'Falafel', 'Paella', 'Gelato',
    'Wings', 'Poke Bowl', 'Nachos', 'Risotto'
  ],
  'Holiday': [
    'Beach', 'Mountains', 'City Break', 'Road Trip', 'Camping', 'Ski Resort',
    'Safari', 'Cruise', 'Island', 'Spa', 'Disneyland', 'Vineyard', 'Rainforest',
    'Desert', 'Historic Site', 'Theme Park', 'Lake Cabin', 'National Park',
    'Northern Lights', 'Castle Stay', 'Backpacking', 'Train Tour', 'Grand Canyon',
    'Venice', 'Santorini'
  ],
  'Watch TV': [
    'Action Movie', 'Sitcom', 'Documentary', 'Reality Show', 'Anime', 'Thriller',
    'K-Drama', 'Sci-fi', 'Horror', 'Comedy Special', 'Fantasy Epic', 'True Crime',
    'Cooking Show', 'Game Show', 'Historical Drama', 'Medical Drama', 'Legal Thriller',
    'Talk Show', 'Sports Game', 'Classic Movie', 'Indie Film', 'Sketch Comedy',
    'Nature Doc', 'Soap Opera', 'Space Opera'
  ]
};

const vibrantColors = [
  '#FF007F', // Bright Pink
  '#00F5FF', // Cyan
  '#FF8C00', // Deep Orange
  '#A020F0', // Purple
  '#39FF14', // Neon Green
  '#FFD700', // Gold
  '#FF1493', // Deep Pink
  '#7B68EE'  // Medium Slate Blue
];

// Helper to generate uneven slices whose sum is exactly 360 degrees
const generateUnevenSlices = (count: number): number[] => {
  if (count <= 0) return [];
  if (count === 1) return [360];
  let points = Array.from({ length: count - 1 }, () => Math.random() * 360);
  points.sort((a, b) => a - b);
  
  const slices: number[] = [];
  slices.push(points[0]);
  for (let i = 1; i < points.length; i++) {
    slices.push(points[i] - points[i - 1]);
  }
  slices.push(360 - points[points.length - 1]);
  return slices;
};

// Particles implementation
class ConfettiInstance {
  x: number;
  y: number;
  size: number;
  color: string;
  speedY: number;
  speedX: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  canvasHeight: number;

  constructor(width: number, height: number) {
    this.x = Math.random() * width;
    this.y = -20; // Start from top edge
    this.size = Math.random() * 6 + 2; // Smaller glitter size
    this.color = vibrantColors[Math.floor(Math.random() * vibrantColors.length)];
    this.speedY = Math.random() * 4 + 2; // Gravity effect
    this.speedX = Math.random() * 4 - 2; // Slight horizontal drift
    this.rotation = Math.random() * 360;
    this.rotationSpeed = Math.random() * 15 - 7.5;
    this.opacity = 1;
    this.canvasHeight = height;
  }

  update(): boolean {
    this.y += this.speedY;
    this.x += this.speedX;
    this.rotation += this.rotationSpeed;
    // Fade out slightly as they reach the bottom
    if (this.y > this.canvasHeight * 0.8) {
      this.opacity -= 0.01;
    }
    return this.y <= this.canvasHeight && this.opacity > 0;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation * Math.PI / 180);
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = this.color;
    
    // Draw a small star or diamond for "glitter" look
    ctx.beginPath();
    ctx.moveTo(0, -this.size);
    ctx.lineTo(this.size / 2, 0);
    ctx.lineTo(0, this.size);
    ctx.lineTo(-this.size / 2, 0);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
  }
}

export function SpinWheelGame({ onSaveDecision, onRequestSuggestions, isAiLoading }: SpinWheelGameProps) {
  const [activeCategory, setActiveCategory] = useState<string>('Food');
  const [options, setOptions] = useState<string[]>([]);
  const [sliceAngles, setSliceAngles] = useState<number[]>([]);
  const [newOption, setNewOption] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winningIndex, setWinningIndex] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const wheelRef = useRef<HTMLDivElement>(null);
  const soundCooldown = useRef(false);
  const confettiCanvasRef = useRef<HTMLCanvasElement>(null);

  const confettiRef = useRef<ConfettiInstance[]>([]);
  const rainIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load a category on mount and category change
  const loadCategory = (category: string) => {
    setActiveCategory(category);
    const pool = CATEGORIES[category] || CATEGORIES['Food'];
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 8);
    setOptions(selected);
    setSliceAngles(generateUnevenSlices(selected.length));
    setWinningIndex(null);
    setShowResult(false);

    // Clear any active glitter on category change
    if (rainIntervalRef.current) {
      clearInterval(rainIntervalRef.current);
      rainIntervalRef.current = null;
    }
    confettiRef.current = [];
  };

  useEffect(() => {
    loadCategory('Food');
    return () => {
      if (rainIntervalRef.current) {
        clearInterval(rainIntervalRef.current);
      }
    };
  }, []);

  // Set up particle loops
  useEffect(() => {
    const handleResize = () => {
      if (confettiCanvasRef.current) {
        confettiCanvasRef.current.width = window.innerWidth;
        confettiCanvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    let animFrameId: number;
    const tick = () => {
      // Confetti logic
      const cCanvas = confettiCanvasRef.current;
      if (cCanvas) {
        const ctx = cCanvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, cCanvas.width, cCanvas.height);
          confettiRef.current = confettiRef.current.filter(p => {
            const alive = p.update();
            if (alive) p.draw(ctx);
            return alive;
          });
        }
      }

      animFrameId = requestAnimationFrame(tick);
    };

    animFrameId = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animFrameId);
    };
  }, []);

  const triggerConfetti = () => {
    const canvas = confettiCanvasRef.current;
    if (!canvas) return;

    // Clear previous rain interval if any
    if (rainIntervalRef.current) {
      clearInterval(rainIntervalRef.current);
      rainIntervalRef.current = null;
    }
    confettiRef.current = [];

    // Create initial burst - reduced by 25% from 100 to 75
    const items: ConfettiInstance[] = [];
    for (let i = 0; i < 75; i++) {
      items.push(new ConfettiInstance(canvas.width, canvas.height));
    }
    confettiRef.current = items;

    // Continuously add particles for a "falling rain" effect for a short duration
    let count = 0;
    rainIntervalRef.current = setInterval(() => {
      const currentCanvas = confettiCanvasRef.current;
      if (currentCanvas) {
        // reduced by 25% from 7 to ~5 per tick
        for (let i = 0; i < 5; i++) {
          confettiRef.current.push(new ConfettiInstance(currentCanvas.width, currentCanvas.height));
        }
      }
      count++;
      if (count > 50) {
        if (rainIntervalRef.current) {
          clearInterval(rainIntervalRef.current);
          rainIntervalRef.current = null;
        }
      }
    }, 30);
  };

  // Click / Tik audio feedback
  const playTickSound = (freq = 800) => {
    if (soundCooldown.current) return;
    soundCooldown.current = true;
    setTimeout(() => { soundCooldown.current = false; }, 40);

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gainSetting = ctx.createGain();
      osc.connect(gainSetting);
      gainSetting.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gainSetting.gain.setValueAtTime(0.02, ctx.currentTime);
      gainSetting.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch (_) {}
  };

  const playSuccessSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      
      const playNote = (freq: number, delay: number, dur: number) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, now + delay);
        gainNode.gain.setValueAtTime(0.04, now + delay);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);
        osc.start(now + delay);
        osc.stop(now + delay + dur);
      };

      playNote(523.25, 0, 0.15); // C5
      playNote(659.25, 0.1, 0.15); // E5
      playNote(783.99, 0.2, 0.15); // G5
      playNote(1046.50, 0.3, 0.4); // C6
    } catch (_) {}
  };

  const handleAddOption = (textInput = newOption) => {
    const trimmed = textInput.trim();
    if (!trimmed) return;
    if (options.includes(trimmed)) return;
    const nextOptions = [...options, trimmed];
    setOptions(nextOptions);
    setSliceAngles(generateUnevenSlices(nextOptions.length));
    if (textInput === newOption) setNewOption('');
    playTickSound(600);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      alert("You need at least 2 options to spin the magical wheel!");
      return;
    }
    const updated = options.filter((_, i) => i !== index);
    setOptions(updated);
    setSliceAngles(generateUnevenSlices(updated.length));
    playTickSound(300);
  };

  const handleClearAll = () => {
    setOptions([]);
    setSliceAngles([]);
    setWinningIndex(null);
    setShowResult(false);
  };

  const handleShuffleWeights = () => {
    if (options.length < 2) return;
    setSliceAngles(generateUnevenSlices(options.length));
    playTickSound(700);
  };

  const handleSuggestAiOptions = async () => {
    if (!onRequestSuggestions) return;
    setAiError(null);
    try {
      const suggestions = await onRequestSuggestions("dinner varieties or generic choices", 5);
      if (suggestions && suggestions.length > 0) {
        setOptions(suggestions);
        setSliceAngles(generateUnevenSlices(suggestions.length));
        setShowResult(false);
        setWinningIndex(null);
      }
    } catch (e: any) {
      setAiError("Could not retrieve AI options. Try standard categories!");
    }
  };

  const getWeight = (idx: number) => {
    if (sliceAngles.length === 0) return 0;
    return Math.round((sliceAngles[idx] / 360) * 100);
  };

  const handleSpin = () => {
    if (options.length < 2) {
      alert("Please enter at least 2 options first!");
      return;
    }
    if (isSpinning) return;

    setIsSpinning(true);
    setShowResult(false);
    setWinningIndex(null);

    // Simulate clicking sound ticks of wheel spinning
    let tickCount = 0;
    const tickInterval = setInterval(() => {
      if (tickCount < 18) {
        playTickSound(800 + tickCount * 15);
        tickCount++;
      } else {
        clearInterval(tickInterval);
      }
    }, 130);

    // Pick winning index based on weighted proportions
    const r = Math.random() * 360;
    let accumulated = 0;
    let selectedWinner = 0;
    for (let i = 0; i < sliceAngles.length; i++) {
      accumulated += sliceAngles[i] || 0;
      if (r <= accumulated) {
        selectedWinner = i;
        break;
      }
    }

    // Determine target location degrees to stop winner right under top pointer
    let prevDegrees = 0;
    for (let i = 0; i < selectedWinner; i++) {
      prevDegrees += (sliceAngles[i] || 0);
    }
    const currentDegrees = (sliceAngles[selectedWinner] || 0);
    const targetSliceCenter = prevDegrees + (currentDegrees / 2);

    // Add slight random shift within the slice boundary
    const randomShift = (Math.random() - 0.5) * (currentDegrees * 0.4);
    
    // To land under the pointer at the top: (270 - sliceCenter) with offset
    const landingAngle = (270 - targetSliceCenter + randomShift + 360) % 360;
    const currentSpins = Math.floor(rotation / 360);
    const extraSpins = 5 + Math.floor(Math.random() * 4); // 5 to 8 spins
    const totalNewRotation = (currentSpins + extraSpins) * 360 + landingAngle;

    setRotation(totalNewRotation);

    setTimeout(() => {
      setIsSpinning(false);
      setWinningIndex(selectedWinner);
      setShowResult(true);
      playSuccessSound();
      triggerConfetti();

      // Save to server history
      onSaveDecision({
        gameType: 'wheel',
        title: 'Wheel',
        result: `${options[selectedWinner]} (${getWeight(selectedWinner)}% odds)`,
        options: options.map((opt, id) => `${opt} (${getWeight(id)}%)`)
      });
    }, 3500);
  };

  const handleReset = () => {
    setIsSpinning(false);
    setShowResult(false);
    setWinningIndex(null);
    setRotation(0);
    loadCategory(activeCategory);
  };

  // Dynamically render SVG slices on demand
  const renderSvgSlices = () => {
    if (options.length === 0) return null;
    let cumulativeAngle = 0;
    
    return sliceAngles.map((angle, i) => {
      const startAngle = cumulativeAngle;
      const endAngle = cumulativeAngle + angle;
      
      const x1 = 50 + 50 * Math.cos(Math.PI * startAngle / 180);
      const y1 = 50 + 50 * Math.sin(Math.PI * startAngle / 180);
      const x2 = 50 + 50 * Math.cos(Math.PI * endAngle / 180);
      const y2 = 50 + 50 * Math.sin(Math.PI * endAngle / 180);
      
      const largeArcFlag = angle > 180 ? 1 : 0;
      const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

      const textAngle = startAngle + angle / 2;
      const textRadius = 32;
      const tx = 50 + textRadius * Math.cos(Math.PI * textAngle / 180);
      const ty = 50 + textRadius * Math.sin(Math.PI * textAngle / 180);

      let textRotation = textAngle;
      if (textAngle > 90 && textAngle < 270) {
        textRotation += 180;
      }

      let label = options[i] || '';
      if (label.length > 10) label = label.substring(0, 8) + '..';

      cumulativeAngle += angle;

      return (
        <React.Fragment key={i}>
          <path
            d={pathData}
            fill={vibrantColors[i % vibrantColors.length]}
            stroke="white"
            strokeWidth="0.25"
          />
          <text
            x={tx}
            y={ty}
            fill="white"
            fontSize="7.125"
            fontFamily="'Comic Sans MS', 'Comic Sans', cursive, sans-serif"
            fontWeight="bold"
            textAnchor="middle"
            alignmentBaseline="middle"
            transform={`rotate(${textRotation}, ${tx}, ${ty})`}
            className="wheel-text select-none pointer-events-none"
          >
            {label}
          </text>
        </React.Fragment>
      );
    });
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center select-none text-lg">
      {/* Particle Overlay Canvases */}
      <canvas ref={confettiCanvasRef} className="fixed inset-0 pointer-events-none z-50 w-full h-full" />

      {/* Title Header with 100% increased size */}
      <div className="text-center mb-8">
        <span className="font-sans font-semibold text-lg tracking-wider text-primary uppercase">Quick Spark</span>
        <h2 className="font-display font-bold text-4xl md:text-5xl text-on-surface mt-1">Let Fate Decide</h2>
        <p className="font-sans text-base md:text-lg text-on-surface-variant max-w-lg mx-auto mt-2 leading-relaxed">
          Choose a category below or add custom priorities, and watch fortune settle!
        </p>
      </div>

      {/* Preset Category Tabs with 100% increased size */}
      <div className="w-full max-w-xl overflow-x-auto flex gap-3 justify-center pb-5 mb-5 z-10 px-2 scrollbar-none">
        {Object.keys(CATEGORIES).map((cat) => (
          <button
            key={cat}
            onClick={() => !isSpinning && loadCategory(cat)}
            disabled={isSpinning}
            className={`whitespace-nowrap px-8 py-3 rounded-full font-label-md text-base md:text-lg font-bold transition-all duration-200 border-2 cursor-pointer ${
              activeCategory === cat
                ? 'border-primary bg-primary text-white shadow-md'
                : 'border-outline-variant/30 bg-white text-on-surface-variant hover:border-primary/50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Custom options configuration slot with 100% increased size */}
      <div className="w-full bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/30 shadow-md mb-8 transition-all duration-300 hover:shadow-lg">
        <h3 className="font-display font-bold text-base md:text-lg text-on-surface mb-4 flex items-center justify-between">
          <span>Customise your options:</span>
          <span className="text-sm font-mono font-medium text-primary bg-primary/5 px-3 py-1 rounded-full">
            {options.length} choices active
          </span>
        </h3>

        <form onSubmit={(e) => { e.preventDefault(); handleAddOption(); }} className="flex gap-3">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-outline">
              <Plus className="w-6 h-6" />
            </span>
            <input
              type="text"
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              disabled={isSpinning}
              className="w-full bg-surface-container-low border-0 outline-none rounded-2xl py-3.5 pl-12 pr-4 font-sans text-sm md:text-base text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary focus:bg-white transition-all duration-300"
              placeholder="Type custom choices directly..."
            />
          </div>
          <button
            type="submit"
            disabled={isSpinning}
            className="bg-primary hover:bg-tertiary disabled:opacity-50 active:scale-95 text-white font-sans font-bold text-base px-6 py-3.5 rounded-2xl transition-all duration-300 flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <span>Add</span>
          </button>
        </form>

        <div className="flex flex-wrap gap-3 gap-y-4 mt-4">
          <button
            type="button"
            onClick={handleShuffleWeights}
            disabled={isSpinning || options.length < 2}
            className="text-xs md:text-sm font-bold text-outline hover:text-[#4648d4] disabled:opacity-50 transition-colors flex items-center gap-1.5 py-1.5 px-3.5 rounded-xl hover:bg-primary/5 cursor-pointer"
            title="Randomize slice portions with uneven probabilities"
          >
            <Dices className="w-5 h-5 text-[#4648d4]" />
            <span>Shuffle Slices 🎲</span>
          </button>
          
          {onRequestSuggestions && (
            <button
              type="button"
              disabled={isAiLoading || isSpinning}
              onClick={handleSuggestAiOptions}
              className="text-xs md:text-sm font-bold text-outline hover:text-tertiary transition-colors flex items-center gap-1.5 py-1.5 px-3.5 rounded-xl hover:bg-tertiary/5 disabled:opacity-50 cursor-pointer"
            >
              <Wand2 className="w-5 h-5" />
              <span>{isAiLoading ? 'AI Generating...' : 'Suggest AI Options'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleClearAll}
            disabled={isSpinning}
            className="text-xs md:text-sm font-bold text-outline hover:text-error disabled:opacity-50 transition-colors ml-auto py-1.5 px-3.5 border border-dashed border-outline-variant/50 rounded-xl hover:bg-error/5 cursor-pointer"
          >
            Clear All
          </button>
        </div>

        {aiError && (
          <div className="mt-3.5 py-2.5 px-4 bg-red-50 text-red-700 text-xs md:text-sm rounded-xl flex items-center gap-2 w-full">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{aiError}</span>
          </div>
        )}
      </div>

      {/* 3D Wheel Visual Stage with 100% increased size */}
      <div 
        style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
        className="relative flex flex-col items-center justify-center mb-10"
      >
        {/* Top Pointer - Enlarged */}
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-14 h-14 bg-on-surface rotate-45 z-20 rounded-xl shadow-xl border-4 border-white flex items-center justify-center">
          <div className="w-3 h-3 bg-primary rounded-full"></div>
        </div>

        {/* 3D Rotator Inner Container */}
        <div style={{ transform: 'rotateX(12deg)', transformStyle: 'preserve-3d' }}>
          <div ref={wheelRef} className="p-4 bg-white rounded-full shadow-[0px_24px_60px_rgba(70,72,212,0.18)] relative">
            <div
              className="w-[340px] h-[340px] md:w-[480px] md:h-[480px] rounded-full overflow-hidden relative"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: isSpinning ? 'transform 3.5s cubic-bezier(0.1, 0.7, 0.1, 1)' : 'none',
                willChange: 'transform'
              }}
            >
              <svg viewBox="0 0 100 100" className="w-full h-full rotate-[0deg]">
                {renderSvgSlices()}
              </svg>

              {/* Gloss overlays to match elegant premium layout */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none rounded-full" />
            </div>

            {/* Inner primary hub center cap representing core pivot */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-white rounded-full z-10 shadow-lg flex items-center justify-center border-4 border-surface-variant/30">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold text-2xl select-none pointer-events-none shadow-md">
                ⭐
              </div>
            </div>
          </div>
        </div>

        {/* Shadow base floor mimicking volumetric presence - Enlarged */}
        <div className="w-[280px] md:w-[380px] h-6 bg-on-surface/5 rounded-[100%] mt-8 blur-lg mix-blend-multiply pointer-events-none" />
      </div>

      {/* Dynamic item chips indicator with sector colors with 100% increased size */}
      {options.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2.5 max-w-2xl mb-8">
          {options.map((option, idx) => (
            <div
              key={idx}
              className="bg-white hover:-translate-y-0.5 text-on-surface text-sm font-bold px-4.5 py-2 mt-1.5 rounded-full flex items-center gap-2.5 shadow-sm border border-outline-variant/30 transition-all duration-200"
            >
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: vibrantColors[idx % vibrantColors.length] }}></div>
              <span className="truncate max-w-[160px]">{option} ({getWeight(idx)}%)</span>
              <button
                type="button"
                onClick={() => handleRemoveOption(idx)}
                disabled={isSpinning}
                className="text-outline hover:text-error transition-colors p-0.5 focus:outline-none cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Trigger Buttons with 100% increased size */}
      <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md z-12 pb-8">
        <button
          onClick={handleSpin}
          disabled={isSpinning || options.length < 2}
          className="w-full flex-1 bg-primary hover:bg-tertiary disabled:opacity-50 text-white font-label-md text-xl py-5 rounded-2xl shadow-xl active:scale-95 transition-all duration-200 flex items-center justify-center gap-3 hover:opacity-95 cursor-pointer font-bold uppercase tracking-wider px-10"
        >
          <Sparkles className="w-7 h-7 text-white animate-pulse" />
          <span>{isSpinning ? 'Spinnin...' : 'Spin to Decide'}</span>
        </button>

        <button
          onClick={handleReset}
          disabled={isSpinning}
          className="w-full sm:w-auto px-12 py-5 border-2 border-outline-variant/30 hover:border-primary text-on-surface-variant hover:text-primary font-label-md text-xl font-bold uppercase tracking-wider rounded-2xl bg-white shadow-md hover:bg-surface-container-low active:scale-95 transition-all duration-200 cursor-pointer"
        >
          Reset
        </button>
      </div>

      {/* Winner Modal overlay cards with 100% increased size */}
      {showResult && winningIndex !== null && (
        <div className="w-full max-w-xl bg-gradient-to-br from-white to-[#faf8ff] rounded-3xl p-10 border-2 border-primary/20 shadow-xl animate-float flex flex-col items-center text-center relative overflow-hidden mt-4 z-10">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-tertiary to-secondary"></div>
          
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4 text-3xl">
            🎉
          </div>

          <span className="text-sm font-bold text-outline uppercase tracking-widest font-mono">FATE CHOSEN SUCCESS</span>
          <h4 className="font-display font-extrabold text-4xl text-[#121633] mt-2 px-4 leading-snug">
            {options[winningIndex]}
          </h4>
          
          <p className="text-base text-on-surface-variant font-sans mt-3 max-w-md px-3 leading-relaxed">
            "The magical wheel has spoken! Take action with high-fidelity, and enjoy the adventure!"
          </p>

          <button
            onClick={() => setShowResult(false)}
            className="mt-6 bg-primary/10 hover:bg-primary/20 text-primary px-8 py-3 rounded-xl text-base font-bold transition-all focus:outline-none cursor-pointer"
          >
            Accept Fate
          </button>
        </div>
      )}
    </div>
  );
}
