import React, { useEffect, useState, useMemo } from 'react';
import useStore from '../store/useStore';
import { Download, HardDrive, TrendingUp, BarChart3, Calendar } from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────
const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const PLATFORM_COLORS = {
  YouTube:    '#f87171',
  Instagram:  '#f472b6',
  TikTok:     '#22d3ee',
  'Twitter/X':'#818cf8',
  Facebook:   '#60a5fa',
  Vimeo:      '#34d399',
  SoundCloud: '#fb923c',
  Reddit:     '#f97316',
  Other:      '#71717a',
};

// ── Stat Card ─────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, color = '#06b6d4' }) => (
  <div className="glass-card p-4 flex items-center gap-3">
    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
      <Icon size={18} style={{ color }} />
    </div>
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: '#71717a' }}>{label}</p>
      <p className="text-lg font-black" style={{ color: 'rgba(255,255,255,0.92)' }}>{value}</p>
      {sub && <p className="text-[9px] font-bold" style={{ color: '#71717a' }}>{sub}</p>}
    </div>
  </div>
);

// ── Mini Bar Chart ────────────────────────────────────────
const PlatformBar = ({ label, count, total, color }) => {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 text-[9px] font-bold truncate text-right" style={{ color: '#a1a1aa' }}>{label}</div>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color || '#06b6d4', boxShadow: `0 0 8px ${color}55` }} />
      </div>
      <div className="w-8 text-[9px] font-bold tabular-nums" style={{ color: '#71717a' }}>{count}</div>
    </div>
  );
};

// ── Success Rate Ring (SVG) ──────────────────────────────
const SuccessRing = ({ success, failed, total }) => {
  const pct = total > 0 ? Math.round((success / total) * 100) : 0;
  const r = 28, circ = 2 * Math.PI * r;
  const dash = circ * (pct / 100);
  const ringColor = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div className="glass-card p-4 flex items-center gap-4">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle cx="36" cy="36" r={r} fill="none"
          stroke={ringColor} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 36 36)"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
        <text x="36" y="40" textAnchor="middle" fontSize="14" fontWeight="900"
          fill="rgba(255,255,255,0.9)">{pct}%</text>
      </svg>
      <div className="flex flex-col gap-1.5">
        <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#71717a' }}>Success Rate</p>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: '#22c55e' }} />
          <span className="text-[10px] font-bold" style={{ color: '#a1a1aa' }}>{success} succeeded</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: '#ef4444' }} />
          <span className="text-[10px] font-bold" style={{ color: '#a1a1aa' }}>{failed} failed</span>
        </div>
      </div>
    </div>
  );
};

