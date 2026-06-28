import React from 'react';
import { 
  X, Play, Pause, AlertCircle, CheckCircle2, 
  Loader2, Zap, Download, RefreshCw, Trash2, FolderOpen, ArrowUp, ArrowDown,
  Settings2, Music, Image, FileText, GripVertical, Clock
} from 'lucide-react';
import useStore from '../store/useStore';

// ── Helpers ───────────────────────────────────────────
const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// FEATURE-02: Parse yt-dlp speed string to bytes/sec
const parseSpeedBytes = (speedStr) => {
  if (!speedStr || speedStr === 'N/A' || speedStr === '—') return null;
  const m = String(speedStr).match(/^([\d.]+)\s*(B|KB|KiB|MB|MiB|GB|GiB)\/s/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  const u = m[2].toLowerCase();
  const mult = u.startsWith('g') ? 1073741824 : u.startsWith('m') ? 1048576 : u.startsWith('k') ? 1024 : 1;
  return n * mult;
};

// FEATURE-02: Compute human-readable ETA
const computeEta = (item) => {
  const raw = item.eta;
  // Accept any non-empty ETA from backend (including '0:00' and '—' which mean nearly done)
  if (raw && raw !== '--' && raw !== 'N/A') return raw;
  // Fallback: calculate from bytes + speed
  const remaining = (item.total_bytes || 0) - (item.downloaded_bytes || 0);
  const speedBps   = parseSpeedBytes(item.speed);
  if (remaining > 0 && speedBps > 0) {
    const secs = Math.round(remaining / speedBps);
    if (secs <= 0)    return '—';
    if (secs < 3600)  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
    return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
  }
  return raw || '—';
};


const PLATFORM_BADGE = {
  YouTube:   'bg-red-500/10 text-red-500 border-red-500/20',
  Instagram: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  TikTok:    'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  Facebook:  'bg-blue-500/10 text-blue-500 border-blue-500/20',
  Unknown:   'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
};

const STATUS = {
  queued:            { icon: Download,     label: 'Ready',       color: '#52525b' },
  queued_for_batch:  { icon: Loader2,      label: 'In Queue',    color: '#a855f7' },
  downloading:       { icon: Loader2,      label: 'Downloading', color: '#06b6d4' },
  converting:        { icon: Loader2,      label: 'Converting',  color: '#f59e0b' },
  paused:            { icon: Pause,        label: 'Paused',      color: '#f59e0b' },
  finished:          { icon: CheckCircle2, label: 'Finished',    color: '#22c55e' },
  error:             { icon: AlertCircle,  label: 'Failed',      color: '#ef4444' },
  scheduled:         { icon: Clock,        label: 'Scheduled',   color: '#a855f7' }, // FEATURE-04
  cancelled:         { icon: X,            label: 'Cancelled',   color: '#52525b' }, // BUG-02
};



// ── Error Display (extracted from IIFE for Oxc compat) ── FEATURE-17
const ErrorDisplay = ({ message }) => {
  const [expanded, setExpanded] = React.useState(false);
  const fullMsg = message || 'Unknown backend error';
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase" style={{ color: '#ef4444' }}>
          <AlertCircle size={10} />
          Failed
        </div>
        <button
          onClick={() => setExpanded(v => !v)}
          className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ml-1"
          style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
          title="Toggle full error"
        >{expanded ? 'Less' : 'Details'}</button>
        {expanded && (
          <button
            onClick={() => navigator.clipboard?.writeText(fullMsg)}
            className="text-[8px] font-bold px-1.5 py-0.5 rounded"
            style={{ color: '#94a3b8', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            title="Copy error"
          >Copy</button>
        )}
      </div>
      <p
        className={`text-[10px] leading-tight opacity-60 transition-all duration-200 ${expanded ? 'whitespace-pre-wrap break-all' : 'line-clamp-1'}`}
        style={{ color: '#ef4444', maxHeight: expanded ? '120px' : undefined, overflowY: expanded ? 'auto' : undefined }}
      >
        {fullMsg}
      </p>
    </div>
  );
};

// ── ETA Info (extracted for Oxc compat — FEATURE-01) ─────
const EtaInfo = ({ item, computeEta }) => {
  const etaVal = item.eta && item.eta !== '--' && item.eta !== 'N/A' ? item.eta : null;
  const computed = computeEta(item);
  const display = etaVal ? `ETA ${etaVal}` : `~${computed}`;
  const tooltip = etaVal
    ? `Time remaining: ${etaVal}`
    : computed !== '—'
    ? `Estimated time remaining: ${computed}`
    : 'Calculating…';
  return (
    <span className="tabular-nums cursor-help" title={tooltip}
      style={{ color: etaVal ? '#52525b' : '#a855f7' }}>
      {display}
    </span>
  );
};

// ── Download Item ─────────────────────────────────────
const DownloadItem = ({ item }) => {
  const updateQueueItem  = useStore((s) => s.updateQueueItem);
  const removeFromQueue   = useStore((s) => s.removeFromQueue);
  const moveQueueItemUp   = useStore((s) => s.moveQueueItemUp);
  const moveQueueItemDown = useStore((s) => s.moveQueueItemDown);
  const reorderQueue      = useStore((s) => s.reorderQueue); // FEATURE-16
  const addToast          = useStore((s) => s.addToast);
  const settings          = useStore((s) => s.settings);

  const triggerDownload = useStore((s) => s.triggerDownload);

  const startDownload = React.useCallback(() => {
    triggerDownload(item, settings);
  }, [item, settings, triggerDownload]);

  const resumeDownload = React.useCallback(() => {
    if (!window.electronAPI) return;
    // Use dedicated resume IPC so main.js can add --continue flag
    if (window.electronAPI.resumeDownload) {
      window.electronAPI.resumeDownload({ id: item.id, options: item });
      updateQueueItem(item.id, { status: 'downloading', percent: item.percent || 0 });
    } else {
      // Fallback: just restart
      updateQueueItem(item.id, { status: 'queued', percent: 0 });
      setTimeout(() => startDownload(), 100);
    }
  }, [item, updateQueueItem, startDownload]);

  const pauseDownload = () => {
    if (!window.electronAPI) return;
    if (window.electronAPI.pauseDownload) {
      window.electronAPI.pauseDownload({ id: item.id });
    } else {
      window.electronAPI.cancelDownload({ id: item.id });
      updateQueueItem(item.id, { status: 'paused' });
    }
  };

  const cancelDownload = () => {
    if (!window.electronAPI) return;
    window.electronAPI.cancelDownload({ id: item.id });
    removeFromQueue(item.id);
  };

  const retryDownload = () => {
    updateQueueItem(item.id, { status: 'queued', percent: 0, speed: '0 B/s', eta: '--', message: null });
    setTimeout(() => startDownload(), 100);
  };

  const badgeClass = PLATFORM_BADGE[item.platform] || PLATFORM_BADGE.Unknown;
  const statusCfg  = STATUS[item.status] || STATUS.queued;
  const StatusIcon = statusCfg.icon;

  const isDownloading = item.status === 'downloading';
  const isConverting  = item.status === 'converting';
  const isFinished    = item.status === 'finished';
  const isError       = item.status === 'error';
  const isPaused      = item.status === 'paused';
  const isActive      = isDownloading || isConverting;

  // Per-item overrides state
  const [showOverrides, setShowOverrides] = React.useState(false);
  const [overrides, setOverrides] = React.useState({
    subtitles: item.subtitles || false,
    thumbnail: item.thumbnail_embed || false,
    embedMeta: item.embedMeta_override !== undefined ? item.embedMeta_override : null,
  });
  const updateOverride = (key, val) => {
    const next = { ...overrides, [key]: val };
    setOverrides(next);
    updateQueueItem(item.id, { [`${key}_override`]: val });
  };

  // FEATURE-16: Native drag-and-drop state
  const [isDragOver, setIsDragOver] = React.useState(false);
  const canDrag = item.status === 'queued' || item.status === 'paused';

  const handleDragStart = (e) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
    e.currentTarget.closest('[data-item-root]').style.opacity = '0.4';
  };
  const handleDragEnd = (e) => {
    e.currentTarget.closest('[data-item-root]').style.opacity = '1';
    setIsDragOver(false);
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const fromId = e.dataTransfer.getData('text/plain');
    if (fromId && fromId !== item.id) reorderQueue(fromId, item.id);
  };

  return (
    <div
      data-item-root
      className="glass-card p-3.5 flex flex-col gap-2 group relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        borderColor: isDragOver
          ? 'rgba(6,182,212,0.6)'
          : isFinished
          ? 'rgba(34,197,94,0.18)'
          : isError
          ? 'rgba(239,68,68,0.3)'
          : isActive
          ? 'rgba(6,182,212,0.12)'
          : isConverting
          ? 'rgba(245,158,11,0.2)'
          : item.interrupted  // FEATURE-04: highlight interrupted items
          ? 'rgba(245,158,11,0.35)'
          : undefined,
        background: item.interrupted && !isActive && !isFinished ? 'rgba(245,158,11,0.04)' : undefined,
        outline: isDragOver ? '1px solid rgba(6,182,212,0.35)' : undefined,
        transition: 'border-color 0.15s, outline 0.15s',
      }}
    >
      <div className="flex items-center gap-3.5">
      {/* FEATURE-16: Drag handle — only for queued/paused items */}
      {canDrag && (
        <div
          draggable
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity duration-150"
          title="Drag to reorder"
          style={{ color: '#3f3f46' }}
        >
          <GripVertical size={14} />
        </div>
      )}
      {/* Thumbnail */}
      <div
        className="w-[88px] h-[54px] rounded-lg overflow-hidden flex-shrink-0 relative"
        style={{ border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {item.thumbnail ? (
          <img src={item.thumbnail} className="w-full h-full object-cover" alt="" />
        ) : (
          <div className="w-full h-full bg-zinc-900/50 flex items-center justify-center">
             <Download size={16} className="opacity-20" />
          </div>
        )}

        {/* Finished overlay */}
        {isFinished && (
          <div className="absolute inset-0 flex items-center justify-center"
               style={{ background: 'rgba(34,197,94,0.18)' }}>
            <CheckCircle2 size={20} style={{ color: '#22c55e' }} />
          </div>
        )}

        {/* Spinner overlay for downloading */}
        {isDownloading && (
          <div className="absolute inset-0 flex items-center justify-center"
               style={{ background: 'rgba(0,0,0,0.35)' }}>
            <div
              className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'rgba(6,182,212,0.6)', borderTopColor: 'transparent' }}
            />
          </div>
        )}

        {/* Converting overlay */}
        {isConverting && (
          <div className="absolute inset-0 flex items-center justify-center"
               style={{ background: 'rgba(0,0,0,0.45)' }}>
            <div
              className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'rgba(245,158,11,0.7)', borderTopColor: 'transparent' }}
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Top row: badge + retry */}
        <div className="flex items-center gap-2 mb-1">
          <span className={`platform-badge ${badgeClass}`}>
            {item.platform || 'Unknown'}
          </span>
          {item.retryCount > 0 && (
            <span className="text-[9px] font-bold" style={{ color: '#f59e0b' }}>
              Retry #{item.retryCount}
            </span>
          )}
        </div>

        {/* Title */}
        <h3
          className="text-xs font-semibold truncate leading-snug mb-2"
          style={{ color: 'rgba(255,255,255,0.85)' }}
        >
          {item.title || item.url}
        </h3>
        {/* Progress area / Error message */}
        {isDownloading ? (() => {
          const pct = item.percent ?? 0;
          const isIndeterminate = pct < 0;            // -1 = total unknown
          const isStarting = !isIndeterminate && pct === 0;
          const hasClip = !!item.timeRange;
          const hasKnownTotal = item.downloaded_bytes > 0 && item.total_bytes > 0;
          // Show size as "X / Y" when both known, else just "X downloaded"
          const showBothSizes = hasKnownTotal;
          return (
            <div className="space-y-1.5">
              {/* Progress Bar */}
              <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                {isStarting || isIndeterminate ? (
                  <div className="h-full w-full rounded-full" style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(6,182,212,0.35) 40%, rgba(6,182,212,0.65) 50%, rgba(6,182,212,0.35) 60%, transparent 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.6s ease-in-out infinite',
                  }} />
                ) : (
                  <div className="progress-bar" style={{ width: `${pct}%` }} />
                )}
              </div>

              <div className="flex justify-between text-[9px] font-mono" style={{ color: '#52525b' }}>
                <span
                  className="flex items-center gap-1" style={{ color: '#06b6d4' }}
                  title={item.speed && item.speed !== 'N/A' ? `Download speed: ${item.speed}` : undefined}
                >
                  <Zap size={9} />
                  {isStarting ? '···' : (item.speed || '—')}
                </span>
                <span className="font-bold tabular-nums flex items-center justify-center gap-1.5" style={{ color: '#06b6d4' }}>
                  {/* Stream type badge — show whenever we know which stream is downloading */}
                  {item.streamType && !isStarting && (
                    <span style={{ fontSize: '7px', background: 'rgba(6,182,212,0.15)', padding: '1px 4px', borderRadius: '4px', letterSpacing: '0.5px' }}>
                      {item.streamType.toUpperCase()}
                    </span>
                  )}
                  {isStarting
                    ? (hasClip ? 'Clipping…' : 'Starting…')
                    : isIndeterminate
                    ? `${formatBytes(item.downloaded_bytes || 0)} ···`
                    : `${pct.toFixed(1)}%`}
                </span>
                <span className="flex flex-col items-end">
                  {/* Size display */}
                  {showBothSizes ? (
                    <span className="tabular-nums" title={`${formatBytes(item.downloaded_bytes)} of ${formatBytes(item.total_bytes)} downloaded`}>
                      {formatBytes(item.downloaded_bytes)} / {formatBytes(item.total_bytes)}
                    </span>
                  ) : isStarting ? (
                    <span>{hasClip ? 'Preparing clip…' : 'Analyzing stream…'}</span>
                  ) : item.downloaded_bytes > 0 ? (
                    <span className="tabular-nums">{formatBytes(item.downloaded_bytes)} downloaded</span>
                  ) : null}
                  {!isStarting && <EtaInfo item={item} computeEta={computeEta} />}
                </span>
              </div>

            </div>
          );
        })() : isConverting ? (

          <div className="space-y-1.5">
            <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full animate-pulse" style={{
                width: '100%',
                background: 'linear-gradient(90deg, rgba(245,158,11,0.3), rgba(245,158,11,0.7), rgba(245,158,11,0.3))',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite'
              }} />
            </div>
            <p className="text-[9px] font-bold uppercase" style={{ color: '#f59e0b' }}>🔄 Post-processing (FFmpeg converting)…</p>
          </div>
        ) : isPaused ? (
          <div className="space-y-1.5">
            <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="progress-bar" style={{ width: `${item.percent || 0}%`, opacity: 0.5 }} />
            </div>
            <p className="text-[9px] font-bold uppercase" style={{ color: '#f59e0b' }}>⏸ Paused — {(item.percent || 0).toFixed(1)}% done</p>
          </div>
        ) : isError ? (
          <ErrorDisplay message={item.message} />
        ) : (
          <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest">
            <StatusIcon
              size={10}
              className={item.status === 'downloading' || item.status === 'converting' || item.status === 'queued_for_batch' ? 'animate-spin' : ''}
              style={{ color: statusCfg.color }}
            />
            <span style={{ color: statusCfg.color }}>
              {statusCfg.label}
            </span>
          </div>
        )}
      </div>

      {/* Action buttons row */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {isError && (
          <button
            onClick={retryDownload}
            title="Retry"
            className="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200"
            style={{
              color: '#f59e0b',
              background: 'rgba(245,158,11,0.1)',
              border: '1px solid rgba(245,158,11,0.25)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f59e0b';
              e.currentTarget.style.color = '#000';
              e.currentTarget.style.boxShadow = '0 0 14px rgba(245,158,11,0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(245,158,11,0.1)';
              e.currentTarget.style.color = '#f59e0b';
              e.currentTarget.style.boxShadow = '';
            }}
          >
            <RefreshCw size={12} />
          </button>
        )}

        {(item.status === 'queued' || isPaused) && (
          <>
            <button
              onClick={() => moveQueueItemUp(item.id)}
              title="Move Up"
              className="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200"
              style={{
                color: '#a1a1aa',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e4e4e7';
                e.currentTarget.style.color = '#000';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.color = '#a1a1aa';
              }}
            >
              <ArrowUp size={11} strokeWidth={3} />
            </button>
            <button
              onClick={() => moveQueueItemDown(item.id)}
              title="Move Down"
              className="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200"
              style={{
                color: '#a1a1aa',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e4e4e7';
                e.currentTarget.style.color = '#000';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.color = '#a1a1aa';
              }}
            >
              <ArrowDown size={11} strokeWidth={3} />
            </button>
            <button
              onClick={startDownload}
              title={isPaused ? "Resume Download" : "Start Download"}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200"
              style={{
                color: '#06b6d4',
                background: 'rgba(6,182,212,0.1)',
                border: '1px solid rgba(6,182,212,0.25)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#06b6d4';
                e.currentTarget.style.color = '#000';
                e.currentTarget.style.boxShadow = '0 0 14px rgba(6,182,212,0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(6,182,212,0.1)';
                e.currentTarget.style.color = '#06b6d4';
                e.currentTarget.style.boxShadow = '';
              }}
            >
              {isPaused ? <Play size={11} strokeWidth={3} fill="currentColor" /> : <Download size={11} strokeWidth={3} />}
            </button>
          </>
        )}

        {isDownloading && (
          <button
            onClick={pauseDownload}
            title="Pause"
            className="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200"
            style={{
              color: '#f59e0b',
              background: 'rgba(245,158,11,0.1)',
              border: '1px solid rgba(245,158,11,0.25)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f59e0b';
              e.currentTarget.style.color = '#000';
              e.currentTarget.style.boxShadow = '0 0 14px rgba(245,158,11,0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(245,158,11,0.1)';
              e.currentTarget.style.color = '#f59e0b';
              e.currentTarget.style.boxShadow = '';
            }}
          >
            <Pause size={11} fill="currentColor" />
          </button>
        )}

        {isFinished && (
          <button
            onClick={() => {
              if (window.electronAPI) {
                if (item.filename) {
                  window.electronAPI.openItemFolder(item.filename);
                } else {
                  window.electronAPI.openItemFolder(settings.outputPath);
                }
              }
            }}
            title="Open Folder"
            className="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200"
            style={{
              color: '#06b6d4',
              background: 'rgba(6,182,212,0.1)',
              border: '1px solid rgba(6,182,212,0.25)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#06b6d4';
              e.currentTarget.style.color = '#000';
              e.currentTarget.style.boxShadow = '0 0 14px rgba(6,182,212,0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(6,182,212,0.1)';
              e.currentTarget.style.color = '#06b6d4';
              e.currentTarget.style.boxShadow = '';
            }}
          >
            <FolderOpen size={11} fill="currentColor" />
          </button>
        )}

        <button
          onClick={() => {
            if (window.electronAPI && (item.status === 'downloading' || item.status === 'paused')) {
              window.electronAPI.cancelDownload({ id: item.id });
            }
            removeFromQueue(item.id);
          }}
          title="Remove"
          className="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200"
          style={{
            color: '#52525b',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.12)';
            e.currentTarget.style.color = '#ef4444';
            e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
            e.currentTarget.style.color = '#52525b';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
          }}
        >
          <X size={11} />
        </button>

        {/* Per-item override settings button */}
        {(item.status === 'queued' || item.status === 'paused') && (
          <button
            onClick={() => setShowOverrides((v) => !v)}
            title="Per-item Options"
            className="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200"
            style={{
              color: showOverrides ? '#a855f7' : '#52525b',
              background: showOverrides ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${showOverrides ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.07)'}`,
            }}
          >
            <Settings2 size={11} />
          </button>
        )}
      </div>
    </div>

      {/* Per-item overrides panel */}
      {showOverrides && (
        <div
          className="flex items-center gap-4 px-2 py-2 rounded-lg"
          style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.15)' }}
        >
          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: '#71717a' }}>Overrides:</span>

          {/* Subtitle */}
          <label className="flex items-center gap-1 cursor-pointer select-none">
            <div
              onClick={() => updateOverride('subtitles', !overrides.subtitles)}
              className="w-6 h-3.5 rounded-full transition-all"
              style={{ background: overrides.subtitles ? '#a855f7' : 'rgba(255,255,255,0.1)', cursor: 'pointer' }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-white mt-0.5 transition-all" style={{ marginLeft: overrides.subtitles ? '11px' : '2px' }} />
            </div>
            <FileText size={9} style={{ color: '#a1a1aa' }} />
            <span className="text-[9px]" style={{ color: '#a1a1aa' }}>Subs</span>
          </label>

          {/* Thumbnail */}
          <label className="flex items-center gap-1 cursor-pointer select-none">
            <div
              onClick={() => updateOverride('thumbnail', !overrides.thumbnail)}
              className="w-6 h-3.5 rounded-full transition-all"
              style={{ background: overrides.thumbnail ? '#06b6d4' : 'rgba(255,255,255,0.1)', cursor: 'pointer' }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-white mt-0.5 transition-all" style={{ marginLeft: overrides.thumbnail ? '11px' : '2px' }} />
            </div>
            <Image size={9} style={{ color: '#a1a1aa' }} />
            <span className="text-[9px]" style={{ color: '#a1a1aa' }}>Thumb</span>
          </label>

          {/* Embed Meta */}
          <label className="flex items-center gap-1 cursor-pointer select-none">
            <div
              onClick={() => updateOverride('embedMeta', !(overrides.embedMeta ?? true))}
              className="w-6 h-3.5 rounded-full transition-all"
              style={{ background: (overrides.embedMeta ?? true) ? '#22c55e' : 'rgba(255,255,255,0.1)', cursor: 'pointer' }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-white mt-0.5 transition-all" style={{ marginLeft: (overrides.embedMeta ?? true) ? '11px' : '2px' }} />
            </div>
            <Music size={9} style={{ color: '#a1a1aa' }} />
            <span className="text-[9px]" style={{ color: '#a1a1aa' }}>Meta</span>
          </label>

          {/* FEATURE-04: Schedule picker — only for queued/scheduled items */}
          {(item.status === 'queued' || item.status === 'scheduled') && (
            <div className="flex items-center gap-1.5 ml-auto">
              <Clock size={9} style={{ color: '#a855f7' }} />
              <input
                type="datetime-local"
                value={item.scheduledAt ? item.scheduledAt.slice(0, 16) : ''}
                min={new Date().toISOString().slice(0, 16)}
                onChange={(e) => {
                  const val = e.target.value;
                  updateQueueItem(item.id, {
                    scheduledAt: val ? new Date(val).toISOString() : null,
                    status: val && new Date(val) > new Date() ? 'scheduled' : 'queued',
                  });
                }}
                className="text-[9px] font-mono rounded px-1 py-0.5 outline-none"
                style={{ background: 'rgba(168,85,247,0.1)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.25)', colorScheme: 'dark' }}
                title="Schedule download time"
              />
              {item.scheduledAt && (
                <button
                  onClick={() => updateQueueItem(item.id, { scheduledAt: null, status: 'queued' })}
                  className="text-zinc-600 hover:text-zinc-300 transition-colors"
                  title="Clear schedule"
                >✕</button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Queue Container ───────────────────────────────────
const DownloadQueue = () => {
  const queue           = useStore((s) => s.queue);
  const settings        = useStore((s) => s.settings);
  const clearCompleted  = useStore((s) => s.clearCompleted);
  const updateQueueItem = useStore((s) => s.updateQueueItem);
  const addToast        = useStore((s) => s.addToast);
  const triggerDownload = useStore((s) => s.triggerDownload);

  const downloadingCount = queue.filter((i) => i.status === 'downloading' || i.status === 'converting').length;
  const queuedItems      = queue.filter((i) => i.status === 'queued' || i.status === 'paused');
  const hasCompleted     = queue.some((i) => i.status === 'finished');

  // ── Auto-start DISABLED ──────────────────────────────
  // Downloads only begin when the user manually clicks the ▶ button.
  // This allows quality selection before starting any download.

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span
            className="text-[10px] font-black uppercase tracking-widest"
            style={{ color: '#3f3f46' }}
          >
            Your Downloads
          </span>

          <span
            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
            style={{
              color: '#52525b',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {queue.length}
          </span>

          {downloadingCount > 0 && (
            <span
              className="flex items-center gap-1 text-[9px] font-bold"
              style={{ color: '#06b6d4' }}
            >
              <Loader2 size={10} className="animate-spin" />
              {downloadingCount} active
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Stop All / Clear Queue / Download All */}
          {downloadingCount > 0 && (
            <button
              onClick={() => {
                queue.filter(i => i.status === 'downloading' || i.status === 'queued').forEach(item => {
                  if (item.status === 'downloading' && window.electronAPI?.pauseDownload) {
                    window.electronAPI.pauseDownload({ id: item.id });
                  }
                  updateQueueItem(item.id, { status: 'paused' });
                });
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
              style={{
                color: '#fff',
                background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                boxShadow: '0 0 14px rgba(239,68,68,0.4)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 22px rgba(239,68,68,0.65)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 0 14px rgba(239,68,68,0.4)'; }}
            >
              <Pause size={11} fill="currentColor" />
              Pause All
            </button>
          )}

          {queuedItems.length > 0 && (
            <button
              onClick={() => {
                if (!window.electronAPI) return;
                queuedItems.forEach((item) => {
                  triggerDownload(item, settings);
                });
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
              style={{
                color: '#000',
                background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
                boxShadow: '0 0 14px rgba(6,182,212,0.4)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 22px rgba(6,182,212,0.65)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 0 14px rgba(6,182,212,0.4)'; }}
            >
              <Download size={11} />
              Start All ({queuedItems.length})
            </button>
          )}

          {queue.length > 0 && (
            <button
              onClick={() => useStore.getState().clearAll()}
              className="text-[9px] font-black uppercase tracking-widest transition-colors ml-2"
              style={{ color: 'rgba(239,68,68,0.5)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(239,68,68,0.5)'; }}
            >
              Clear All
            </button>
          )}

          {hasCompleted && (
            <button
              onClick={clearCompleted}
              className="text-[9px] font-black uppercase tracking-widest transition-colors ml-2"
              style={{ color: 'rgba(6,182,212,0.5)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#06b6d4'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(6,182,212,0.5)'; }}
            >
              Clear Done
            </button>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
        {queue.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-10 select-none">

            {/* Orbital animation */}
            <div className="relative flex items-center justify-center mb-8" style={{ width: 120, height: 120 }}>

              {/* Center glass circle */}
              <div className="relative z-10 w-16 h-16 rounded-full flex items-center justify-center empty-float"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 0 30px rgba(6,182,212,0.1), inset 0 1px 0 rgba(255,255,255,0.07)',
                }}>
                <Download size={22} style={{ color: 'rgba(6,182,212,0.7)' }} />
              </div>
            </div>

            {/* Text */}
            <p className="text-sm font-bold mb-1" style={{ color: '#52525b', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>
              No downloads yet
            </p>
            <p className="text-[11px] mb-6" style={{ color: '#3f3f46' }}>
              Paste a link and hit Download to get started
            </p>

            {/* Steps */}
            <div className="flex flex-col gap-2">
              {[
                { n: '①', t: 'Paste a video link above' },
                { n: '②', t: 'Pick quality → click Download' },
                { n: '③', t: 'Press ▶ to start or use Start All' },
              ].map(({ n, t }) => (
                <div key={n} className="flex items-center gap-2.5 text-[10px]" style={{ color: '#27272a' }}>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#52525b' }}>
                    {n}
                  </span>
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          queue.map((item) => <DownloadItem key={item.id} item={item} />)
        )}
      </div>
    </div>
  );
};

export default DownloadQueue;
