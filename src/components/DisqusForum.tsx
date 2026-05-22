import React, { useState, useEffect } from 'react';

interface DisqusForumProps {
  shortname: string;
  config: {
    url: string;
    identifier: string;
    title: string;
    language: string;
  };
}

export function DisqusForum({ shortname, config }: DisqusForumProps) {
  const [language, setLanguage] = useState<'en' | 'zh_TW'>('en');
  const [loadingScript, setLoadingScript] = useState(true);

  useEffect(() => {
    const loadDisqusScript = () => {
      // Set the global window disqus_config object
      (window as any).disqus_config = function (this: any) {
        this.page.url = config.url;
        this.page.identifier = config.identifier;
        this.page.title = config.title;
        this.language = language;
      };

      // Check if global DISQUS object is already loaded
      if ((window as any).DISQUS) {
        try {
          setLoadingScript(true);
          (window as any).DISQUS.reset({
            reload: true,
            config: function (this: any) {
              this.page.url = config.url;
              this.page.identifier = config.identifier;
              this.page.title = config.title;
              this.language = language;
            }
          });
          // Small timeout to simulate loading completion smoothly
          const loadTimer = setTimeout(() => {
            setLoadingScript(false);
          }, 600);
          return () => clearTimeout(loadTimer);
        } catch (e) {
          console.error("Error resetting Disqus forum", e);
          setLoadingScript(false);
        }
        return;
      }

      // If not, append the script dynamically
      const scriptId = 'disqus-embed-script';
      let script = document.getElementById(scriptId) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://${shortname}.disqus.com/embed.js`;
        script.setAttribute('data-timestamp', String(+new Date()));
        script.async = true;
        
        script.onload = () => {
          setLoadingScript(false);
        };
        script.onerror = () => {
          console.error("Disqus script failed to load. Likely blocked or offline.");
          setLoadingScript(false);
        };

        document.body.appendChild(script);
      } else {
        setLoadingScript(false);
      }
    };

    // Load after brief animation delay to prevent main thread blocking
    const timer = setTimeout(loadDisqusScript, 100);
    return () => clearTimeout(timer);
  }, [shortname, config, language]);

  return (
    <div id="disqus-forum-section" className="w-full bg-[#fcfcfd]/80 border-t border-outline-variant/10 px-6 md:px-12 py-12 pb-28 md:pb-16 text-on-surface w-full">
      <div className="max-w-2xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-6 rounded-full bg-[#4648d4]" />
            <h2 className="font-display font-black text-lg text-[#131b2e] tracking-tight">
              Community Discussion
            </h2>
          </div>
          
          <div className="flex items-center gap-1.5 bg-surface-container-low p-1.5 rounded-xl border border-outline-variant/20 shadow-2xs">
            <button
              onClick={() => setLanguage('en')}
              className={`px-3 py-1.5 rounded-lg font-sans text-xs font-bold transition-all duration-200 cursor-pointer ${
                language === 'en'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-outline hover:text-on-surface hover:bg-surface-container/50'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLanguage('zh_TW')}
              className={`px-3 py-1.5 rounded-lg font-sans text-xs font-bold transition-all duration-200 cursor-pointer ${
                language === 'zh_TW'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-outline hover:text-on-surface hover:bg-surface-container/50'
              }`}
            >
              繁體中文 (Chinese)
            </button>
          </div>
        </div>

        <div className="min-h-[250px] w-full relative bg-white border border-outline-variant/20 rounded-2xl p-6 shadow-xs">
          {loadingScript && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/95 z-10 rounded-2xl py-12">
              <div className="w-6 h-6 border-2 border-t-[#4648d4] border-gray-200 rounded-full animate-spin mb-2" />
              <span className="text-[10px] text-outline font-semibold uppercase tracking-wider">Connecting Forum...</span>
            </div>
          )}
          {/* Actual target element Disqus injects into */}
          <div id="disqus_thread" className="w-full"></div>
        </div>
      </div>
    </div>
  );
}