// ── Activity Chart (7 or 30 days) ─────────────────────────
const ActivityChart = ({ history, period }) => {
  const today = new Date();
  const buckets = Array.from({ length: period }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (period - 1 - i));
    return {
      label: d.toDateString(),
      short: period === 7 ? d.toLocaleDateString('en', { weekday: 'short' }) : d.getDate(),
    };
  });

  const countByDay = {};
  (history || []).forEach(item => {
    const d = new Date(item.completedAt || item.date || 0).toDateString();
    countByDay[d] = (countByDay[d] || 0) + 1;
  });

  const maxCount = Math.max(...buckets.map(b => countByDay[b.label] || 0), 1);

  return (
    <div>
      <div className="flex items-end gap-1" style={{ height: '48px' }}>
        {buckets.map((b, i) => {
          const cnt = countByDay[b.label] || 0;
          const h = Math.max(3, (cnt / maxCount) * 48);
          return (
            <div key={i} title={`${b.label}: ${cnt} downloads`}
              className="flex-1 rounded-sm transition-all duration-300 cursor-pointer hover:opacity-100"
              style={{
                height: `${h}px`,
                background: '#06b6d4',
                opacity: cnt === 0 ? 0.08 : 0.3 + (cnt / maxCount) * 0.7,
                alignSelf: 'flex-end',
              }} />
          );
        })}
      </div>
      {period === 7 && (
        <div className="flex gap-1 mt-1">
          {buckets.map((b, i) => (
            <div key={i} className="flex-1 text-center text-[8px] font-bold" style={{ color: '#52525b' }}>{b.short}</div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────
const StatsPanel = () => {
  // REMAINING-08 fix: fetch history from IPC, not from non-existent s.history in store
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const queue   = useStore((s) => s.queue);
  const [period, setPeriod] = useState(30);

  // Load history from Electron IPC on mount + refresh when downloads complete
  useEffect(() => {
    const load = async () => {
      if (!window.electronAPI?.getHistory) { setLoading(false); return; }
      try {
        const h = await window.electronAPI.getHistory();
        setHistory(h || []);
      } catch { /* silently fail */ }
      setLoading(false);
    };
    load();

    // Re-fetch when a download finishes
    let unsub;
    if (window.electronAPI?.onDownloadFinished) {
      unsub = window.electronAPI.onDownloadFinished(() => load());
    }
    return () => { if (typeof unsub === 'function') unsub(); };
  }, []);

  const stats = useMemo(() => {
    const total      = history.length;
    const successful = history.filter(h => !h.error && !h.failed).length;
    const failed     = total - successful;
    const totalBytes = history.reduce((acc, h) => acc + (h.total_bytes || h.fileSize || 0), 0);

    const platformCounts = {};
    history.forEach(h => {
      const p = h.platform || 'Other';
      platformCounts[p] = (platformCounts[p] || 0) + 1;
    });
    const platforms = Object.entries(platformCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const topPlatform = platforms[0]?.[0] || '—';

    const fmtCounts = {};
    history.forEach(h => {
      let ext = (h.filename || '').split('.').pop()?.toUpperCase();
      
      // Fallback: Check quality string for format hints if filename is missing
      if (!ext || ext === 'UNKNOWN' || h.filename === ext) {
        const q = (h.quality || '').toUpperCase();
        if (q.includes('MP4')) ext = 'MP4';
        else if (q.includes('MP3')) ext = 'MP3';
        else if (q.includes('WEBM')) ext = 'WEBM';
        else if (q.includes('AUDIO')) ext = 'MP3';
        else ext = 'Other';
      }

      const group = ['MP4','WEBM','MKV','MOV','AVI','FLV'].includes(ext) ? 'Video'
                  : ['MP3','AAC','FLAC','M4A','OGG','OPUS','WAV'].includes(ext) ? 'Audio'
                  : 'Other';
      
      fmtCounts[group] = (fmtCounts[group] || 0) + 1;
    });
    const formats = Object.entries(fmtCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const activeNow = (queue || []).filter(i => i.status === 'downloading' || i.status === 'converting').length;

    return { total, successful, failed, totalBytes, platforms, formats, activeNow, topPlatform };
  }, [history, queue]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" style={{ boxShadow: '0 0 10px #06b6d4' }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 overflow-y-auto pr-1" style={{ maxHeight: '100%' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <h2 className="text-sm font-black uppercase tracking-widest" style={{ color: '#a1a1aa' }}>Statistics</h2>
          <p className="text-[9px] font-bold mt-0.5" style={{ color: '#52525b' }}>Lifetime download analytics</p>
        </div>
        <BarChart3 size={18} style={{ color: '#52525b' }} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard icon={Download}   label="Total Downloads" value={stats.total}                    color="#06b6d4" />
        <StatCard icon={HardDrive}  label="Data Downloaded" value={formatBytes(stats.totalBytes)}  color="#a855f7" />
        <StatCard icon={TrendingUp} label="Top Platform"    value={stats.topPlatform}
          sub={stats.platforms[0] ? `${stats.platforms[0][1]} downloads` : undefined}             color="#f59e0b" />
        <StatCard icon={Calendar}   label="Active Now"      value={stats.activeNow}
          sub={stats.activeNow > 0 ? 'downloading' : 'idle'}                                      color="#22c55e" />
      </div>

      {/* Success Rate Ring */}
      {stats.total > 0 && (
        <SuccessRing success={stats.successful} failed={stats.failed} total={stats.total} />
      )}

      {/* Active banner */}
      {stats.activeNow > 0 && (
        <div className="glass-card p-3 flex items-center gap-2"
          style={{ borderColor: 'rgba(6,182,212,0.25)', background: 'rgba(6,182,212,0.06)' }}>
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[10px] font-bold" style={{ color: '#06b6d4' }}>
            {stats.activeNow} download{stats.activeNow > 1 ? 's' : ''} active right now
          </span>
        </div>
      )}

      {/* Activity Chart with 7D/30D toggle */}
      {history.length > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={12} style={{ color: '#06b6d4' }} />
              <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: '#a1a1aa' }}>Activity</span>
            </div>
            <div className="flex items-center gap-1 p-0.5 rounded-md"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {[7, 30].map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className="px-2 py-0.5 rounded text-[8px] font-bold transition-all"
                  style={period === p
                    ? { background: 'rgba(6,182,212,0.2)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.3)' }
                    : { color: '#52525b', border: '1px solid transparent' }}
                >{p === 7 ? '7D' : '30D'}</button>
              ))}
            </div>
          </div>
          <ActivityChart history={history} period={period} />
        </div>
      )}

      {/* Platform Breakdown */}
      {stats.platforms.length > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={12} style={{ color: '#a855f7' }} />
            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: '#a1a1aa' }}>By Platform</span>
          </div>
          <div className="space-y-2">
            {stats.platforms.map(([p, cnt]) => (
              <PlatformBar key={p} label={p} count={cnt} total={stats.total} color={PLATFORM_COLORS[p] || '#71717a'} />
            ))}
          </div>
        </div>
      )}

      {/* Format Breakdown */}
      {stats.formats.length > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={12} style={{ color: '#f59e0b' }} />
            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: '#a1a1aa' }}>By Format</span>
          </div>
          <div className="space-y-2">
            {stats.formats.map(([f, cnt]) => (
              <PlatformBar key={f} label={f} count={cnt} total={stats.total} color="#f59e0b" />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {history.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <BarChart3 size={36} style={{ color: '#3f3f46' }} />
          <p className="text-[11px] font-bold uppercase tracking-widest text-center" style={{ color: '#71717a' }}>
            No data yet
          </p>
          <p className="text-[9px] text-center" style={{ color: '#52525b' }}>
            Complete your first download to see statistics
          </p>
        </div>
      )}
    </div>
  );
};

export default StatsPanel;
