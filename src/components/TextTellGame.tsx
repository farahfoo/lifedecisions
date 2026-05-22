import React, { useState } from 'react';
import { FileText, AlertCircle, Copy, Check, MessageSquare, ShieldQuestion, Dices, Sparkles } from 'lucide-react';
import { DecisionHistoryEntry } from '../types';

interface TextTellGameProps {
  onSaveDecision: (entry: Omit<DecisionHistoryEntry, 'id' | 'timestamp'>) => void;
  onRequestTextHelp?: (scenario: string, tone: string) => Promise<string[]>;
  isAiLoading?: boolean;
}

const PRESET_SCENARIOS = [
  {
    title: "Saying NO to plans",
    prompt: "A friend asked me to go to a concert tonight, but I am exhausted and just want to sleep.",
    presets: {
      casual: "Hey! Wish I could make it but I'm completely wiped out from this week. Have an amazing time though! 😴",
      direct: "I'd love to go another time, but I need to sit this one out and recharge tonight. Hope you have fun!",
      funny: "I am Currently in low-battery mode, and the charger is my couch. Please rock out twice as hard on my behalf! 🔋"
    }
  },
  {
    title: "Answering a weekend work ask",
    prompt: "My direct report or manager asked if I can check some urgent files on Saturday morning.",
    presets: {
      casual: "Sure, I can take a quick look around 10 AM, but I'll be off-grid for the rest of the day. Hope that works!",
      direct: "I'll review these first thing on Monday morning when I start my shift. Thank you!",
      funny: "Error 404: Saturday morning work capability not found. Just kidding—I'll handle this Monday!"
    }
  },
  {
    title: "Replying to dating follow-up",
    prompt: "We went on a nice coffee date yesterday and I want to send a cute but relaxed next day text.",
    presets: {
      casual: "Hey! Just wanted to say I had a great time yesterday. Let's grab coffee again sometime soon! ☕",
      direct: "Yesterday was wonderful. Let me know when you're free next week, I'd love to see you again.",
      funny: "My coffee was 10/10 yesterday, but the conversation was easily an 11/10. Let's repeat soon?"
    }
  },
  {
    title: "Skipping the early gym session",
    prompt: "My training partner text me at 5:30 AM to hit leg day, but my warm bed has captured me hostage.",
    presets: {
      casual: "Hey mate! Bed won this morning. Let's conquer legs tomorrow afternoon instead, deal? 🛌",
      direct: "I'm going to sleep in and sit this one out today. See you at work later!",
      funny: "Emergency alert: My blanket has declared martial law. Any movement will be treated as hostile. 😴"
    }
  },
  {
    title: "Declining a second date gently",
    prompt: "Had a nice chat on the first date, but felt zero romantic chemistry and want to keep it respectful.",
    presets: {
      casual: "Hey! Really enjoyed getting to know you yesterday. I didn't quite feel that spark, but wishing you the very best of luck! ✨",
      direct: "Thank you for the wonderful evening. You are great, but I did not feel a romantic connection between us. Take care!",
      funny: "Had an amazing chat, but I think our vibes are perfect companion-level rather than romantic. Good luck out there!"
    }
  },
  {
    title: "Group dinner bill dilemma",
    prompt: "They ordered premium cocktails and wagyu steaks, but I only had a plain water. Now they want to split 5 ways.",
    presets: {
      casual: "Hey guys, dinner was awesome! Since I just stuck to water this time, mind if I just throw in $15 for my part? 💧",
      direct: "I'd prefer to just pay for what I personally ordered tonight to keep it fair for my budget. Thank you!",
      funny: "Unless water has suddenly gone up to $80 a glass, I think I'll just pay for my solo liquid items! 😂"
    }
  }
];

