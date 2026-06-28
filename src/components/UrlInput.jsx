import React, { useState, useEffect, useRef } from 'react';
import { Link2, Zap, Clipboard, X, Search, Loader2, Link, Upload } from 'lucide-react';
import useStore from '../store/useStore';

const UrlInput = () => {
  const [url, setUrl]           = useState('');
  const [platform, setPlatform] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const [focused, setFocused]   = useState(false);
  
  const addToQueue          = useStore((s) => s.addToQueue);
  const addToast            = useStore((s) => s.addToast);
  const settings            = useStore((s) => s.settings);
  const setFetchedQualities = useStore((s) => s.setFetchedQualities);
  const inputRef            = useRef(null);
  const fileImportRef       = useRef(null); // NEW-07
  const currentUrlRef       = useRef('');

  useEffect(() => {
    currentUrlRef.current = url;
  }, [url]);

  // Clipboard auto-detect from main process
  useEffect(() => {
    if (!window.electronAPI) return;
    
    const unsub = window.electronAPI.onClipboardUrl((clipboardData) => {
      // Avoid if already in queue or if we already have a pending video
      if (useStore.getState().queue.some(item => item.url === clipboardData.url) || useStore.getState().pendingVideo) {
        return;
      }
      
      if (!currentUrlRef.current) {
        setUrl(clipboardData.url);
      }
    });
    return unsub;
  }, [addToast]);

  const handleChange = (e) => {
    const val = e.target.value;
    setUrl(val);
    detectPlatform(val);
  };

  const detectPlatform = (val) => {
    if (!val) { setPlatform(null); return; }
    if (val.includes('youtube.com') || val.includes('youtu.be')) setPlatform('YouTube');
    else if (val.includes('instagram.com')) setPlatform('Instagram');
    else if (val.includes('tiktok.com')) setPlatform('TikTok');
    else if (val.includes('twitter.com') || val.includes('x.com')) setPlatform('Twitter/X');
    else if (val.includes('facebook.com') || val.includes('fb.watch')) setPlatform('Facebook');
    else if (val.includes('vimeo.com')) setPlatform('Vimeo');
    else if (val.includes('dailymotion.com')) setPlatform('Dailymotion');
    else if (val.includes('soundcloud.com')) setPlatform('SoundCloud');
    else if (val.includes('twitch.tv')) setPlatform('Twitch');
    else if (val.includes('reddit.com')) setPlatform('Reddit');
    else if (val.startsWith('http')) setPlatform('Web');
    else setPlatform(null);
  };

  const handlePaste = async () => {
    try {
      const text = window.electronAPI ? await window.electronAPI.readClipboard() : await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        detectPlatform(text.trim());
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Clipboard Error', message: 'Could not read from clipboard.' });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleFetch();
  };

  const handleClear = () => { 
    setUrl(''); 
    setPlatform(null); 
    setFetchedQualities(null); 
  };

  const [isBatchMode, setIsBatchMode] = useState(false); // NEW-07: declared before handleFileImport

  // NEW-07: Import URLs from .txt / .csv file
  const handleFileImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result || '';
      // Extract lines that look like URLs
      const found = text
        .split(/\r?\n/)
        .map(l => l.trim().replace(/^["',;\s]+|["',;\s]+$/g, ''))
        .filter(l => /^https?:\/\//i.test(l));
      if (found.length === 0) {
        addToast({ type: 'error', title: 'No URLs Found', message: 'File has no valid http/https URLs.' });
        return;
      }
      setUrl(prev => (prev ? prev + '\n' : '') + found.join('\n'));
      setIsBatchMode(true);
      addToast({ type: 'success', title: `${found.length} URLs Imported`, message: file.name });
    };
    reader.readAsText(file);
    e.target.value = ''; // reset so same file can be re-imported
  };

  const handleFetch = async () => {
    if (!url.trim() || isFetching) return;
    if (!window.electronAPI) {
      addToast({ type: 'error', title: 'Not in Electron', message: 'Run via npm start to use this feature.' });
      return;
    }

    setIsFetching(true);
    
    // Split URLs by newline for batch mode, or just use single URL
    const urlsToFetch = isBatchMode 
      ? url.split('\n').map(u => u.trim()).filter(Boolean)
      : [url.trim()];

    if (urlsToFetch.length === 0) {
      setIsFetching(false);
      return;
    }

    let successCount = 0;

    for (const singleUrl of urlsToFetch) {
      try {
        const info = await window.electronAPI.fetchInfo({
          url: singleUrl,
          proxy: settings.proxy || null,
          cookieBrowser: settings.cookieBrowser || null,
        });

        if (info.status === 'error') {
          addToast({ type: 'error', title: 'Could Not Fetch', message: `${info.message}` });
          continue;
        }

        // Prefer platform from API response, fallback to local detection
        const detectedPlatform = info.platform || platform || 'Unknown';

        // Save available qualities for the QualitySelector dropdown
        if (info.qualities && info.qualities.length > 0 && successCount === 0) {
          setFetchedQualities(info.qualities);
          // BUG-11 fix: Do NOT silently change user's defaultQuality.
          // The QualitySelector will show available options and user can pick.
          // If user's preferred quality is unavailable, it will naturally fall back to best.
        }

        if (info.type === 'playlist') {
          useStore.getState().setPendingPlaylist({
            title: info.title,
            entries: info.entries,
            platform: detectedPlatform,
            qualities: info.qualities || []
          });
        } else {
          if (isBatchMode) {
             // Create a fake playlist entry array 
             const currentBatch = useStore.getState().batchEntries || [];
             useStore.getState().setBatchEntries([...currentBatch, {
                 title: info.title,
                 url: info.url || singleUrl,
                 thumbnail: info.thumbnail,
                 platform: detectedPlatform,
                 duration: info.duration
             }]);
          } else {
            useStore.getState().setPendingVideo({
              title: info.title,
              url: info.url || singleUrl,
              thumbnail: info.thumbnail,
              platform: detectedPlatform,
              duration: info.duration
            });
          }
        }
        successCount++;
      } catch (err) {
        addToast({ type: 'error', title: 'Error', message: String(err) });
      }
    }

    const finalBatch = useStore.getState().batchEntries;
    if (isBatchMode && finalBatch && finalBatch.length > 0) {
      useStore.getState().setPendingPlaylist({
          title: `Batch Links (${finalBatch.length} items)`,
          entries: finalBatch,
          platform: 'Mixed',
          qualities: useStore.getState().fetchedQualities || []
      });
      addToast({ type: 'success', title: 'Batch Processed', message: `Review ${successCount} items.` });
    } else if (isBatchMode && successCount === 0) {
      addToast({ type: 'error', title: 'Batch Failed', message: 'No URLs could be fetched.' });
    }
    // REMAINING-02/NEW-BUG-04 fix: always clear batchEntries after batch loop
    if (isBatchMode) useStore.getState().setBatchEntries([]);

    setUrl('');
    setPlatform(null);
    setIsFetching(false);
  };

  const platformStyle = platform === 'YouTube' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                       platform === 'Instagram' ? 'bg-pink-500/10 text-pink-500 border-pink-500/20' :
                       platform === 'TikTok' ? 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20' :
                       'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex items-center justify-between mb-2">
         <span className="text-xs font-bold text-zinc-400 tracking-wider uppercase">Paste a Link</span>
         <div className="flex items-center gap-2">
           {/* NEW-07: File import */}
           <input
             ref={fileImportRef}
             type="file"
             accept=".txt,.csv,.text"
             className="hidden"
             onChange={handleFileImport}
           />
           {isBatchMode && (
             <button
               onClick={() => fileImportRef.current?.click()}
               title="Import URLs from .txt or .csv file"
               className="flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-bold transition-all"
               style={{ color: '#22c55e', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
               onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(34,197,94,0.15)'; }}
               onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(34,197,94,0.08)'; }}
             >
               <Upload size={9} /> Import File
             </button>
           )}
           <div 
             className="relative flex items-center rounded-lg p-1" 
             style={{ 
               width: '160px', 
               background: 'rgba(0,0,0,0.25)', 
               border: '1px solid rgba(255,255,255,0.05)',
               boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.2)'
             }}
           >
              {/* Sliding Active Indicator */}
              <div
                className="absolute top-1 bottom-1 rounded-md transition-all duration-[400ms] ease-[cubic-bezier(0.34,1.36,0.64,1)]"
                style={{
                  left: isBatchMode ? 'calc(50% + 2px)' : '4px',
                  width: 'calc(50% - 6px)',
                  background: isBatchMode 
                    ? 'linear-gradient(135deg, rgba(168,85,247,0.4) 0%, rgba(168,85,247,0.1) 100%)' 
                    : 'linear-gradient(135deg, rgba(6,182,212,0.4) 0%, rgba(6,182,212,0.1) 100%)',
                  border: `1px solid ${isBatchMode ? 'rgba(168,85,247,0.5)' : 'rgba(6,182,212,0.5)'}`,
                  borderTopColor: isBatchMode ? 'rgba(216,180,254,0.6)' : 'rgba(103,232,249,0.6)',
                  boxShadow: isBatchMode 
                    ? '0 0 20px rgba(168,85,247,0.5), inset 0 1px 0 rgba(255,255,255,0.1)' 
                    : '0 0 20px rgba(6,182,212,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(4px)'
                }}
              />
              <button
                 onClick={() => setIsBatchMode(false)}
                 aria-label="Single URL Mode"
                 className="relative z-10 flex-1 py-1 text-[10px] font-bold uppercase transition-all duration-300 active:scale-95"
                 style={{ 
                   color: !isBatchMode ? '#22d3ee' : '#71717a',
                   textShadow: !isBatchMode ? '0 0 12px rgba(34,211,238,0.8)' : 'none'
                 }}
              >
                 One Video
              </button>
              <button
                 onClick={() => setIsBatchMode(true)}
                 aria-label="Batch URLs Mode"
                 className="relative z-10 flex-1 py-1 text-[10px] font-bold uppercase transition-all duration-300 active:scale-95"
                 style={{ 
                   color: isBatchMode ? '#d8b4fe' : '#71717a',
                   textShadow: isBatchMode ? '0 0 12px rgba(216,180,254,0.8)' : 'none'
                 }}
              >
                 Multiple
              </button>
           </div>
         </div>
      </div>

      {/* Input wrapper */}
      <div
        className="relative group overflow-hidden rounded-2xl"
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.outline = '2px solid rgba(6,182,212,0.5)'; e.currentTarget.style.borderRadius = '12px'; }}
        onDragLeave={(e) => { e.currentTarget.style.outline = 'none'; }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.style.outline = 'none';
          // Try getting URL from drag data
          const text = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text/uri-list') || '';
          if (text.trim()) {
            const val = text.trim().split('\n')[0].trim(); // first URL if multiple
            setUrl(val);
            detectPlatform(val);
          }
        }}
      >
        {/* Icon */}
        <div
          className="absolute left-4 top-4 pointer-events-none transition-colors duration-300"
          style={{ color: focused || url ? '#06b6d4' : '#3f3f46' }}
        >
          <Link2 size={17} />
        </div>

        {/* Input */}
        <div key={isBatchMode ? 'batch' : 'single'} className="input-switch-anim w-full">
          {isBatchMode ? (
             <textarea
               ref={inputRef}
               value={url}
               onChange={handleChange}
               onFocus={() => setFocused(true)}
               onBlur={() => setFocused(false)}
               placeholder="Paste multiple URLs here, one per line..."
               aria-label="Batch URLs input"
               className="neon-input pl-11 pr-4 py-3 custom-scrollbar"
               style={{ height: '120px', resize: 'none' }}
             />
          ) : (
             <input
               ref={inputRef}
               type="text"
               value={url}
               onChange={handleChange}
               onKeyDown={handleKeyDown}
               onFocus={() => setFocused(true)}
               onBlur={() => setFocused(false)}
               placeholder="Paste YouTube, Instagram, TikTok, or any video URL..."
               aria-label="Video URL input"
               className="neon-input pl-11 pr-[210px] text-ellipsis"
               style={{ height: '52px' }}
             />
          )}
        </div>

        {/* Right controls (only show full controls in Single mode) */}
        {!isBatchMode && (
           <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
             {platform && (
               <span className={`platform-badge ${platformStyle}`}>
                 {platform}
               </span>
             )}
             {url && (
               <button
                 onClick={handleClear}
                 aria-label="Clear URL Input"
                 className="w-6 h-6 flex items-center justify-center rounded-md text-zinc-600 hover:text-zinc-300 transition-colors"
               >
                 <X size={12} />
               </button>
             )}
             <button
               onClick={handlePaste}
               aria-label="Paste from clipboard"
               className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
               style={{
                 color: '#06b6d4',
                 background: 'rgba(6,182,212,0.08)',
                 border: '1px solid rgba(6,182,212,0.2)',
               }}
               onMouseEnter={(e) => {
                 e.currentTarget.style.background = 'rgba(6,182,212,0.15)';
                 e.currentTarget.style.boxShadow = '0 0 10px rgba(6,182,212,0.2)';
               }}
               onMouseLeave={(e) => {
                 e.currentTarget.style.background = 'rgba(6,182,212,0.08)';
                 e.currentTarget.style.boxShadow = '';
               }}
             >
               <Clipboard size={10} />
               Paste
             </button>
           </div>
        )}

        {/* Scan line animation */}
        {isFetching && <div className="scan-line" />}
      </div>

      {/* Analyze Button */}
      <button
        onClick={handleFetch}
        disabled={isFetching || !url.trim()}
        aria-label="Analyze and Add to Queue"
        className="btn-primary w-full py-3.5 text-sm uppercase tracking-widest font-black transition-all"
        style={{
           opacity: (isFetching || !url.trim()) ? 0.6 : 1,
           cursor: (isFetching || !url.trim()) ? 'not-allowed' : 'pointer'
        }}
      >
        {isFetching ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            Getting info...
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <Zap size={16} />
            Download
          </div>
        )}
      </button>
    </div>
  );
};

export default UrlInput;
