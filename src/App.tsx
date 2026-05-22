import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Search,
  Dices,
  HelpCircle,
  History,
  User,
  ArrowLeft,
  Flame,
  Heart,
  Users,
  Compass,
  Volume2,
  VolumeX,
  Bot
} from 'lucide-react';

import { GameType, DecisionHistoryEntry } from './types';
import { AdSenseBanner } from './components/AdSenseBanner';
import { SpinWheelGame } from './components/SpinWheelGame';
import { CoinFlipGame } from './components/CoinFlipGame';
import { FlowerPeelGame } from './components/FlowerPeelGame';
import { VibeCheckGame } from './components/VibeCheckGame';
import { LunchPollGame } from './components/LunchPollGame';
import { TextTellGame } from './components/TextTellGame';
import { HistoryPanel } from './components/HistoryPanel';
import { ProfileLayout } from './components/ProfileLayout';
import { supabase } from './lib/supabase';
import { DisqusForum } from './components/DisqusForum';
import { BouncingMagicalStar } from './components/BouncingMagicalStar';

export default function App() {
  const [activeScreen, setActiveScreen] = useState<GameType>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [history, setHistory] = useState<DecisionHistoryEntry[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  // Load initial history from Supabase on mount and bind to live channel events
  useEffect(() => {
    const fetchInitialHistory = async () => {
      try {
        const { data, error } = await supabase
          .from('entries')
          .select('*');
        if (error) {
          console.error("Error fetching Supabase entries:", error);
          return;
        }
        if (data) {
          const sorted = [...data].sort((a, b) => {
            if (a.created_at && b.created_at) {
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }
            return String(b.id || '').localeCompare(String(a.id || ''));
          });
          setHistory(sorted);
        }
      } catch (err) {
        console.error("Failed to load initial history from Supabase:", err);
      }
    };

    fetchInitialHistory();

    const channel = supabase
      .channel('entries-realtime-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'entries' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newEntry = payload.new as DecisionHistoryEntry;
            setHistory((prev) => {
              if (prev.some((item) => item.id === newEntry.id)) {
                return prev;
              }
              return [newEntry, ...prev];
            });
          } else if (payload.eventType === 'DELETE') {
            const oldId = payload.old?.id;
            if (oldId) {
              setHistory((prev) => prev.filter((item) => item.id !== oldId));
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedEntry = payload.new as DecisionHistoryEntry;
            setHistory((prev) =>
              prev.map((item) => (item.id === updatedEntry.id ? updatedEntry : item))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSaveDecision = async (entry: Omit<DecisionHistoryEntry, 'id' | 'timestamp'>) => {
    const formattedEntry: DecisionHistoryEntry = {
      ...entry,
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Optimistic UI update: Prepend locally first for standard snappy response
    setHistory((prev) => {
      if (prev.some((item) => item.id === formattedEntry.id)) return prev;
      return [formattedEntry, ...prev];
    });

    try {
      const { error } = await supabase
        .from('entries')
        .insert([formattedEntry]);
      if (error) {
        console.error("Error saving decision to Supabase:", error);
      }
    } catch (err) {
      console.error("Supabase write exception:", err);
    }
  };

  const handleClearHistory = async () => {
    setHistory([]);
    try {
      const { error } = await supabase
        .from('entries')
        .delete()
        .neq('id', '_none_');
      if (error) {
        console.error("Error deleting entries in Supabase:", error);
      }
    } catch (err) {
      console.error("Supabase clear exception:", err);
    }
  };

  const handleClearAllUserData = async () => {
    setHistory([]);
    setActiveScreen('dashboard');
    try {
      const { error } = await supabase
        .from('entries')
        .delete()
        .neq('id', '_none_');
      if (error) {
        console.error("Error clearing table data in Supabase:", error);
      }
    } catch (err) {
      console.error("Supabase clear all user exception:", err);
    }
  };


  // Call server-side helper for Gemini completions
  const handleRequestAiSuggestions = async (promptType: string, count: number): Promise<string[]> => {
    setAiLoading(true);
    try {
      const res = await fetch('/api/gemini/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptType, count })
      });
      const data = await res.json();
      if (data && data.options) {
        return data.options;
      }
      throw new Error("No suggestion field returned");
    } catch (e) {
      console.warn("API completions offline. Supplying offline standard options.");
      // Standard local backup fallback
      return ['Order Sushi 🍣', 'Have Tacos 🌮', 'Bake Pasta 🍝', 'Cook Burgers 🍔', 'Green Salad 🥗'];
    } finally {
      setAiLoading(false);
    }
  };

  // Call server-side helper for Gemini smart message reply
  const handleRequestTextHelp = async (scenario: string, tone: string): Promise<string[]> => {
    setAiLoading(true);
    try {
      const res = await fetch('/api/gemini/texts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario, tone })
      });
      const data = await res.json();
      if (data && data.texts) {
        return data.texts;
      }
      throw new Error("No replies suggestions field returned");
    } catch (e) {
      console.warn("API completions offline. Supplying templates.");
      return [
        "Hey! Wish I could make it but I'm completely wiped out. Enjoy! 😴",
        "Really wish I could go but I have to catch up on sleep tonight. Let's hang soon!",
        "Low battery alert! Tucking myself in with hot herbal tea. Have massive fun! 🔋"
      ];
    } finally {
      setAiLoading(false);
    }
  };

  // Sidebar or dashboard cards metadata
  const gameCards = [
    {
      id: 'wheel',
      title: 'Wheel',
      desc: 'For dividing custom choices.',
      icon: '🎡',
      tag: 'Wheel'
    },
    {
      id: 'coin',
      title: 'Coin',
      desc: 'For instant Yes / No splits.',
      icon: '🪙',
      tag: 'Coin'
    },
    {
      id: 'flower',
      title: 'Flower',
      desc: 'For validating internal hopes.',
      icon: '🌸',
      tag: 'Flower'
    },
    {
      id: 'text',
      title: 'Excuse',
      desc: 'For drafting witty message replies.',
      icon: '💬',
      tag: 'Excuse'
    },
    {
      id: 'vibe',
      title: 'Vibe',
      desc: 'For matching your energy styling.',
      icon: '🔮',
      tag: 'Vibe'
    },
    {
      id: 'poll',
      title: 'Poll',
      desc: 'For resolving team munchie wars.',
      icon: '🍔',
      tag: 'Poll'
    }
  ];

  // Filtering based on search queries
  const filteredGrid = gameCards.filter(card =>
    card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    card.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-surface text-on-surface font-sans min-h-screen flex flex-col antialiased selection:bg-primary-container selection:text-white pb-24 md:pb-12 text-lg">
      
      {/* Dynamic Header Block with 100% increased size */}
      <header className="fixed top-0 w-full h-20 z-50 backdrop-blur-md bg-surface/80 border-b border-outline-variant/10 flex items-center justify-between px-6 md:px-12 py-3 shadow-md">
        <div className="flex items-center gap-4">
          {activeScreen !== 'dashboard' && (
            <button
              onClick={() => setActiveScreen('dashboard')}
              className="text-primary hover:bg-[#4648d4]/5 p-3 rounded-full transition-colors focus:outline-none"
              title="Back to dashboard"
            >
              <ArrowLeft className="w-8 h-8" />
            </button>
          )}

          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveScreen('dashboard')}>
            <span className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-xl text-white uppercase tracking-wider font-display font-black shadow-md">S</span>
            <span className="font-display font-extrabold text-[#131b2e] tracking-tight text-2xl">Arcade</span>
          </div>
        </div>

        {/* Responsive Desktop nav options with 100% increased size */}
        <nav className="hidden md:flex items-center gap-3">
          <button
            onClick={() => setActiveScreen('dashboard')}
            className={`flex items-center gap-2 font-sans font-extrabold text-base py-2.5 px-5 rounded-2xl transition-all ${
              activeScreen === 'dashboard' 
                ? 'bg-primary-container/10 text-primary' 
                : 'text-outline hover:text-on-surface'
            }`}
          >
            <Compass className="w-6 h-6" />
            <span>Playground</span>
          </button>
          <button
            onClick={() => setActiveScreen('history')}
            className={`flex items-center gap-2 font-sans font-extrabold text-base py-2.5 px-5 rounded-2xl transition-all ${
              activeScreen === 'history' 
                ? 'bg-primary-container/10 text-primary' 
                : 'text-outline hover:text-on-surface'
            }`}
          >
            <History className="w-6 h-6" />
            <span>History</span>
          </button>
          <button
            onClick={() => setActiveScreen('profile')}
            className={`flex items-center gap-2 font-sans font-extrabold text-base py-2.5 px-5 rounded-2xl transition-all ${
              activeScreen === 'profile' 
                ? 'bg-primary-container/10 text-primary' 
                : 'text-outline hover:text-on-surface'
            }`}
          >
            <User className="w-6 h-6" />
            <span>Profile</span>
          </button>
        </nav>
      </header>

      {/* Main Canvas layout container */}
      <main className="flex-grow pt-24 px-6 md:px-12 max-w-4xl mx-auto w-full flex flex-col justify-between">
        
        {/* Render View Controller switcher */}
        <div className="w-full h-full flex flex-col justify-center">
          {activeScreen === 'dashboard' && (
            <>
              <BouncingMagicalStar />
              <div className="space-y-6 pb-6 transition-opacity duration-300">
                
                {/* Cover Banner title with 100% increased font/icon sizes */}
                <div className="text-center py-2">
                  <span className="font-sans font-semibold text-base tracking-wider text-primary uppercase flex items-center justify-center gap-2 mb-2">
                    <Flame className="w-7 h-7 text-[#4648d4] animate-pulse" />
                    <span>Interactive Chance Engine</span>
                  </span>
                  <h1 className="font-display font-black text-5xl md:text-6xl text-[#131b2e] leading-tight tracking-tight mt-1">
                    Spark Arcade
                  </h1>
                  <p className="font-sans text-base md:text-lg text-on-surface-variant max-w-xl mx-auto mt-2 leading-relaxed opacity-90">
                    Beautiful probability dashboards, magical coin models, and biometric scanning algorithms in a high-density, click-focused playground.
                  </p>
                  
                  {/* Search bar alignment option with 100% increased size */}
                  <div className="relative max-w-md mx-auto mt-4 px-2">
                    <Search className="w-6 h-6 absolute left-6 top-1/2 -translate-y-1/2 text-outline" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search arcade..."
                      className="w-full bg-white border border-outline-variant/30 rounded-full py-3.5 pl-14 pr-6 font-sans text-base text-on-surface placeholder:text-outline focus:ring-4 focus:ring-primary/20 focus:bg-white focus:outline-none shadow-md transition-shadow"
                    />
                  </div>
                </div>

                {/* Bento Compartment list groups - Upgraded size by 100% */}
                {searchQuery && filteredGrid.length === 0 ? (
                  <div className="text-center py-10 p-6 bg-white border border-dashed border-outline-variant/30 rounded-3xl">
                    <HelpCircle className="w-10 h-10 text-outline mx-auto mb-2" />
                    <h4 className="font-display font-semibold text-lg text-on-surface">No apps found</h4>
                  </div>
                ) : (
                  <div className="bg-white border border-outline-variant/20 rounded-3xl p-8 shadow-md">
                    <div className="grid grid-cols-3 gap-8 md:gap-12 max-w-2xl mx-auto">
                      {filteredGrid.map((card) => (
                        <div
                          key={card.id}
                          onClick={() => setActiveScreen(card.id as any)}
                          className="flex flex-col items-center justify-center group cursor-pointer text-center"
                          title={card.desc}
                        >
                          {/* Circle Icon Container - Expanded by 100% */}
                          <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-surface-container-low border-2 border-outline-variant/10 group-hover:border-primary/30 group-hover:bg-[#eaedff] flex items-center justify-center text-5xl md:text-6xl group-hover:scale-110 group-hover:rotate-6 shadow-md transition-all duration-300">
                            {card.icon}
                          </div>
                          
                          {/* One-word Title */}
                          <span className="font-display font-black text-lg md:text-xl text-[#131b2e] group-hover:text-primary mt-3 transition-colors">
                            {card.tag}
                          </span>

                          {/* High-density visual indicator of mini-app role */}
                          <span className="text-[11px] md:text-xs text-outline font-sans mt-1 line-clamp-1 max-w-[120px] opacity-75">
                            {card.desc.split(" ").slice(-2).join(" ")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Intertwined elegant AdSense slot to minimize scrolling */}
                <div className="py-2">
                  <AdSenseBanner />
                </div>

              </div>
            </>
          )}

          {activeScreen === 'wheel' && (
            <SpinWheelGame
              onSaveDecision={handleSaveDecision}
              onRequestSuggestions={handleRequestAiSuggestions}
              isAiLoading={aiLoading}
            />
          )}

          {activeScreen === 'coin' && (
            <CoinFlipGame onSaveDecision={handleSaveDecision} />
          )}

          {activeScreen === 'flower' && (
            <FlowerPeelGame onSaveDecision={handleSaveDecision} />
          )}

          {activeScreen === 'vibe' && (
            <VibeCheckGame onSaveDecision={handleSaveDecision} />
          )}

          {activeScreen === 'poll' && (
            <LunchPollGame onSaveDecision={handleSaveDecision} />
          )}

          {activeScreen === 'text' && (
            <TextTellGame
              onSaveDecision={handleSaveDecision}
              onRequestTextHelp={handleRequestTextHelp}
              isAiLoading={aiLoading}
            />
          )}

          {activeScreen === 'history' && (
            <HistoryPanel
              history={history}
              onClearHistory={handleClearHistory}
              onSelectGame={(g) => setActiveScreen(g)}
            />
          )}

          {activeScreen === 'profile' && (
            <ProfileLayout
              history={history}
              onClearAllUserData={handleClearAllUserData}
            />
          )}
        </div>

        {/* Dynamic Ad Placement Block at footer bottom */}
        {activeScreen !== 'dashboard' && (
          <div className="mt-12 w-full pt-12 border-t border-outline-variant/10">
            <AdSenseBanner />
          </div>
        )}
      </main>

      {/* Disqus Forum below all content sections, spanning full width */}
      {activeScreen === 'dashboard' && (
        <DisqusForum
          shortname="lifedecisions"
          config={{
            url: typeof window !== 'undefined' ? window.location.href : 'https://lifedecisions.example.com',
            identifier: 'lifedecisions-home-arcade',
            title: 'Life Decisions Arcade',
            language: 'en'
          }}
        />
      )}

      {/* Persistent Bottom Nav Menu from JSON (Mobile viewports only) - 100% taller with doubled touch targets and fonts */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center py-4 px-6 bg-white/90 border-t border-outline-variant/20 z-50 backdrop-blur-md shadow-[0px_-8px_30px_rgba(15,23,42,0.06)]">
        <button
          onClick={() => setActiveScreen('dashboard')}
          className={`flex flex-col items-center justify-center px-6 py-2.5 rounded-2xl transition-all duration-200 active:scale-95 ${
            activeScreen === 'dashboard' || (activeScreen !== 'history' && activeScreen !== 'profile')
              ? 'bg-primary/10 text-primary'
              : 'text-outline hover:text-on-surface'
          }`}
        >
          <Compass className="w-10 h-10 animate-pulse" />
          <span className="font-sans font-extrabold text-sm mt-1.5">Home</span>
        </button>

        <button
          onClick={() => setActiveScreen('history')}
          className={`flex flex-col items-center justify-center px-6 py-2.5 rounded-2xl transition-all duration-200 active:scale-95 ${
            activeScreen === 'history'
              ? 'bg-primary/10 text-primary'
              : 'text-outline hover:text-on-surface'
          }`}
        >
          <History className="w-10 h-10" />
          <span className="font-sans font-extrabold text-sm mt-1.5">History</span>
        </button>

        <button
          onClick={() => setActiveScreen('profile')}
          className={`flex flex-col items-center justify-center px-6 py-2.5 rounded-2xl transition-all duration-200 active:scale-95 ${
            activeScreen === 'profile'
              ? 'bg-primary/10 text-primary'
              : 'text-outline hover:text-on-surface'
          }`}
        >
          <User className="w-10 h-10" />
          <span className="font-sans font-extrabold text-sm mt-1.5">Profile</span>
        </button>
      </nav>
    </div>
  );
}
