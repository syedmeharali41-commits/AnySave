import React, { useEffect, useState } from 'react';
import { History, Trash2, FolderOpen, Calendar, Download, Search, ExternalLink } from 'lucide-react';

const formatBytes = (b) => {
  if (!b) return '--';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  if (b < 1073741824) return (b / 1048576).toFixed(1) + ' MB';
  return (b / 1073741824).toFixed(2) + ' GB';
};

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const PLATFORM_COLORS = {
  YouTube:    'text-red-400 bg-red-500/10 border-red-500/20',
  Instagram:  'text-pink-400 bg-pink-500/10 border-pink-500/20',
  TikTok:     'text-zinc-300 bg-white/5 border-white/10',
  'Twitter/X':'text-sky-400 bg-sky-500/10 border-sky-500/20',
  Facebook:   'text-blue-400 bg-blue-500/10 border-blue-500/20',
  Vimeo:      'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  Unknown:    'text-zinc-500 bg-white/5 border-white/10',
};

const HistoryPanel = () => {
  const [history, setHistory] = useState([]);
  const [search, setSearch]   = useState('');
  const [filterPlatform, setFilterPlatform] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!window.electronAPI) { setLoading(false); return; }
      const h = await window.electronAPI.getHistory();
      setHistory(h || []);
      setLoading(false);
    };
    fetchHistory();

    if (window.electronAPI) {
      const unsub = window.electronAPI.onDownloadFinished(() => {
        fetchHistory();
      });
      return unsub;
    }
  }, []);

  const handleClear = async () => {
    if (!window.electronAPI) return;
    await window.electronAPI.clearHistory();
    setHistory([]);
  };

  const handleExport = async () => {
    // BUG-09 fix: use native Electron save dialog instead of browser anchor hack
    if (!window.electronAPI?.saveFile) {
      // Fallback for dev/browser context
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(history, null, 2));
      const a = document.createElement('a');
      a.setAttribute('href', dataStr);
      a.setAttribute('download', `omnisave_history_${new Date().toISOString().split('T')[0]}.json`);
      a.click();
      return;
    }
    await window.electronAPI.saveFile({
      defaultName: `omnisave_history_${new Date().toISOString().split('T')[0]}.json`,
      content: JSON.stringify(history, null, 2),
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
  };

  const platforms = ['All', ...new Set(history.map(h => h.platform || 'Unknown'))];

  const filtered = history.filter((h) => {
    const matchesSearch = h.title?.toLowerCase().includes(search.toLowerCase()) || h.platform?.toLowerCase().includes(search.toLowerCase());
    const matchesPlatform = filterPlatform === 'All' || (h.platform || 'Unknown') === filterPlatform;
    return matchesSearch && matchesPlatform;
  });

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Toolbar */}
      <div className="flex items-center gap-2.5 mb-3 flex-shrink-0">
        <div className="relative flex-1">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#3f3f46' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your downloads..."
            className="w-full rounded-lg pl-8 pr-3 py-2 text-xs outline-none transition-all duration-200"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(6,182,212,0.35)'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(6,182,212,0.08)'; }}
            onBlur={(e)  => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = ''; }}
          />
        </div>
          <select
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
            className="rounded-lg px-2 py-2 text-xs outline-none transition-all duration-200 cursor-pointer w-28"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}
          >
            {platforms.map(p => <option key={p} value={p} style={{ color: '#000' }}>{p}</option>)}
          </select>
        
        {history.length > 0 && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold rounded-lg transition-all"
              style={{ color: '#06b6d4', background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(6,182,212,0.15)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(6,182,212,0.08)'; }}
            >
              <Download size={11} /> Export
            </button>
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold rounded-lg transition-all"
              style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.boxShadow = '0 0 10px rgba(239,68,68,0.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.boxShadow = ''; }}
            >
              <Trash2 size={11} /> Clear All
            </button>
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <span className="text-xs font-mono" style={{ color: '#3f3f46' }}>Loading...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ border: '2px dashed rgba(255,255,255,0.07)' }}>
              <History size={24} style={{ color: '#27272a' }} />
            </div>
            <p className="text-xs font-medium" style={{ color: '#3f3f46' }}>
              {search ? 'No results found' : 'No downloads yet'}
            </p>
          </div>
        ) : (
          filtered.map((item, i) => (
            <div key={i} className="glass-card p-3 flex items-center gap-3">
              <div className="w-16 h-10 rounded-lg overflow-hidden flex-shrink-0" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                {item.thumbnail
                  ? <img
                      src={item.thumbnail}
                      className="w-full h-full object-cover"
                      alt=""
                      onError={(e) => {
                        // BUG-04 fix: hide broken image, show platform-colored fallback
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextSibling.style.display = 'flex';
                      }}
                    />
                  : null}
                <div
                  className="w-full h-full items-center justify-center text-[9px] font-black"
                  style={{
                    display: item.thumbnail ? 'none' : 'flex',
                    background: 'rgba(255,255,255,0.03)',
                    color: '#3f3f46',
                  }}
                >
                  {(item.platform || '?').slice(0, 2).toUpperCase()}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={`platform-badge ${PLATFORM_COLORS[item.platform] || PLATFORM_COLORS.Unknown}`}>
                    {item.platform || 'Unknown'}
                  </span>
                  {item.quality && <span className="text-[9px] font-mono" style={{ color: '#3f3f46' }}>{item.quality}</span>}
                </div>
                <p className="text-xs font-medium truncate" style={{ color: 'rgba(255,255,255,0.8)' }}>{item.title || 'Unknown Title'}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[9px] flex items-center gap-1" style={{ color: '#3f3f46' }}>
                    <Calendar size={9} />{formatDate(item.date)}
                  </span>
                  {item.total_bytes > 0 && (
                    <button 
                      onClick={() => item.filename && window.electronAPI?.openItemFolder?.(item.filename)}
                      title={item.filename ? "Open file in folder" : "File path unavailable"}
                      className="text-[9px] flex items-center gap-1 hover:text-cyan-400 transition-colors cursor-pointer" 
                      style={{ color: '#3f3f46', background: 'transparent', border: 'none', padding: 0 }}
                    >
                      <FolderOpen size={9} />{formatBytes(item.total_bytes)}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-shrink-0 flex items-center gap-1.5">
                {item.url && (
                  <button
                    onClick={() => window.electronAPI?.openExternal?.(item.url)}
                    title="Open source URL in browser"
                    className="w-6 h-6 flex items-center justify-center rounded-md transition-colors"
                    style={{ color: '#3f3f46', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#06b6d4'; e.currentTarget.style.borderColor = 'rgba(6,182,212,0.3)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#3f3f46'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}
                  >
                    <ExternalLink size={10} />
                  </button>
                )}
                <span className="text-[9px] font-bold px-2 py-1 rounded-lg" style={{ color: '#22c55e', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                  Done
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {history.length > 0 && (
        <p className="text-center text-[9px] font-mono mt-2 flex-shrink-0" style={{ color: '#27272a' }}>
          {history.length} video{history.length !== 1 ? 's' : ''} downloaded
        </p>
      )}
    </div>
  );
};

export default HistoryPanel;
