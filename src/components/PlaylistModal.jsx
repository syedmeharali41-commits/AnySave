import React, { useState, useEffect } from 'react';
import { X, CheckSquare, Square, CheckCircle2, ListPlus, Grid, List } from 'lucide-react';
import useStore from '../store/useStore';

const PlaylistModal = () => {
  const pendingPlaylist = useStore((s) => s.pendingPlaylist);
  const setPendingPlaylist = useStore((s) => s.setPendingPlaylist);
  const addToQueue = useStore((s) => s.addToQueue);
  const addToast = useStore((s) => s.addToast);

  const [selected, setSelected] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('list'); // FEATURE-19: 'list' | 'grid'

  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const setFetchedQualities = useStore((s) => s.setFetchedQualities);
  const [selectedQuality, setSelectedQuality] = useState(settings?.defaultQuality || '1080');

  const closeModal = () => {
    setPendingPlaylist(null);
    setFetchedQualities(null);
  };

  // Auto-select all on load
  useEffect(() => {
    if (pendingPlaylist?.entries) {
      setSelected(new Set(pendingPlaylist.entries.map((_, i) => i)));
    }
  }, [pendingPlaylist]);

  if (!pendingPlaylist) return null;

  const toggleAll = () => {
    if (selected.size === pendingPlaylist.entries.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingPlaylist.entries.map((_, i) => i)));
    }
  };

  const toggleOne = (index) => {
    const next = new Set(selected);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelected(next);
  };

  const handleDownload = () => {
    const toDownload = pendingPlaylist.entries.filter((_, i) => selected.has(i));
    toDownload.forEach(entry => {
      addToQueue({
        title: entry.title,
        url: entry.url,
        thumbnail: entry.thumbnail,
        platform: pendingPlaylist.platform,
        quality: selectedQuality,
        customFormat: settings.customFormat || null,
        timeRange: null
      });
    });
    
    addToast({ type: 'success', title: 'Playlist Added', message: `Added ${toDownload.length} items to queue.` });
    closeModal();
  };

  // Helpers for size estimation
  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const estimateSize = (durationSec, quality) => {
    if (!durationSec) return 0;
    let bytesPerSec = 100000; // default 800kbps
    switch (quality) {
      case 'MP3': case 'AAC': bytesPerSec = 16000; break;
      case 'FLAC':            bytesPerSec = 120000; break;
      case '360':             bytesPerSec = 50000; break;
      case '480':             bytesPerSec = 100000; break;
      case '720':             bytesPerSec = 200000; break;
      case '1080':            bytesPerSec = 400000; break;
      case '1440':            bytesPerSec = 800000; break;
      case '4K':              bytesPerSec = 1500000; break;
      case 'Best':            bytesPerSec = 1500000; break; // Assume high size for best
      default:
        if (quality.includes('1080')) bytesPerSec = 400000;
        else if (quality.includes('720')) bytesPerSec = 200000;
        break;
    }
    return durationSec * bytesPerSec;
  };

  let totalBytes = 0;
  pendingPlaylist.entries.forEach((entry, i) => {
    if (selected.has(i) && entry.duration) {
      totalBytes += estimateSize(entry.duration, selectedQuality);
    }
  });

  const filteredEntries = pendingPlaylist.entries
    .map((entry, index) => ({ ...entry, originalIndex: index }))
    .filter(entry => (entry.title || 'Unknown').toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeModal}
      />

      {/* Modal */}
      <div 
        className="relative w-full max-w-4xl flex flex-col overflow-hidden rounded-2xl shadow-2xl"
        style={{
          background: '#0a0a0a',
          border: '1px solid rgba(255,255,255,0.1)',
          maxHeight: '85vh'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white mb-1">Playlist Detected</h2>
            <p className="text-sm text-zinc-400">
              {pendingPlaylist.title} <span className="mx-2">•</span> {pendingPlaylist.entries.length} videos
            </p>
          </div>
          <div className="flex items-center gap-4">
             <div className="relative">
               <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
               </div>
               <input
                 type="text"
                 placeholder="Search in playlist..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="bg-black/50 border border-white/10 text-white text-xs px-9 py-2.5 rounded-lg outline-none focus:border-cyan-500/50 transition-colors w-56"
               />
             </div>
            <button 
              onClick={closeModal}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-black/40">
          <div className="flex items-center justify-between px-2 mb-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={toggleAll}
                className="flex items-center gap-2 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                {selected.size === pendingPlaylist.entries.length ? <CheckSquare size={14} /> : <Square size={14} />}
                {selected.size === pendingPlaylist.entries.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                {selected.size} Selected
              </span>
              {totalBytes > 0 && (
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                  Total Approx: {formatBytes(totalBytes)}
                </span>
              )}
              {/* FEATURE-19: View toggle */}
              <div className="flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {[{ mode: 'list', Icon: List }, { mode: 'grid', Icon: Grid }].map(({ mode, Icon }) => (
                  <button key={mode} onClick={() => setViewMode(mode)}
                    className="w-6 h-6 flex items-center justify-center rounded-md transition-all"
                    style={viewMode === mode
                      ? { background: 'rgba(6,182,212,0.2)', color: '#06b6d4' }
                      : { color: '#52525b' }}
                  ><Icon size={12} /></button>
                ))}
              </div>
            </div>
          </div>

          {viewMode === 'grid' ? (
            /* FEATURE-19: Thumbnail grid view */
            <div className="grid grid-cols-3 gap-3">
              {filteredEntries.map((entry) => {
                const i = entry.originalIndex;
                const isSelected = selected.has(i);
                const dur = entry.duration ? `${Math.floor(entry.duration/60)}:${String(entry.duration%60).padStart(2,'0')}` : null;
                return (
                  <div key={i} onClick={() => toggleOne(i)}
                    className="relative rounded-xl overflow-hidden cursor-pointer transition-all group"
                    style={{ border: `2px solid ${isSelected ? 'rgba(6,182,212,0.6)' : 'rgba(255,255,255,0.06)'}`, boxShadow: isSelected ? '0 0 16px rgba(6,182,212,0.25)' : 'none' }}
                  >
                    {/* 16:9 thumbnail */}
                    <div className="relative" style={{ paddingTop: '56.25%' }}>
                      {entry.thumbnail
                        ? <img src={entry.thumbnail} alt={entry.title} className="absolute inset-0 w-full h-full object-cover" />
                        : <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center text-[9px] text-zinc-600 font-bold">NO THUMB</div>}
                      {/* Gradient overlay */}
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 55%)' }} />
                      {/* Index badge */}
                      <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[8px] font-bold" style={{ background: 'rgba(0,0,0,0.8)', color: '#fff' }}>#{i+1}</div>
                      {/* Checkmark */}
                      <div className="absolute top-1.5 right-1.5">
                        {isSelected
                          ? <CheckCircle2 size={16} style={{ color: '#06b6d4', filter: 'drop-shadow(0 0 4px rgba(6,182,212,0.8))' }} />
                          : <Square size={16} style={{ color: 'rgba(255,255,255,0.4)' }} className="group-hover:text-white transition-colors" />}
                      </div>
                      {/* Duration */}
                      {dur && <div className="absolute bottom-8 right-1.5 px-1 py-0.5 rounded text-[8px] font-mono font-bold" style={{ background: 'rgba(0,0,0,0.8)', color: '#fff' }}>{dur}</div>}
                      {/* Title on bottom */}
                      <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5">
                        <p className="text-[9px] font-bold leading-tight" style={{ color: 'rgba(255,255,255,0.9)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {entry.title}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List view (unchanged) */
            <div className="space-y-2">
              {filteredEntries.map((entry) => {
                const i = entry.originalIndex;
                const isSelected = selected.has(i);
                return (
                  <div 
                    key={i}
                    onClick={() => toggleOne(i)}
                    className="flex items-center gap-4 p-3 rounded-xl transition-all cursor-pointer group hover:bg-white/[0.04]"
                    style={{
                      backgroundColor: isSelected ? 'rgba(6,182,212,0.08)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isSelected ? 'rgba(6,182,212,0.2)' : 'transparent'}`,
                    }}
                  >
                    <div className="text-cyan-400 flex-shrink-0 w-5 flex justify-center">
                      {isSelected ? <CheckSquare size={18} /> : <Square size={18} className="text-zinc-600 group-hover:text-zinc-400" />}
                    </div>
                    
                    {/* Thumbnail */}
                    <div className="w-20 h-12 bg-zinc-800 rounded-md overflow-hidden flex-shrink-0 relative border border-white/5">
                      {entry.thumbnail ? (
                        <img src={entry.thumbnail} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-zinc-600">NO THUMB</div>
                      )}
                      <div className="absolute top-1 left-1 bg-black/80 px-1.5 py-0.5 rounded text-[8px] font-bold text-white border border-white/10 backdrop-blur-sm">
                        #{i + 1}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-zinc-200 truncate group-hover:text-white transition-colors">
                          {entry.title}
                        </h3>
                        <p className="text-[10px] text-zinc-500 truncate mt-1">
                          {entry.url}
                        </p>
                      </div>
                      {entry.duration && (
                        <div className="text-right flex-shrink-0">
                          <div className="text-[11px] font-mono font-bold text-zinc-400">
                            {Math.floor(entry.duration / 60)}:{String(entry.duration % 60).padStart(2, '0')}
                          </div>
                          <div className="text-[9px] font-mono text-cyan-500/70 mt-1 font-semibold">
                            {formatBytes(estimateSize(entry.duration, selectedQuality))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

            {filteredEntries.length === 0 && (
               <div className="py-12 text-center text-zinc-500 text-sm">
                 No videos found matching "{searchQuery}"
               </div>
            )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-white/[0.02] flex items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
             <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Quality:</span>
             <select
               value={selectedQuality}
               onChange={(e) => setSelectedQuality(e.target.value)}
               className="bg-black/80 border border-white/10 text-white text-xs font-bold px-4 py-2.5 rounded-lg outline-none focus:border-cyan-500/50 transition-all shadow-inner"
             >
               {pendingPlaylist.qualities && pendingPlaylist.qualities.length > 0 ? (
                 <>
                   <option value="Best" className="bg-zinc-900 text-[#06b6d4] font-bold">Highest Quality (Best Video)</option>
                   {pendingPlaylist.qualities.map(q => (
                     <option key={q.id} value={q.id} className="bg-zinc-900 text-white">
                       {q.id} {['MP3','AAC','FLAC','OPUS'].includes(q.id) ? 'Audio' : 'Video'}
                     </option>
                   ))}
                 </>
               ) : (
                 <>
                   <option value="Best" className="bg-zinc-900 text-[#06b6d4] font-bold">Highest Quality (Best Video)</option>
                   <option value="4K" className="bg-zinc-900 text-white">4K Video</option>
                   <option value="1440" className="bg-zinc-900 text-white">1440p Video</option>
                   <option value="1080" className="bg-zinc-900 text-white">1080p Video</option>
                   <option value="720" className="bg-zinc-900 text-white">720p Video</option>
                   <option value="FLAC" className="bg-zinc-900 text-white">Best Audio (FLAC)</option>
                   <option value="MP3" className="bg-zinc-900 text-white">MP3 Audio</option>
                 </>
               )}
             </select>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={closeModal}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleDownload}
              disabled={selected.size === 0}
              className="btn-primary px-8 py-2.5 text-sm flex items-center gap-2"
              style={{ opacity: selected.size === 0 ? 0.5 : 1 }}
            >
              <ListPlus size={16} />
              Add {selected.size} to Queue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaylistModal;
