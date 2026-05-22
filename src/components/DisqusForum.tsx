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
  const [loadDisqus, setLoadDisqus] = useState(false);
  const [loadingScript, setLoadingScript] = useState(false);

  useEffect(() => {
    if (!loadDisqus) return;
    setLoadingScript(true);

    const loadDisqusScript = () => {
      // Set the global window disqus_config object
      (window as any).disqus_config = function (this: any) {
        this.page.url = config.url;
        this.page.identifier = config.identifier;
        this.page.title = config.title;
        this.language = config.language;
      };

      // Check if global DISQUS object is already loaded
      if ((window as any).DISQUS) {
        try {
          (window as any).DISQUS.reset({
            reload: true,
            config: function (this: any) {
              this.page.url = config.url;
              this.page.identifier = config.identifier;
              this.page.title = config.title;
              this.language = config.language;
            }
          });
          setLoadingScript(false);
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
  }, [loadDisqus, shortname, config]);

  return (
    <div id="disqus-forum-section" className="w-full bg-[#fcfcfd]/80 border-t border-outline-variant/10 px-6 md:px-12 py-12 pb-28 md:pb-16 text-on-surface">
      <div className="max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-2 mb-6">
          <span className="w-1.5 h-6 rounded-full bg-[#4648d4]" />
          <h2 className="font-display font-black text-lg text-[#131b2e] tracking-tight">
            Community Discussion
          </h2>
        </div>

        <div className="min-h-[250px] flex flex-col items-center justify-center border border-dashed border-[#4648d4]/15 rounded-2xl p-8 bg-white text-center shadow-xs">
          {loadDisqus ? (
            <div className="w-full relative">
              {loadingScript && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-10 py-12">
                  <div className="w-6 h-6 border-2 border-t-[#4648d4] border-gray-200 rounded-full animate-spin mb-2" />
                  <span className="text-[10px] text-outline font-semibold uppercase tracking-wider">Connecting Forum...</span>
                </div>
              )}
              {/* Actual target element Disqus injects into */}
              <div id="disqus_thread" className="w-full"></div>
            </div>
          ) : (
            <div className="max-w-md my-4">
              <div className="w-12 h-12 bg-[#4648d4]/10 rounded-full flex items-center justify-center mx-auto mb-4 text-[#4648d4] text-xl">
                💬
              </div>
              <h3 className="font-sans font-bold text-sm text-[#131b2e] mb-1">Engage with other Decision Makers</h3>
              <p className="font-sans text-xs text-outline mb-4">
                Load the community forum to share your results, discuss strategies, and connect with other users.
              </p>
              <button
                onClick={() => setLoadDisqus(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-primary to-[#4648d4] text-white font-sans font-bold text-[10px] uppercase tracking-wider rounded-lg shadow-sm hover:opacity-90 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <span>Load Disqus Forum</span>
                <span className="text-xs">⚡</span>
              </button>
              <p className="text-[10px] text-outline/50 mt-4 text-center leading-relaxed">
                Note: This loads external scripts from Disqus. Comms may be limited in sandboxed development frame.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