export function TextTellGame({ onSaveDecision, onRequestTextHelp, isAiLoading }: TextTellGameProps) {
  const [selectedScenario, setSelectedScenario] = useState(PRESET_SCENARIOS[0]);
  const [customScenario, setCustomScenario] = useState("");
  const [activeTone, setActiveTone] = useState<'casual' | 'direct' | 'funny'>('casual');
  const [decidedText, setDecidedText] = useState("");
  const [copied, setCopied] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[] | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Play a beautiful, synthetic buzzer sound for menu interactions
  const playTickSound = (freq = 800) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gainSetting = ctx.createGain();
      osc.connect(gainSetting);
      gainSetting.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gainSetting.gain.setValueAtTime(0.01, ctx.currentTime);
      gainSetting.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (_) {}
  };

  const handleSelectScenario = (preset: typeof PRESET_SCENARIOS[0]) => {
    setSelectedScenario(preset);
    setDecidedText(preset.presets[activeTone]);
    setCustomScenario("");
    setAiSuggestions(null);
    setAiError(null);
    playTickSound(650);
  };

  const handleCustomScenarioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCustomScenario(val);
    setAiError(null);
    setAiSuggestions(null);

    if (val.trim() === "") {
      setDecidedText(selectedScenario.presets[activeTone]);
    } else {
      setDecidedText("");
    }
  };

  const handleRandomizeScenario = () => {
    const currentIndex = PRESET_SCENARIOS.findIndex(p => p.title === selectedScenario.title);
    let nextIndex = currentIndex;
    
    if (PRESET_SCENARIOS.length > 1) {
      while (nextIndex === currentIndex) {
        nextIndex = Math.floor(Math.random() * PRESET_SCENARIOS.length);
      }
    } else {
      nextIndex = Math.floor(Math.random() * PRESET_SCENARIOS.length);
    }
    
    const target = PRESET_SCENARIOS[nextIndex];
    handleSelectScenario(target);
  };

  const handleToneChange = (tone: 'casual' | 'direct' | 'funny') => {
    setActiveTone(tone);
    playTickSound(750);

    if (customScenario.trim() !== "") {
      if (aiSuggestions) {
        const idx = tone === 'casual' ? 0 : tone === 'direct' ? 1 : 2;
        setDecidedText(aiSuggestions[idx % aiSuggestions.length]);
      } else {
        setDecidedText("");
      }
    } else {
      setDecidedText(selectedScenario.presets[tone]);
    }
  };

  const handleGenerateAiText = async () => {
    if (!onRequestTextHelp) return;
    setAiError(null);
    setAiSuggestions(null);
    playTickSound(900);

    const textToSubmit = customScenario.trim() || selectedScenario.prompt;
    try {
      const suggestions = await onRequestTextHelp(textToSubmit, activeTone);
      if (suggestions && suggestions.length > 0) {
        setAiSuggestions(suggestions);
        const idx = activeTone === 'casual' ? 0 : activeTone === 'direct' ? 1 : 2;
        setDecidedText(suggestions[idx % suggestions.length]);
        
        onSaveDecision({
          gameType: 'text',
          title: 'Excuse',
          result: `${activeTone.toUpperCase()}: ${suggestions[idx % suggestions.length]}`,
          options: suggestions.map((s, i) => `${i === 0 ? 'Casual' : i === 1 ? 'Direct' : 'Funny'}: ${s}`)
        });
      }
    } catch (e: any) {
      setAiError("AI composition offline. Providing local alibi fallbacks.");
      // Standard local backup fallback generated on the fly for the fallback array standard
      const words = textToSubmit.split(' ');
      const keyPhrase = words.slice(0, 3).join(' ') || "that task";
      setAiSuggestions([
        `Hey! Friendly ping regarding your message about "${keyPhrase}". Absolutely swamped today, but let's connect shortly! ☕`,
        `Regarding "${keyPhrase}": I need to take a Raincheck. Cannot commit today. Appreciate you!`,
        `Status code 503: Busy doing intensive research about "${keyPhrase}" (re-watching comfort shows). Back on-grid tomorrow! 🚀`
      ]);
      // Set the first active tone value
      setTimeout(() => {
        const fallbackAnswers = [
          `Hey! Friendly ping regarding your message about "${keyPhrase}". Absolutely swamped today, but let's connect shortly! ☕`,
          `Regarding "${keyPhrase}": I need to take a Raincheck. Cannot commit today. Appreciate you!`,
          `Status code 503: Busy doing intensive research about "${keyPhrase}" (re-watching comfort shows). Back on-grid tomorrow! 🚀`
        ];
        const idx = activeTone === 'casual' ? 0 : activeTone === 'direct' ? 1 : 2;
        setDecidedText(fallbackAnswers[idx]);
      }, 50);
    }
  };

  const handleCopyText = () => {
    const textToCopy = decidedText || (customScenario.trim() === "" ? selectedScenario.presets[activeTone] : "");
    if (!textToCopy) return;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    playTickSound(1000);
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center flex-grow">
      <div className="text-center mb-4">
        <span className="font-sans font-semibold text-[11px] tracking-wider text-primary uppercase">Instant Playful Mojo</span>
        <h2 className="font-display font-bold text-2xl text-on-surface mt-0.5">Excuse-o-Matic</h2>
        <p className="font-sans text-xs text-on-surface-variant max-w-md mx-auto mt-1 leading-relaxed">
          Stuck on finding the perfect witty reply or social alibi? Pick a scenario, surprise yourself, or type a custom situation, select a vibe, and let's unlock instant mojo!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl items-start mb-4">
        
        {/* Scenarios selection */}
        <div className="md:col-span-1 bg-white border border-outline-variant/30 rounded-2xl p-3 flex flex-col gap-1.5">
          <div className="flex items-center justify-between mb-0.5 px-0.5">
            <span className="text-[10px] font-bold text-outline uppercase tracking-wider font-sans">Pop Scenarios</span>
            <button
              onClick={handleRandomizeScenario}
              className="text-[10px] font-sans font-extrabold text-[#4648d4] hover:text-primary flex items-center gap-1 cursor-pointer transition-colors"
              title="Pick a random popular scenario"
            >
              <Dices className="w-3 h-3 text-[#4648d4]" />
              <span>Surprise Me 🎲</span>
            </button>
          </div>
          
          <div className="flex flex-col gap-1 max-h-[160px] overflow-y-auto pr-1">
            {PRESET_SCENARIOS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectScenario(preset)}
                className={`text-left p-2 rounded-xl font-sans text-[11px] font-semibold leading-relaxed transition-all cursor-pointer ${
                  selectedScenario.title === preset.title && !customScenario
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'bg-surface hover:bg-neutral-100 text-on-surface border border-transparent'
                }`}
              >
                {preset.title}
              </button>
            ))}
          </div>
          
          <div className="border-t border-outline-variant/10 pt-2 flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-outline uppercase tracking-wider font-sans px-0.5">Custom situation</span>
            <textarea
              value={customScenario}
              onChange={handleCustomScenarioChange}
              placeholder="e.g., Canceling gym session because my dog wants to cuddle..."
              className="w-full bg-surface-container-low border-0 outline-none rounded-xl p-2 font-sans text-xs text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary focus:bg-white resize-none h-14"
            />
            {onRequestTextHelp && (
              <button
                disabled={isAiLoading}
                onClick={handleGenerateAiText}
                className="w-full py-2 bg-gradient-to-r from-primary to-[#4648d4] disabled:opacity-50 text-white font-sans font-bold text-[10px] uppercase tracking-wider rounded-lg flex items-center justify-center gap-1 shadow-xs focus:outline-none cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all"
              >
                {isAiLoading ? 'AI Composing...' : 'Excuse-o-Matic Composer 🪄'}
              </button>
            )}
          </div>
        </div>

        {/* Tone and output panel */}
        <div className="md:col-span-2 bg-white border border-outline-variant/30 rounded-2xl p-4 shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-outline-variant/10">
            <div className="flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span className="font-display font-bold text-xs text-on-surface">Mojo Output</span>
            </div>
            
            {/* Tone pills switcher */}
            <div className="flex gap-1 bg-surface rounded-lg p-0.5 border border-outline-variant/20">
              {(['casual', 'direct', 'funny'] as const).map((tone) => (
                <button
                  key={tone}
                  onClick={() => handleToneChange(tone)}
                  className={`text-[9px] font-bold font-sans uppercase tracking-wider px-2 py-0.5 rounded transition-colors cursor-pointer ${
                    activeTone === tone
                      ? 'bg-[#4648d4] text-white shadow-xs'
                      : 'text-outline hover:text-on-surface'
                  }`}
                >
                  {tone}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt context display */}
          <div className="p-2.5 bg-neutral-50 rounded-xl border border-outline-variant/10 flex items-start gap-2">
            <ShieldQuestion className="w-3.5 h-3.5 text-[#4648d4] mt-0.5 animate-bounce" />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-mono font-bold text-outline uppercase block">Current Context</span>
              <p className="text-[11px] text-on-surface-variant font-sans mt-0.5 leading-relaxed italic truncate">
                "{customScenario.trim() || selectedScenario.prompt}"
              </p>
            </div>
          </div>

          {/* text code display output board */}
          <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10 flex flex-col gap-2 relative group min-h-[110px] justify-center">
            {customScenario.trim() !== "" && !aiSuggestions ? (
              <div className="flex flex-col items-center justify-center text-center py-2 px-1">
                <Sparkles className="w-6 h-6 text-primary/45 mb-1.5 animate-pulse" />
                <span className="text-[10px] font-black tracking-wider text-primary uppercase">Draft ready for Gemini</span>
                <p className="text-[10px] text-on-surface-variant max-w-[280px] mt-0.5 leading-normal">
                  Tap <span className="font-bold text-[#4648d4]">Excuse-o-Matic Composer 🪄</span> to shape this situation into three alternative witty replies!
                </p>
              </div>
            ) : (
              <>
                <span className="text-[9px] font-bold text-primary tracking-widest uppercase font-mono">
                  {customScenario.trim() !== "" ? `Custom Reply (${activeTone})` : `Preset Reply (${activeTone})`}
                </span>
                <p className="font-sans font-semibold text-xs leading-relaxed text-on-surface pr-8">
                  {decidedText || selectedScenario.presets[activeTone]}
                </p>

                {(decidedText || customScenario.trim() === "") && (
                  <button
                    onClick={handleCopyText}
                    className="absolute top-3 right-3 p-1.5 bg-white border border-outline-variant/30 hover:border-primary text-outline hover:text-primary rounded-lg shadow-xs transition-all active:scale-90 cursor-pointer"
                    title="Copy to clipboard"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </>
            )}
          </div>

          {aiError && (
            <div className="p-2 bg-red-50 text-red-700 text-[11px] rounded-xl flex items-center gap-1.5">
              <AlertCircle className="w-3 h-3" />
              <span>{aiError}</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <span className="text-[10px] text-outline font-sans leading-relaxed">
              * Perfect replies are crafted instantly using server-side Gemini intelligence models. Click copy to share with friends!
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
