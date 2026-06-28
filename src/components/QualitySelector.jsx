import React from 'react';
import { Download } from 'lucide-react';
import useStore from '../store/useStore';

// All possible quality options (master list)
const ALL_QUALITIES = [
  { id: '8K',   label: '8K',    sub: 'Ultra HD 8K',  activeStyle: { color: '#f472b6', background: 'rgba(244,114,182,0.12)', borderColor: 'rgba(244,114,182,0.45)', boxShadow: '0 0 18px rgba(244,114,182,0.3)' } },
  { id: '4K',   label: '4K',    sub: 'Ultra HD',     activeStyle: { color: '#c084fc', background: 'rgba(168,85,247,0.12)',  borderColor: 'rgba(168,85,247,0.45)', boxShadow: '0 0 15px rgba(168,85,247,0.25)' } },
  { id: '1440', label: '1440p', sub: '2K / QHD',     activeStyle: { color: '#38bdf8', background: 'rgba(56,189,248,0.12)',  borderColor: 'rgba(56,189,248,0.45)', boxShadow: '0 0 15px rgba(56,189,248,0.25)' } },
  { id: '1080', label: '1080p', sub: 'Full HD',       activeStyle: { color: '#22d3ee', background: 'rgba(6,182,212,0.12)',   borderColor: 'rgba(6,182,212,0.45)',   boxShadow: '0 0 15px rgba(6,182,212,0.25)' } },
  { id: '720',  label: '720p',  sub: 'HD',            activeStyle: { color: '#67e8f9', background: 'rgba(6,182,212,0.10)',   borderColor: 'rgba(6,182,212,0.35)',   boxShadow: '0 0 12px rgba(6,182,212,0.2)' } },
  { id: '480',  label: '480p',  sub: 'SD',            activeStyle: { color: '#94a3b8', background: 'rgba(100,116,139,0.12)', borderColor: 'rgba(100,116,139,0.4)',  boxShadow: '0 0 10px rgba(100,116,139,0.15)' } },
  { id: '360',  label: '360p',  sub: 'Low',           activeStyle: { color: '#6b7280', background: 'rgba(107,114,128,0.12)', borderColor: 'rgba(107,114,128,0.4)',  boxShadow: '0 0 10px rgba(107,114,128,0.15)' } },
  { id: 'MP3',  label: 'MP3',   sub: '320 kbps',      activeStyle: { color: '#4ade80', background: 'rgba(34,197,94,0.12)',   borderColor: 'rgba(34,197,94,0.45)',   boxShadow: '0 0 15px rgba(34,197,94,0.25)' } },
  { id: 'AAC',  label: 'AAC',   sub: '256 kbps',      activeStyle: { color: '#86efac', background: 'rgba(34,197,94,0.10)',   borderColor: 'rgba(34,197,94,0.35)',   boxShadow: '0 0 12px rgba(34,197,94,0.2)' } },
  { id: 'FLAC', label: 'FLAC',  sub: 'Lossless',      activeStyle: { color: '#fbbf24', background: 'rgba(245,158,11,0.12)',  borderColor: 'rgba(245,158,11,0.45)',  boxShadow: '0 0 15px rgba(245,158,11,0.25)' } },
  { id: 'OPUS', label: 'OPUS',  sub: '256 kbps',      activeStyle: { color: '#fb923c', background: 'rgba(249,115,22,0.12)', borderColor: 'rgba(249,115,22,0.45)', boxShadow: '0 0 15px rgba(249,115,22,0.25)' } }, // FEATURE-05
];

const inactiveStyle = {
  color: '#52525b',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.07)',
};

const disabledStyle = {
  color: '#27272a',
  background: 'rgba(255,255,255,0.015)',
  border: '1px solid rgba(255,255,255,0.04)',
  cursor: 'not-allowed',
  opacity: 0.45,
};

