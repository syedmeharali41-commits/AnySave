import React, { useEffect, useState } from 'react';
import TitleBar from './components/TitleBar';
import UrlInput from './components/UrlInput';
import QualitySelector from './components/QualitySelector';
import DownloadQueue from './components/DownloadQueue';
import HistoryPanel from './components/HistoryPanel';
import SettingsPanel from './components/SettingsPanel';
import ToastContainer from './components/Toast';
import PlaylistModal from './components/PlaylistModal';
import StatsPanel from './components/StatsPanel';

import useStore from './store/useStore';
import { Settings, HardDrive, History, Layers, ChevronRight, BarChart3 } from 'lucide-react';

function App() {
  const settings        = useStore((s) => s.settings);
  const setSettings     = useStore((s) => s.setSettings);
  const updateQueueItem = useStore((s) => s.updateQueueItem);
  const addToast        = useStore((s) => s.addToast);
  const activePanel     = useStore((s) => s.activePanel);
  const setActivePanel  = useStore((s) => s.setActivePanel);
  const triggerDownload = useStore((s) => s.triggerDownload);
  const [showSettings, setShowSettings] = useState(false);
  const [ytdlpStatus, setYtdlpStatus]   = useState(null);
  const [interruptedCount, setInterruptedCount] = useState(0);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('theme-light', 'theme-hc');
    if (settings.theme === 'light') html.classList.add('theme-light');
    else if (settings.theme === 'hc')    html.classList.add('theme-hc');
    // 'dark' is the default — no class needed
  }, [settings.theme]);

  // FEATURE-04: On startup, reset any stuck 'downloading'/'converting' items to 'queued'
  // and highlight them as "interrupted" so user knows they need to restart
  useEffect(() => {
    const state = useStore.getState();
    const stuck = state.queue.filter(i =>
      i.status === 'downloading' || i.status === 'converting' || i.status === 'queued_for_batch'
    );
    if (stuck.length > 0) {
      stuck.forEach(item => state.updateQueueItem(item.id, { status: 'queued', interrupted: true }));
      setInterruptedCount(stuck.length);
    }
  }, []);

  // ── Boot & Listeners ──────────────────────────────────
  useEffect(() => {
    if (!window.electronAPI) return;
    
    const unsubs = [];

    // Load saved settings
    (async () => {
      try {
        const saved = await window.electronAPI.getSettings();
        if (saved) setSettings(saved);
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    })();

    // BUG-10: listen for yt-dlp update status
    if (window.electronAPI.onYtdlpStatus) {
      unsubs.push(window.electronAPI.onYtdlpStatus((data) => {
        setYtdlpStatus(data.status); // 'updating' | 'done' | 'error'
        if (data.status === 'done') setTimeout(() => setYtdlpStatus(null), 3000);
        if (data.status === 'error') setTimeout(() => setYtdlpStatus(null), 6000);
      }));
    }

    // Register all IPC listeners with cleanups
    if (window.electronAPI.onToast) {
        unsubs.push(window.electronAPI.onToast((data) => {
            addToast(data);
        }));
    }

    unsubs.push(window.electronAPI.onDownloadProgress((data) => {
      if (data.status === 'warning') {
        addToast({ type: 'warning', title: 'Warning', message: data.message });
        return;
      }
      if (data.status === 'error') {
        updateQueueItem(data.id, { status: 'error', message: data.message });
        return;
      }
      if (data.status === 'converting') {
        updateQueueItem(data.id, { status: 'converting' });
        return;
      }
      const state = useStore.getState();
      const currentItem = state.queue.find((i) => i.id === data.id);

      if (currentItem?.status === 'paused' || currentItem?.status === 'cancelled') {
        return;
      }

      let prevPartsSize = currentItem?.prevPartsSize || 0;
      let isSecondPart  = currentItem?.isSecondPart  || false;
      
      const newPercentRaw = data.percent ?? -1;   // -1 = indeterminate
      const currentTotal  = data.total_bytes || 0;
      const currentDown   = data.downloaded_bytes || 0;

      // ── Multi-stream detection ──────────────────────────────
      // yt-dlp downloads video stream then audio stream separately.
      // When the audio stream starts, yt-dlp resets its byte counters.
      // We detect this transition via 3 signals (any one is enough):
      //
      // Signal 1: Downloaded bytes jumped BACK (dl dropped significantly vs stored value)
      //   e.g. video was at 450MB downloaded, audio starts at 0 or 2MB → reset detected.
      const prevStored = currentItem?.downloaded_bytes || 0;
      // Remove currentDown > 0 check because yt-dlp emits exactly 0 bytes when audio stream starts!
      // Require at least a 1MB drop to prevent false positives from tiny fluctuations
      const dlReset    = prevStored > 1048576 && prevStored > (currentDown * 3) + 1048576;

      // Signal 2: Total bytes shrank (audio total << video total)
      const totalShrink = currentTotal > 0 && currentItem?.total_bytes > 0
        && currentTotal < currentItem.total_bytes * 0.7;

      // Signal 3: Percent dropped from high (known total) to near 0
      const pctDrop = (currentItem?.percent ?? -1) > 85 && newPercentRaw >= 0 && newPercentRaw < 10;

      if (currentItem?.status === 'downloading' && !isSecondPart) {
        if (dlReset || totalShrink || pctDrop) {
          // Best estimate of video part size: take whichever is larger (actual bytes or reported total)
          prevPartsSize = Math.max(prevStored, currentItem?.total_bytes || 0);
          isSecondPart  = true;
        }
      }

      // ── Unified progress calculation ─────────────────────────
      let realCurrentDown = currentDown;
      // If yt-dlp reports exact percent + total, use computed bytes for accuracy
      if (newPercentRaw > 0 && currentTotal > 0) {
        const estimatedDown = (newPercentRaw / 100) * currentTotal;
        if (estimatedDown > currentDown) realCurrentDown = estimatedDown;
      }

      let unifiedPercent = newPercentRaw;
      let finalDown  = realCurrentDown;
      let finalTotal = currentTotal;

      if (isSecondPart && currentTotal > 0) {
        finalTotal     = prevPartsSize + currentTotal;
        finalDown      = prevPartsSize + realCurrentDown;
        unifiedPercent = (finalDown / finalTotal) * 100;
      }
      
      const streamType = isSecondPart ? 'Audio' : 'Video';
      
      updateQueueItem(data.id, {
        percent:          unifiedPercent,
        speed:            data.speed   ?? '—',
        eta:              data.eta     ?? '—',
        downloaded_bytes: finalDown,
        total_bytes:      finalTotal,
        prevPartsSize:    prevPartsSize,
        isSecondPart:     isSecondPart,
        streamType:       streamType,
        filename:         data.filename ?? '',
        status:           'downloading',
      });
    }));

    unsubs.push(window.electronAPI.onDownloadFinished(async (data) => {
      updateQueueItem(data.id, { status: 'finished', percent: 100, filename: data.filename });
      const state = useStore.getState();
      const item  = state.queue.find((i) => i.id === data.id);
      if (item) {
        await window.electronAPI.addHistory({
          title:       item.title,
          platform:    item.platform,
          thumbnail:   item.thumbnail,
          quality:     item.quality || state.settings.defaultQuality,
          total_bytes: item.total_bytes,
          url:         item.url,
          filename:    item.filename,
        });
      }
    }));

    unsubs.push(window.electronAPI.onDownloadError((data) => {
      updateQueueItem(data.id, { status: 'error', message: data.message });
      addToast({ type: 'error', title: 'Download Failed', message: data.message?.slice(0, 80) });
    }));

    unsubs.push(window.electronAPI.onDownloadRetry((data) => {
      updateQueueItem(data.id, { retryCount: data.attempt, status: 'queued', message: `Retrying... (${data.attempt}/${data.total})` });
    }));

    if (window.electronAPI.onDownloadPaused) {
      unsubs.push(window.electronAPI.onDownloadPaused((data) => {
        updateQueueItem(data.id, { status: 'paused' });
      }));
    }

    // BUG-02 fix: listen for cancelled event and remove from queue
    if (window.electronAPI.onDownloadCancelled) {
      unsubs.push(window.electronAPI.onDownloadCancelled((data) => {
        useStore.getState().updateQueueItem(data.id, { status: 'cancelled' });
      }));
    }


    unsubs.push(window.electronAPI.onTrayPauseAll(() => {
      const state = useStore.getState();
      state.queue
        .filter(i => i.status === 'downloading' || i.status === 'queued')
        .forEach(item => {
          if (item.status === 'downloading' && window.electronAPI) {
            window.electronAPI.pauseDownload({ id: item.id });
          }
          state.updateQueueItem(item.id, { status: 'paused' });
        });
    }));

    unsubs.push(window.electronAPI.onTrayResumeAll(() => {
      const state = useStore.getState();
      state.queue
        .filter(i => i.status === 'paused')
        .forEach(item => {
          const hadStarted = (item.downloaded_bytes || 0) > 0;
          if (hadStarted && window.electronAPI?.resumeDownload) {
            window.electronAPI.resumeDownload({ id: item.id, options: item });
            state.updateQueueItem(item.id, { status: 'downloading' });
          } else {
            state.updateQueueItem(item.id, { status: 'queued' });
          }
        });
    }));


    // Cleanup all listeners on unmount
    return () => unsubs.forEach(fn => typeof fn === 'function' && fn());
  }, []);

  // Scheduled downloads — check every 30s
  useEffect(() => {
    const tick = () => {
      const state = useStore.getState();
      const now = Date.now();
      
      const dueItems = state.queue.filter(
        i => i.status === 'scheduled' && i.scheduledAt && new Date(i.scheduledAt).getTime() <= now
      );
      
      if (dueItems.length > 0) {
        dueItems.forEach(item => {
          state.updateQueueItem(item.id, { status: 'queued' });
          state.addToast({ type: 'info', title: 'Scheduled Download', message: `"${item.title || item.url}" is starting now.` });
        });
      }
    };
    
    tick(); // run immediately on mount
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  const handleBrowse = async () => {
    if (!window.electronAPI) return;
    const p = await window.electronAPI.openDirectory();
    if (p) {
      const next = { ...settings, outputPath: p };
      setSettings(next);
      await window.electronAPI.saveSettings(next);
      addToast({ type: 'success', title: 'Folder Updated', message: p });
    }
  };

  // FEATURE-09: Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = async (e) => {
      // Ignore when typing in an input/textarea
      const tag = document.activeElement?.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if (e.key === 'Escape' && showSettings) {
        setShowSettings(false);
        return;
      }

      if (isInput) return; // Don't intercept shortcuts while typing

      // Ctrl+V — paste clipboard URL into input field (single or batch mode)
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        // Try single-URL input first, then batch textarea (NEW-BUG-05 fix)
        const input = document.querySelector('input[aria-label="Video URL input"]')
                   || document.querySelector('textarea[aria-label="Batch URLs input"]');
        if (input) input.focus();
        return;
      }

      // Ctrl+Enter — start all queued downloads
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const { queue, triggerDownload, settings: s } = useStore.getState();
        const queued = queue.filter(i => i.status === 'queued');
        queued.forEach(item => triggerDownload(item, s));
        if (queued.length > 0)
          addToast({ type: 'info', title: `▶ Starting ${queued.length} download(s)`, message: 'Ctrl+Enter shortcut' });
        return;
      }

      // Alt+H — History tab
      if (e.altKey && e.key === 'h') {
        e.preventDefault();
        setActivePanel('history');
        return;
      }

      // Alt+D — Downloads tab
      if (e.altKey && e.key === 'd') {
        e.preventDefault();
        setActivePanel('queue');
        return;
      }

      // Ctrl+S — Stats tab
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        setActivePanel('stats');
        return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showSettings, addToast, setActivePanel]);

  useEffect(() => {
    document.documentElement.className = '';
    if (settings.theme === 'light') {
      document.documentElement.classList.add('theme-light');
    } else if (settings.theme === 'hc') {
      document.documentElement.classList.add('theme-hc');
    }
  }, [settings.theme]);

  const TABS = [
    { id: 'queue',   label: 'Downloads', icon: Layers    },
    { id: 'history', label: 'History',   icon: History   },
    { id: 'stats',   label: 'Stats',     icon: BarChart3 }, // FEATURE-06
  ];

  return (
    <>
      <div className="flex flex-col h-screen app-bg text-white overflow-hidden rounded-xl border border-white/[0.06] shadow-2xl relative"
        style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 30px 80px rgba(0,0,0,0.9)' }}>
      <TitleBar />

      {/* BUG-10: yt-dlp update status banner */}
      {ytdlpStatus && (
        <div
          className="flex items-center gap-2 px-4 py-1.5 text-[10px] font-bold cursor-pointer flex-shrink-0"
          style={{
            background: ytdlpStatus === 'updating' ? 'rgba(6,182,212,0.08)'
                      : ytdlpStatus === 'done'     ? 'rgba(34,197,94,0.08)'
                      : 'rgba(239,68,68,0.08)',
            borderBottom: `1px solid ${
              ytdlpStatus === 'updating' ? 'rgba(6,182,212,0.15)'
            : ytdlpStatus === 'done'     ? 'rgba(34,197,94,0.15)'
            : 'rgba(239,68,68,0.15)'}`,
            color: ytdlpStatus === 'updating' ? '#06b6d4'
                 : ytdlpStatus === 'done'     ? '#22c55e'
                 : '#ef4444',
          }}
          onClick={() => setYtdlpStatus(null)}
        >
          {ytdlpStatus === 'updating' && (
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          )}
          {ytdlpStatus === 'updating' && 'Checking for yt-dlp updates…'}
          {ytdlpStatus === 'done'     && '✓ yt-dlp is up to date'}
          {ytdlpStatus === 'error'    && '⚠ yt-dlp update check failed'}
          <span className="ml-auto opacity-40">✕</span>
        </div>
      )}

      {/* FEATURE-04: Interrupted items banner */}
      {interruptedCount > 0 && (
        <div
          className="flex items-center gap-2 px-4 py-1.5 text-[10px] font-bold flex-shrink-0"
          style={{
            background: 'rgba(245,158,11,0.08)',
            borderBottom: '1px solid rgba(245,158,11,0.18)',
            color: '#f59e0b',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#f59e0b', flexShrink: 0 }} />
          ⚡ {interruptedCount} download{interruptedCount > 1 ? 's' : ''} interrupted by previous crash — re-queued automatically
          <button
            className="ml-auto opacity-50 hover:opacity-100 transition-opacity"
            onClick={() => setInterruptedCount(0)}
          >✕</button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden min-h-0 bg-black/40">
        
        {/* ── Sidebar ──────────────────────────────────────── */}
        <aside className="w-64 flex-shrink-0 flex flex-col sidebar-glass relative z-10">

          {/* Brand */}
          <div className="px-6 pt-8 pb-6">
            <h1 className="logo-text text-2xl flex items-center gap-3 text-white">
              <span className="relative flex-shrink-0">
                <span className="block w-2 h-8 rounded-full bg-gradient-to-b from-cyan-400 to-purple-500"
                  style={{ boxShadow: '0 0 18px rgba(6,182,212,0.7), 0 0 40px rgba(168,85,247,0.3)' }} />
              </span>
              ANYSAVE
            </h1>
          </div>

          {/* Divider */}
          <div className="mx-4 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)' }} />

          {/* Navigation */}
          <nav className="flex-1 px-4 py-5 space-y-1.5">
            <div className="text-[9px] font-black text-zinc-600 uppercase tracking-widest px-3 mb-4">Menu</div>
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = activePanel === id;
              return (
                <button
                  key={id}
                  onClick={() => setActivePanel(id)}
                  aria-label={`Open ${label}`}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                    active
                      ? 'nav-active'
                      : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.045] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={16} className={active ? 'text-cyan-400' : 'text-zinc-600 group-hover:text-zinc-400'} />
                    {label}
                  </div>
                  {active && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"
                      style={{ boxShadow: '0 0 6px rgba(6,182,212,0.9)' }} />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Bottom Actions */}
          <div className="p-4 space-y-2">
            <div className="h-px mb-3" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)' }} />
            <button
              onClick={() => setShowSettings(true)}
              aria-label="Open Settings"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.045] border border-transparent transition-all duration-200"
            >
              <Settings size={16} className="text-zinc-600" />
              Settings
            </button>
            <button
              onClick={handleBrowse}
              aria-label="Select Save Folder"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wider text-zinc-400 transition-all truncate group border border-white/5 hover:border-white/10"
              style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(8px)' }}
            >
              <HardDrive size={16} className="text-purple-400 flex-shrink-0 group-hover:text-purple-300 transition-colors" />
              <div className="flex flex-col items-start truncate overflow-hidden">
                <span className="text-[9px] uppercase font-black text-zinc-600 mb-0.5">Save Folder</span>
                <span className="truncate w-full text-left text-zinc-300">{settings.outputPath || 'Click to choose...'}</span>
              </div>
            </button>

          </div>
        </aside>

        {/* ── Main Workspace ───────────────────────────────── */}
        <main className="flex-1 flex flex-col min-w-0 bg-gradient-to-br from-white/[0.01] to-transparent relative">
           
           {/* Decorative bg lights — blue bottom-left, red top-right subtle */}
           <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full blur-[120px] pointer-events-none"
             style={{ background: 'rgba(59,130,246,0.07)', transform: 'translate(-30%, 30%)' }} />
           <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] pointer-events-none"
             style={{ background: 'rgba(239,68,68,0.05)', transform: 'translate(20%, -20%)' }} />

           {/* Top Control Bar */}
           <div className="px-8 py-8 border-b border-white/5 bg-black/20 backdrop-blur-md relative z-30 flex-shrink-0">
              <div className="max-w-5xl mx-auto w-full flex flex-col md:flex-row gap-6 items-start">
                 <div className="flex-1 w-full">
                    <UrlInput />
                 </div>
                 <div className="w-full md:w-[280px] flex-shrink-0">
                    <QualitySelector />
                 </div>
              </div>
           </div>

           {/* Content Area — key forces remount on tab switch for panel-fade-in */}
           <div className="flex-1 overflow-hidden p-8 max-w-5xl mx-auto w-full flex flex-col relative z-10">
              {activePanel === 'queue'   && <div key="queue"   className="panel-fade-in flex flex-col flex-1 h-full"><DownloadQueue /></div>}
              {activePanel === 'history' && <div key="history" className="panel-fade-in flex flex-col flex-1 h-full"><HistoryPanel /></div>}
              {activePanel === 'stats'   && <div key="stats"   className="panel-fade-in flex flex-col flex-1 h-full overflow-y-auto"><StatsPanel /></div>}
           </div>
        </main>
      </div>

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      <PlaylistModal />
      <ToastContainer />
    </div>
    </>
  );
}

export default App;