// ── Module-level helpers (moved from IIFE for Oxc compat) ─
const VIDEO_PLATFORM_COLORS = {
  YouTube:    { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)',   text: '#f87171' },
  Instagram:  { bg: 'rgba(236,72,153,0.12)',  border: 'rgba(236,72,153,0.3)',  text: '#f472b6' },
  TikTok:     { bg: 'rgba(6,182,212,0.12)',   border: 'rgba(6,182,212,0.3)',   text: '#22d3ee' },
  'Twitter/X':{ bg: 'rgba(99,102,241,0.12)',  border: 'rgba(99,102,241,0.3)',  text: '#818cf8' },
  Facebook:   { bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.3)',  text: '#60a5fa' },
  Vimeo:      { bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)',  text: '#34d399' },
  SoundCloud: { bg: 'rgba(249,115,22,0.12)',  border: 'rgba(249,115,22,0.3)',  text: '#fb923c' },
  Reddit:     { bg: 'rgba(239,68,68,0.10)',   border: 'rgba(239,68,68,0.25)',  text: '#f87171' },
};
const DEFAULT_PLATFORM_COLOR = { bg: 'rgba(6,182,212,0.10)', border: 'rgba(6,182,212,0.25)', text: '#06b6d4' };

const formatDuration = (secs) => {
  if (!secs) return null;
  const s   = Math.round(Number(secs));
  const h   = Math.floor(s / 3600);
  const m   = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${m}:${String(sec).padStart(2,'0')}`;
};

const QualitySelector = () => {
  const settings         = useStore((s) => s.settings);
  const updateSetting    = useStore((s) => s.updateSetting);
  const fetchedQualities = useStore((s) => s.fetchedQualities);
  const setFetchedQualities = useStore((s) => s.setFetchedQualities);
  const pendingVideo     = useStore((s) => s.pendingVideo);
  const setPendingVideo  = useStore((s) => s.setPendingVideo);
  const addToQueue       = useStore((s) => s.addToQueue);
  const addToast         = useStore((s) => s.addToast);
  
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef(null);
  
  // Local state for advanced options
  const [localCustomFormat, setLocalCustomFormat] = React.useState('');
  const [localTimeRange, setLocalTimeRange]       = React.useState('');
  // FEATURE-05/11: Audio bitrate (MP3/AAC/OPUS) and FLAC compression level (separate)
  const [audioBitrate, setAudioBitrate]           = React.useState('320');
  const [flacLevel, setFlacLevel]                 = React.useState('5');
  // FEATURE-12: Subtitle language local override
  const [localSubLang, setLocalSubLang]           = React.useState('');
  const [localSubEnabled, setLocalSubEnabled]     = React.useState(false);

  // Computed from pendingVideo for metadata card — avoids IIFE in JSX
  const pc  = (pendingVideo && VIDEO_PLATFORM_COLORS[pendingVideo.platform]) || DEFAULT_PLATFORM_COLOR;
  const dur = pendingVideo ? formatDuration(pendingVideo.duration) : null;

  // Computed for advanced mode validation — avoids IIFE in JSX
  const fmtValid  = !localCustomFormat || /\bbest(video|audio|)\b/.test(localCustomFormat);
  const timeValid = !localTimeRange   || /^[\d:]+\s*[-–—]\s*[\d:]*$/.test(localTimeRange.trim());

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDownload = () => {
    if (!pendingVideo) return;
    const AUDIO_QUALITIES = ['MP3', 'AAC', 'FLAC', 'OPUS']; // FEATURE-05: OPUS added
    const isAudio  = AUDIO_QUALITIES.includes(settings.defaultQuality);
    const isFLAC   = settings.defaultQuality === 'FLAC';
    const isLossy  = ['MP3', 'AAC', 'OPUS'].includes(settings.defaultQuality);
    addToQueue({
      ...pendingVideo,
      quality:            settings.defaultQuality,
      customFormat:       localCustomFormat || null,
      timeRange:          localTimeRange || null,
      audioBitrate:       isLossy ? audioBitrate : isFLAC ? flacLevel : null,
      subtitles_override: localSubEnabled ? (localSubLang || settings.subLang || 'en') : undefined,
    });
    setPendingVideo(null);
    setFetchedQualities(null);
    setLocalCustomFormat('');
    setLocalTimeRange('');
    setLocalSubLang('');
    setLocalSubEnabled(false);
  };

  // Auto-select highest available quality when a new video is analyzed
  React.useEffect(() => {
    if (!fetchedQualities || fetchedQualities.length === 0) return;
    const AUDIO_QUALITIES = ['MP3', 'AAC', 'FLAC', 'OPUS'];
    // Find highest video quality (non-audio) — list comes sorted highest-first
    const topVideo = fetchedQualities.find(q => !AUDIO_QUALITIES.includes(q.id));
    if (topVideo) {
      updateSetting('defaultQuality', topVideo.id);
    }
  }, [fetchedQualities]);

  // Map fetchedQualities [{id, size, bytes}] with ALL_QUALITIES
  const visibleQualities = fetchedQualities
    ? fetchedQualities
        .map((fq) => {
          const base = ALL_QUALITIES.find((q) => q.id === fq.id);
          if (!base) return null;
          return { ...base, size: fq.size, bytes: fq.bytes };
        })
        .filter(Boolean)
    : [];

  // ── Empty state (no fetch yet) ────────────────────────
  if (!fetchedQualities && !pendingVideo) {
    return (
      <div
        className="flex items-center justify-center py-4 rounded-xl"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px dashed rgba(255,255,255,0.07)',
        }}
      >
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#3f3f46' }}>
          Analyze a URL to see available formats
        </p>
      </div>
    );
  }

  const selectedQuality = visibleQualities.find(q => q.id === settings.defaultQuality) || visibleQualities[0];

  return (
    <div className="flex flex-col gap-2">
      {/* FEATURE-08: Enhanced Video Metadata Preview Card */}
      {pendingVideo && (
        <div className="rounded-xl overflow-hidden mb-1"
          style={{ background: 'rgba(0,0,0,0.35)', border: `1px solid ${pc.border}`, boxShadow: `0 0 20px ${pc.bg}` }}>

          {/* Thumbnail — 16:9 aspect ratio */}
          <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
            {pendingVideo.thumbnail ? (
              <img
                src={pendingVideo.thumbnail}
                alt={pendingVideo.title}
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.03)' }}>
                <span className="text-[10px] text-zinc-600 font-bold">No Preview</span>
              </div>
            )}
            {/* Play overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.5)', border: '2px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(4px)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
              </div>
            </div>
            {/* Duration badge */}
            {dur && (
              <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono"
                style={{ background: 'rgba(0,0,0,0.8)', color: '#fff', backdropFilter: 'blur(4px)' }}>
                {dur}
              </div>
            )}
            {/* Platform badge */}
            {pendingVideo.platform && (
              <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider"
                style={{ background: pc.bg, color: pc.text, border: `1px solid ${pc.border}`, backdropFilter: 'blur(4px)' }}>
                {pendingVideo.platform}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-2.5">
            <h3 className="text-[11px] font-bold leading-snug mb-1.5"
              style={{ color: 'rgba(255,255,255,0.9)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {pendingVideo.title}
            </h3>
            <div className="flex items-center justify-between">
              {pendingVideo.uploader && (
                <span className="text-[9px] font-bold truncate" style={{ color: '#71717a' }}>
                  by {pendingVideo.uploader}
                </span>
              )}
              {pendingVideo.url && (
                <button
                  onClick={() => window.electronAPI?.openExternal(pendingVideo.url)}
                  className="text-[8px] font-bold flex items-center gap-0.5 ml-auto flex-shrink-0"
                  style={{ color: pc.text }}
                  title="Open in browser"
                >
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  Open
                </button>
              )}
            </div>
          </div>
        </div>
      )}


      {/* Badge */}
      <div className="flex items-center">
        <span
          className="text-[9px] font-bold px-2 py-0.5 rounded-md"
          style={{
            color: '#06b6d4',
            background: 'rgba(6,182,212,0.08)',
            border: '1px solid rgba(6,182,212,0.18)',
          }}
        >
          ✦ {visibleQualities.length} format{visibleQualities.length !== 1 ? 's' : ''} available
        </span>
      </div>

      {/* Custom Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <div
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsOpen(!isOpen);
            }
          }}
          tabIndex={0}
          role="button"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label="Select Video Quality"
          className="w-full flex items-center justify-between py-3 px-4 rounded-xl transition-all outline-none focus:ring-2 focus:ring-cyan-500/50"
          style={{
            backgroundColor: isOpen ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${isOpen ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)'}`,
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            if (!isOpen) {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isOpen) {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
            }
          }}
        >
          {selectedQuality ? (
            <div className="flex flex-col">
              <span className="text-[13px] font-bold text-zinc-200 tracking-wide">
                {selectedQuality.label} <span className="opacity-60 font-medium text-[11px] ml-1">({selectedQuality.sub})</span>
              </span>
              <span className="text-[10px] font-medium text-cyan-400 mt-0.5">
                {selectedQuality.size}
              </span>
            </div>
          ) : (
            <span className="text-sm font-bold text-zinc-400">Select Quality</span>
          )}
          
          <div className="text-zinc-500 transition-transform duration-300" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </div>
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div 
            className="absolute z-50 w-full mt-2 rounded-xl overflow-hidden shadow-2xl"
            style={{
              backgroundColor: '#18181b', // Zinc 900
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)'
            }}
          >
            <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
              {visibleQualities.map((q) => {
                const isActive = settings.defaultQuality === q.id;
                return (
                  <div
                    key={q.id}
                    onClick={() => {
                      updateSetting('defaultQuality', q.id);
                      setIsOpen(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        updateSetting('defaultQuality', q.id);
                        setIsOpen(false);
                      }
                    }}
                    tabIndex={0}
                    role="option"
                    aria-selected={isActive}
                    className="flex items-center justify-between py-2.5 px-4 transition-all outline-none focus:bg-white/5"
                    style={{
                      cursor: 'pointer',
                      backgroundColor: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
                      borderLeft: isActive ? `3px solid ${q.activeStyle.color}` : '3px solid transparent'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div className="flex flex-col">
                      <span className="text-[12px] font-bold" style={{ color: isActive ? '#f4f4f5' : '#a1a1aa' }}>
                        {q.label} <span className="opacity-60 text-[10px] font-medium ml-1">({q.sub})</span>
                      </span>
                    </div>
                    <span 
                      className="text-[10px] font-bold tracking-wide" 
                      style={{ color: isActive ? q.activeStyle.color : '#71717a' }}
                    >
                      {q.size}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Advanced Settings Toggle */}
      <div className="flex justify-end mt-1">
        <button
          onClick={() => updateSetting('advancedMode', !settings.advancedMode)}
          aria-expanded={settings.advancedMode}
          aria-label="Toggle Advanced Mode Options"
          className="text-[10px] font-bold text-zinc-400 hover:text-cyan-400 transition-colors uppercase tracking-widest flex items-center gap-1"
        >
          {settings.advancedMode ? 'Hide Advanced' : 'Advanced Mode'}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: settings.advancedMode ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>
      </div>

      {/* Advanced Inputs */}
      {settings.advancedMode && (
        <div className="flex flex-col gap-3 mt-2 p-3 rounded-xl" style={{ backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>

            {/* Custom Format */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold tracking-wider uppercase" style={{ color: localCustomFormat ? '#22d3ee' : '#52525b' }}>
                  {localCustomFormat ? '✦ Custom Format Active' : 'Custom Format'}
                  {!localCustomFormat && <span className="text-zinc-600 font-normal normal-case ml-1">(expert)</span>}
                </label>
                {localCustomFormat && (
                  <button onClick={() => setLocalCustomFormat('')} className="text-[9px] font-bold" style={{ color: '#ef4444' }}>✕ Clear</button>
                )}
              </div>
              <input
                type="text"
                value={localCustomFormat}
                onChange={(e) => setLocalCustomFormat(e.target.value)}
                placeholder="e.g. bestvideo[height<=1080]+bestaudio/best"
                aria-label="Custom format code"
                className="w-full text-xs py-2 px-3 rounded-lg font-mono"
                style={{
                  backgroundColor: localCustomFormat ? 'rgba(6,182,212,0.05)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${!fmtValid ? 'rgba(239,68,68,0.5)' : localCustomFormat ? 'rgba(6,182,212,0.35)' : 'rgba(255,255,255,0.1)'}`,
                  color: '#f4f4f5',
                  outline: 'none',
                }}
                onFocus={(e) => e.target.style.borderColor = 'rgba(6,182,212,0.5)'}
                onBlur={(e) => e.target.style.borderColor = !fmtValid ? 'rgba(239,68,68,0.5)' : localCustomFormat ? 'rgba(6,182,212,0.35)' : 'rgba(255,255,255,0.1)'}
              />
              {!fmtValid && (
                <p className="text-[9px]" style={{ color: '#ef4444' }}>⚠ Format invalid — use yt-dlp format like: bestvideo+bestaudio/best</p>
              )}
              {localCustomFormat && fmtValid && (
                <p className="text-[9px]" style={{ color: '#22d3ee' }}>✓ Quality selector ignored — custom format will be used</p>
              )}
            </div>

            {/* Clip Range */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold tracking-wider uppercase" style={{ color: localTimeRange ? '#a855f7' : '#52525b' }}>
                  {localTimeRange ? '✦ Clip Range Active' : 'Clip Range'}
                  {!localTimeRange && <span className="text-zinc-600 font-normal normal-case ml-1">(start – end)</span>}
                </label>
                {localTimeRange && (
                  <button onClick={() => setLocalTimeRange('')} className="text-[9px] font-bold" style={{ color: '#ef4444' }}>✕ Clear</button>
                )}
              </div>
              <input
                type="text"
                value={localTimeRange}
                onChange={(e) => setLocalTimeRange(e.target.value)}
                placeholder="e.g. 1:30 - 3:45  or  90 - 225"
                aria-label="Time range start to end"
                className="w-full text-xs py-2 px-3 rounded-lg font-mono"
                style={{
                  backgroundColor: localTimeRange ? 'rgba(168,85,247,0.05)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${!timeValid ? 'rgba(239,68,68,0.5)' : localTimeRange ? 'rgba(168,85,247,0.35)' : 'rgba(255,255,255,0.1)'}`,
                  color: '#f4f4f5',
                  outline: 'none',
                }}
                onFocus={(e) => e.target.style.borderColor = 'rgba(168,85,247,0.5)'}
                onBlur={(e) => e.target.style.borderColor = !timeValid ? 'rgba(239,68,68,0.5)' : localTimeRange ? 'rgba(168,85,247,0.35)' : 'rgba(255,255,255,0.1)'}
              />
              {!timeValid && (
                <p className="text-[9px]" style={{ color: '#ef4444' }}>⚠ Format: 1:30 - 3:45  or  90 - 225  (seconds or mm:ss)</p>
              )}
              {localTimeRange && timeValid && (
                <p className="text-[9px]" style={{ color: '#a855f7' }}>✓ Only this clip will be downloaded (requires FFmpeg)</p>
              )}
            </div>

            {/* FEATURE-05 / FEATURE-11: Audio Quality — per format options */}
            {['MP3', 'AAC', 'OPUS'].includes(settings.defaultQuality) && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold tracking-wider uppercase" style={{ color: '#4ade80' }}>
                  Bitrate — {settings.defaultQuality}
                </label>
                <div className="flex gap-1.5">
                  {['128', '192', '256', '320'].map(br => (
                    <button
                      key={br}
                      onClick={() => setAudioBitrate(br)}
                      className="flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                      style={audioBitrate === br
                        ? { color: '#4ade80', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)', boxShadow: '0 0 10px rgba(34,197,94,0.2)' }
                        : { color: '#3f3f46', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }
                      }
                    >{br}k</button>
                  ))}
                </div>
              </div>
            )}
            {settings.defaultQuality === 'FLAC' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold tracking-wider uppercase" style={{ color: '#fbbf24' }}>
                  FLAC Compression Level
                </label>
                <div className="flex gap-1.5">
                  {[
                    { v: '0', label: '0', tip: 'Fastest' },
                    { v: '5', label: '5', tip: 'Balanced' },
                    { v: '8', label: '8', tip: 'Smallest' },
                  ].map(({ v, label, tip }) => (
                    <button
                      key={v}
                      onClick={() => setFlacLevel(v)}
                      title={tip}
                      className="flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                      style={flacLevel === v
                        ? { color: '#fbbf24', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)' }
                        : { color: '#3f3f46', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }
                      }
                    >{label}<span className="block text-[8px] opacity-60 font-normal">{tip}</span></button>
                  ))}
                </div>
                <p className="text-[8px]" style={{ color: '#52525b' }}>Level 0 = largest file, fastest encode · Level 8 = smallest file</p>
              </div>
            )}

            {/* FEATURE-12: Subtitle Language Override */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold tracking-wider uppercase" style={{ color: localSubEnabled ? '#f59e0b' : '#52525b' }}>Subtitles</label>
                <button
                  onClick={() => setLocalSubEnabled(v => !v)}
                  className="text-[9px] font-bold px-2 py-0.5 rounded-md transition-all"
                  style={localSubEnabled
                    ? { color: '#f59e0b', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)' }
                    : { color: '#52525b', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }
                  }
                >{localSubEnabled ? 'On' : 'Off'}</button>
              </div>
              {localSubEnabled && (
                <select
                  value={localSubLang || settings.subLang || 'en'}
                  onChange={e => setLocalSubLang(e.target.value)}
                  aria-label="Subtitle language"
                  className="w-full text-xs py-2 px-3 rounded-lg"
                  style={{ backgroundColor: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.3)', color: '#f4f4f5', outline: 'none' }}
                >
                  {[
                    ['en','English'], ['ur','Urdu'], ['ar','Arabic'], ['hi','Hindi'],
                    ['fr','French'], ['es','Spanish'], ['de','German'], ['zh','Chinese'],
                    ['ja','Japanese'], ['ko','Korean'], ['pt','Portuguese'], ['ru','Russian'],
                  ].map(([code, name]) => (
                    <option key={code} value={code} style={{ background: '#18181b' }}>{name} ({code})</option>
                  ))}
                </select>
              )}
            </div>

        </div>
      )}

      {/* Download Button */}
      {pendingVideo && (
        <div className="mt-3">
          <button
            onClick={handleDownload}
            aria-label="Download Video Now"
            className="w-full py-3 rounded-xl flex items-center justify-center gap-2 font-black uppercase tracking-wider text-sm transition-all"
            style={{
              color: '#000',
              background: 'linear-gradient(135deg, #06b6d4, #a855f7)',
              boxShadow: '0 0 20px rgba(6,182,212,0.3)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 30px rgba(6,182,212,0.5)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 0 20px rgba(6,182,212,0.3)'; }}
          >
            <Download size={16} strokeWidth={3} />
            Download Now
          </button>
        </div>
      )}
    </div>
  );
};

export default QualitySelector;
