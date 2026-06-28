import React, { useState, useRef, useEffect } from 'react';
import {
  X, FolderOpen, Sliders, Globe, Cookie, Captions,
  MonitorDown, Gauge, CheckCircle2, AlertCircle, Loader2, Bell, Zap,
  Upload, Download as DownloadIcon, Keyboard,
  FileJson, FileText, Shield, Clock, Filter, Layers, Wifi, Image,
  ListOrdered, Lock, Radio, MessageSquare, Scissors
} from 'lucide-react';
import useStore from '../store/useStore';

// ── Toggle ──────────────────────────────────────────────
const Toggle = ({ checked, onChange, id }) => (
  <button
    id={id}
    onClick={() => onChange(!checked)}
    className="relative w-10 h-5 rounded-full flex-shrink-0 transition-all duration-300"
    style={{
      background: checked
        ? 'linear-gradient(90deg, #06b6d4, #a855f7)'
        : 'rgba(255,255,255,0.08)',
      boxShadow: checked ? '0 0 12px rgba(6,182,212,0.4)' : 'none',
    }}
  >
    <span
      className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300"
      style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }}
    />
  </button>
);

// ── Setting Row ─────────────────────────────────────────
const SettingRow = ({ label, description, children }) => (
  <div
    className="flex items-center justify-between gap-4 py-3"
    style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
  >
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>{label}</p>
      {description && (
        <p className="text-[11px] mt-0.5 leading-snug" style={{ color: '#3f3f46' }}>{description}</p>
      )}
    </div>
    <div className="flex-shrink-0">{children}</div>
  </div>
);

// ── Section Header ──────────────────────────────────────
const SectionHeader = ({ icon: Icon, label }) => (
  <div className="flex items-center gap-2 mt-6 mb-1">
    <Icon size={13} style={{ color: '#06b6d4' }} />
    <span
      className="text-[9px] font-black uppercase tracking-widest"
      style={{ color: '#3f3f46' }}
    >
      {label}
    </span>
  </div>
);

// ── Pill Button (for concurrent / rate) ────────────────
const Pill = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-200"
    style={
      active
        ? {
            color: '#000',
            background: 'linear-gradient(135deg, #06b6d4, #a855f7)',
            boxShadow: '0 0 12px rgba(6,182,212,0.45)',
          }
        : {
            color: '#52525b',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
          }
    }
    onMouseEnter={(e) => {
      if (!active) {
        e.currentTarget.style.color = '#a1a1aa';
        e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
      }
    }}
    onMouseLeave={(e) => {
      if (!active) {
        e.currentTarget.style.color = '#52525b';
        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
      }
    }}
  >
    {children}
  </button>
);

// ── Inline Input ────────────────────────────────────────
const InlineInput = ({ value, onChange, placeholder, className = '' }) => (
  <input
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className={`rounded-lg px-2.5 py-1.5 text-xs outline-none transition-all duration-200 ${className}`}
    style={{
      color: '#fff',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.09)',
    }}
    onFocus={(e) => {
      e.currentTarget.style.borderColor = 'rgba(6,182,212,0.4)';
      e.currentTarget.style.boxShadow = '0 0 0 2px rgba(6,182,212,0.08)';
    }}
    onBlur={(e) => {
      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)';
      e.currentTarget.style.boxShadow = '';
    }}
  />
);

// ── Inline Select ───────────────────────────────────────
const InlineSelect = ({ value, onChange, options }) => (
  <select
    value={value}
    onChange={onChange}
    className="rounded-lg px-2.5 py-1.5 text-xs outline-none transition-all duration-200"
    style={{
      color: '#fff',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.09)',
    }}
    onFocus={(e) => {
      e.currentTarget.style.borderColor = 'rgba(6,182,212,0.4)';
    }}
    onBlur={(e) => {
      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)';
    }}
  >
    {options.map((o) => (
      <option key={o.value} value={o.value}>{o.label}</option>
    ))}
  </select>
);

// ── Constants ───────────────────────────────────────────
const RATE_LIMITS = [
  { label: 'Unlimited', value: 'unlimited' },
  { label: '1 MB/s',    value: '1M' },
  { label: '2 MB/s',    value: '2M' },
  { label: '5 MB/s',    value: '5M' },
  { label: '10 MB/s',   value: '10M' },
];

const SUBTITLE_LANGS = [
  { label: 'All Languages', value: 'all' },
  { label: 'English', value: 'en' },
  { label: 'Urdu',    value: 'ur' },
  { label: 'Hindi',   value: 'hi' },
  { label: 'Arabic',  value: 'ar' },
  { label: 'French',  value: 'fr' },
  { label: 'Spanish', value: 'es' },
];

const BROWSERS = [
  { label: 'None',    value: '' },
  { label: 'Chrome',  value: 'chrome' },
  { label: 'Firefox', value: 'firefox' },
  { label: 'Edge',    value: 'edge' },
];

const THEMES = [
  { label: 'Dark (Default)', value: 'dark' },
  { label: 'Light',          value: 'light' },
  { label: 'High Contrast',  value: 'hc' },
];

const CONTAINER_FORMATS = [
  { label: 'MP4 (Best compat.)', value: 'mp4' },
  { label: 'MKV (Best quality)', value: 'mkv' },
  { label: 'WebM (Web-native)', value: 'webm' },
  { label: 'Auto (let yt-dlp decide)', value: 'auto' },
];

const SUB_FORMATS = [
  { label: 'SRT (Universal)', value: 'srt' },
  { label: 'VTT (Web)',      value: 'vtt' },
  { label: 'ASS (Styled)',   value: 'ass' },
];

const SLEEP_INTERVALS = [
  { label: 'Off',    value: 0 },
  { label: '1s',     value: 1 },
  { label: '2s',     value: 2 },
  { label: '5s',     value: 5 },
  { label: '10s',    value: 10 },
];

const AUDIO_BITRATES = [
  { label: '128 kbps', value: '128' },
  { label: '192 kbps', value: '192' },
  { label: '256 kbps', value: '256' },
  { label: '320 kbps', value: '320' },
];

// ── Settings Panel ──────────────────────────────────────
const SettingsPanel = ({ onClose }) => {
  const settings    = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const addToast    = useStore((s) => s.addToast);

  const [local, setLocal]             = useState({ ...settings });
  const [proxyStatus, setProxyStatus] = useState(null);
  const [isUpdating, setIsUpdating]   = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false); // shortcuts modal
  const fileInputRef                  = useRef(null);


  const set = (key, val) => setLocal((p) => ({ ...p, [key]: val }));

  const handleUpdateYtdlp = async () => {
    if (!window.electronAPI) return;
    setIsUpdating(true);
    const res = await window.electronAPI.updateYtdlp();
    setIsUpdating(false);
    addToast({
      type: res.success ? 'success' : 'error',
      title: 'Backend Update',
      message: res.message,
    });
  };

  const handleSave = async () => {
    setSettings(local);
    if (window.electronAPI) await window.electronAPI.saveSettings(local);
    addToast({ type: 'success', title: 'Settings Saved', message: 'Your preferences have been applied.' });
    onClose();
  };

  const handleBrowse = async () => {
    if (!window.electronAPI) return;
    const p = await window.electronAPI.openDirectory();
    if (p) set('outputPath', p);
  };

  const handleTestProxy = async () => {
    if (!local.proxy || !window.electronAPI) return;
    setProxyStatus('testing');
    const res = await window.electronAPI.testProxy({ 
        proxy: local.proxy, 
        proxyUser: local.proxyUser, 
        proxyPass: local.proxyPass 
    });
    setProxyStatus(res.success ? 'ok' : 'fail');
    addToast({
      type: res.success ? 'success' : 'error',
      title: res.success ? 'Proxy Connected' : 'Proxy Failed',
      message: res.success ? `IP: ${res.ip}` : res.message,
    });
  };

  // FEATURE-13: Export settings as JSON
  const handleExportSettings = async () => {
    const json = JSON.stringify(local, null, 2);
    if (window.electronAPI?.saveFile) {
      const saved = await window.electronAPI.saveFile({
        content: json,
        defaultName: 'anysave-settings.json',
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      if (saved) addToast({ type: 'success', title: 'Exported', message: 'Settings saved to file.' });
    } else {
      // Fallback: browser download
      const blob = new Blob([json], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'anysave-settings.json';
      a.click();
    }
  };

  // FEATURE-13: Import settings from JSON file
  const handleImportSettings = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        setLocal(prev => ({ ...prev, ...parsed }));
        addToast({ type: 'success', title: 'Imported', message: 'Settings loaded — click Save to apply.' });
      } catch {
        addToast({ type: 'error', title: 'Import Failed', message: 'Invalid JSON file.' });
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[88vh] flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: '#0e0e11',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(6,182,212,0.06)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: 'linear-gradient(90deg, #06b6d4, #a855f7, #06b6d4)' }}
        />

        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.2)' }}
            >
              <Sliders size={14} style={{ color: '#06b6d4' }} />
            </div>
            <h2 className="text-sm font-black uppercase tracking-widest" style={{ color: '#fff' }}>
              Settings
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Keyboard Shortcuts button */}
            <button
              onClick={() => setShowShortcuts(true)}
              aria-label="Show Keyboard Shortcuts"
              title="Keyboard Shortcuts"
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
              style={{ color: '#52525b', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#06b6d4'; e.currentTarget.style.borderColor = 'rgba(6,182,212,0.3)'; e.currentTarget.style.background = 'rgba(6,182,212,0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#52525b'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}
            >
              <Keyboard size={13} />
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
              style={{ color: '#52525b', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#52525b'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">

          <SectionHeader icon={FolderOpen} label="Save Location" />
          <SettingRow label="Download Folder" description="Choose where your downloads will be saved">
            <button
              onClick={handleBrowse}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all max-w-[180px] truncate"
              style={{ color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(6,182,212,0.3)'; e.currentTarget.style.background = 'rgba(6,182,212,0.07)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            >
              <FolderOpen size={12} style={{ color: '#06b6d4', flexShrink: 0 }} />
              <span className="truncate">{local.outputPath || 'Default Downloads'}</span>
            </button>
          </SettingRow>
          <SettingRow label="Sort by Website" description="Save YouTube, Instagram etc. in separate folders">
            <Toggle id="organize" checked={local.organizByPlatform} onChange={(v) => set('organizByPlatform', v)} />
          </SettingRow>
          <SettingRow label="Date Subfolders" description="Organize by month: AnySave/YouTube/2025-05/...">
            <Toggle id="date-subfolders" checked={local.dateSubfolders} onChange={(v) => set('dateSubfolders', v)} />
          </SettingRow>
          {local.dateSubfolders && (
            <SettingRow label="Date Format" description="Folder name pattern for date-based organization">
              <InlineSelect
                value={local.dateFormat || 'YYYY-MM'}
                onChange={(e) => set('dateFormat', e.target.value)}
                options={[
                  { value: 'YYYY-MM',    label: 'YYYY-MM  (e.g. 2026-05)' },
                  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD  (daily)' },
                  { value: 'YYYY/MM',    label: 'YYYY/MM  (nested)' },
                  { value: 'YYYY/MM/DD', label: 'YYYY/MM/DD  (nested daily)' },
                ]}
              />
            </SettingRow>
          )}
          <SettingRow label="File Name Format" description="How to name downloaded files (default: video title)">
            <InlineInput
              value={local.outputTemplate}
              onChange={(e) => set('outputTemplate', e.target.value)}
              placeholder="%(title)s.%(ext)s"
              className="w-44 font-mono text-[10px]"
            />
          </SettingRow>

          {/* Download Options */}
          <SectionHeader icon={MonitorDown} label="Download Settings" />
          <SettingRow label="Downloads at Once" description="How many videos can download at the same time">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <Pill key={n} active={local.concurrentDownloads === n} onClick={() => set('concurrentDownloads', n)}>
                  {n}
                </Pill>
              ))}
            </div>
          </SettingRow>
          <SettingRow label="Download Speed Boost" description="More threads = faster downloads (uses more CPU)">
            <div className="flex items-center gap-1">
              {[1, 2, 4, 8, 16].map((n) => (
                <Pill key={n} active={local.fragmentThreads === n} onClick={() => set('fragmentThreads', n)}>
                  {n}
                </Pill>
              ))}
            </div>
          </SettingRow>
          <SettingRow label="Save Video Info" description="Embed title, date, and artist info into the file">
            <Toggle id="embed-meta" checked={local.embedMeta} onChange={(v) => set('embedMeta', v)} />
          </SettingRow>
          <SettingRow label="Save Cover Image" description="Download the video thumbnail alongside the file">
            <Toggle id="thumbnail" checked={local.embedThumbnail} onChange={(v) => set('embedThumbnail', v)} />
          </SettingRow>
          <SettingRow label="Skip Already Downloaded" description="Don't re-download videos you already have">
            <Toggle id="smart-dedupe" checked={local.smartDeduplication} onChange={(v) => set('smartDeduplication', v)} />
          </SettingRow>
          <SettingRow label="Skip Short Videos" description="Ignore videos shorter than 60 seconds (Shorts/Reels)">
            <Toggle id="exclude-shorts" checked={local.excludeShorts} onChange={(v) => set('excludeShorts', v)} />
          </SettingRow>
          <SettingRow label="Skip Ads in Videos" description="Remove sponsored segments automatically (YouTube only — requires SponsorBlock)">
            <Toggle id="sponsorblock" checked={local.sponsorblock} onChange={(v) => set('sponsorblock', v)} />
          </SettingRow>
          {local.sponsorblock && (
            <div className="px-1 pb-3">
              <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: '#52525b' }}>
                Categories to skip
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'sponsor',     label: 'Sponsor',      color: '#22c55e' },
                  { id: 'intro',       label: 'Intro',        color: '#06b6d4' },
                  { id: 'outro',       label: 'Outro',        color: '#a855f7' },
                  { id: 'selfpromo',   label: 'Self-Promo',   color: '#f59e0b' },
                  { id: 'interaction', label: 'Interaction',  color: '#ef4444' },
                  { id: 'filler',      label: 'Filler',       color: '#71717a' },
                ].map(c => {
                  const active = local.sponsorblockCategories || ['sponsor', 'intro', 'outro', 'selfpromo', 'interaction'];
                  const on = active.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        const cur = local.sponsorblockCategories || ['sponsor', 'intro', 'outro', 'selfpromo', 'interaction'];
                        const next = cur.includes(c.id) ? cur.filter(x => x !== c.id) : [...cur, c.id];
                        set('sponsorblockCategories', next);
                      }}
                      className="px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all"
                      style={on
                        ? { color: c.color, background: `${c.color}20`, border: `1px solid ${c.color}60` }
                        : { color: '#52525b', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }
                      }
                    >
                      {on ? '✓ ' : ''}{c.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => set('sponsorblockCategories', ['sponsor','intro','outro','selfpromo','interaction','filler'])}
                  className="text-[8px] font-bold px-2 py-0.5 rounded"
                  style={{ color: '#06b6d4', background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}
                >Select All</button>
                <button
                  onClick={() => set('sponsorblockCategories', [])}
                  className="text-[8px] font-bold px-2 py-0.5 rounded"
                  style={{ color: '#71717a', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >Clear</button>
              </div>
            </div>
          )}
          <SettingRow label="Search in Playlist" description="Only download videos with this word in the title">
            <InlineInput
              value={local.playlistFilter}
              onChange={(e) => set('playlistFilter', e.target.value)}
              placeholder="e.g. music, tutorial..."
              className="w-44 text-[10px]"
            />
          </SettingRow>
          <SettingRow label="Create Playlist File" description="Save a playlist file (.m3u) to play downloaded videos in order">
            <Toggle id="generate-m3u" checked={local.generateM3u} onChange={(v) => set('generateM3u', v)} />
          </SettingRow>

          {/* ── Output Format ─────────────────────────────── */}
          <SectionHeader icon={Layers} label="Output Format" />
          <SettingRow label="Video Container" description="File format for merged video+audio downloads">
            <InlineSelect
              value={local.mergeOutputFormat || 'mp4'}
              onChange={(e) => set('mergeOutputFormat', e.target.value)}
              options={CONTAINER_FORMATS}
            />
          </SettingRow>
          <SettingRow label="Default Audio Bitrate" description="Quality for audio-only downloads (MP3, AAC, FLAC, OPUS)">
            <div className="flex items-center gap-1">
              {AUDIO_BITRATES.map((b) => (
                <Pill key={b.value} active={(local.defaultAudioBitrate || '320') === b.value} onClick={() => set('defaultAudioBitrate', b.value)}>
                  {b.label}
                </Pill>
              ))}
            </div>
          </SettingRow>
          <SettingRow label="Subtitle Format" description="Format for downloaded subtitle files">
            <InlineSelect
              value={local.subtitleFormat || 'srt'}
              onChange={(e) => set('subtitleFormat', e.target.value)}
              options={SUB_FORMATS}
            />
          </SettingRow>
          <SettingRow label="Prefer Free Codecs" description="Prefer VP9/AV1 over H.264 when available (saves space, open-source)">
            <Toggle id="prefer-free" checked={local.preferFreeFormats} onChange={(v) => set('preferFreeFormats', v)} />
          </SettingRow>

          {/* ── File Writing ──────────────────────────────── */}
          <SectionHeader icon={FileText} label="Extra Files" />
          <SettingRow label="Save Thumbnail" description="Save cover art as a separate image file (.jpg)">
            <Toggle id="write-thumb" checked={local.writeThumbnail} onChange={(v) => set('writeThumbnail', v)} />
          </SettingRow>
          <SettingRow label="Save Description" description="Save video description as a .description text file">
            <Toggle id="write-desc" checked={local.writeDescription} onChange={(v) => set('writeDescription', v)} />
          </SettingRow>
          <SettingRow label="Save Info JSON" description="Save full video metadata as a .info.json file">
            <Toggle id="write-json" checked={local.writeInfoJson} onChange={(v) => set('writeInfoJson', v)} />
          </SettingRow>
          <SettingRow label="No Overwrite" description="Skip if file already exists instead of overwriting">
            <Toggle id="no-overwrite" checked={local.noOverwrite} onChange={(v) => set('noOverwrite', v)} />
          </SettingRow>

          {/* ── Network & Anti-ban ────────────────────────── */}
          <SectionHeader icon={Wifi} label="Network & Anti-Ban" />
          <SettingRow label="Bypass Geo-Blocks" description="Auto-bypass geographic restrictions (VPN not needed for most sites)">
            <Toggle id="geo-bypass" checked={local.geoBypass} onChange={(v) => set('geoBypass', v)} />
          </SettingRow>
          {local.geoBypass && (
            <SettingRow label="Spoof Country Code" description="2-letter country code to spoof (e.g. US, GB, DE). Leave blank for auto.">
              <InlineInput
                value={local.geoBypassCountry || ''}
                onChange={(e) => set('geoBypassCountry', e.target.value.toUpperCase().slice(0, 2))}
                placeholder="e.g. US"
                className="w-20 uppercase font-mono"
              />
            </SettingRow>
          )}
          <SettingRow label="Polite Mode (Sleep)" description="Wait between each download — avoids rate-limiting & bans">
            <div className="flex items-center gap-1">
              {SLEEP_INTERVALS.map((s) => (
                <Pill key={s.value} active={(local.sleepInterval ?? 0) === s.value} onClick={() => set('sleepInterval', s.value)}>
                  {s.label}
                </Pill>
              ))}
            </div>
          </SettingRow>

          {/* ── Duration Filter ───────────────────────────── */}
          <SectionHeader icon={Filter} label="Duration Filter" />
          <SettingRow label="Min Duration (seconds)" description="Skip videos shorter than this. 0 = no limit">
            <InlineInput
              value={local.minDuration ?? ''}
              onChange={(e) => set('minDuration', e.target.value.replace(/\D/g, ''))}
              placeholder="0"
              className="w-20 font-mono"
            />
          </SettingRow>
          <SettingRow label="Max Duration (seconds)" description="Skip videos longer than this. 0 = no limit">
            <InlineInput
              value={local.maxDuration ?? ''}
              onChange={(e) => set('maxDuration', e.target.value.replace(/\D/g, ''))}
              placeholder="0"
              className="w-20 font-mono"
            />
          </SettingRow>

          {/* ── Playlist & Chapters ─────────────────────── */}
          <SectionHeader icon={ListOrdered} label="Playlist & Chapters" />
          <SettingRow label="Playlist Start" description="Download from item #N in a playlist (1 = beginning)">
            <InlineInput
              value={local.playlistStart ?? ''}
              onChange={(e) => set('playlistStart', e.target.value.replace(/\D/g, ''))}
              placeholder="1"
              className="w-20 font-mono"
            />
          </SettingRow>
          <SettingRow label="Playlist End" description="Stop at item #N (0 = download all)">
            <InlineInput
              value={local.playlistEnd ?? ''}
              onChange={(e) => set('playlistEnd', e.target.value.replace(/\D/g, ''))}
              placeholder="0"
              className="w-20 font-mono"
            />
          </SettingRow>
          <SettingRow label="Split by Chapters" description="Save each chapter as a separate file (requires chapters in metadata)">
            <Toggle id="split-chapters" checked={local.splitChapters} onChange={(v) => set('splitChapters', v)} />
          </SettingRow>

          {/* ── Security ────────────────────────────── */}
          <SectionHeader icon={Lock} label="Security & Age Bypass" />
          <SettingRow label="Age Limit Bypass" description="Set max age limit to pass (e.g. 18 bypasses age-gating). 0 = off">
            <div className="flex items-center gap-1">
              {[0, 13, 16, 18].map((a) => (
                <Pill key={a} active={(local.ageLimit ?? 0) === a} onClick={() => set('ageLimit', a)}>
                  {a === 0 ? 'Off' : `${a}+`}
                </Pill>
              ))}
            </div>
          </SettingRow>
          <SettingRow label="Video Password" description="Password for protected videos/channels">
            <InlineInput
              value={local.videoPassword || ''}
              onChange={(e) => set('videoPassword', e.target.value)}
              placeholder="Enter password..."
              type="password"
              className="w-44"
            />
          </SettingRow>

          {/* ── Live & Comments ───────────────────────── */}
          <SectionHeader icon={Radio} label="Live Streams & Comments" />
          <SettingRow label="Record Live from Start" description="Begin recording a live stream from its actual beginning (if server supports)">
            <Toggle id="live-from-start" checked={local.liveFromStart} onChange={(v) => set('liveFromStart', v)} />
          </SettingRow>
          <SettingRow label="Save Comments" description="Download YouTube comments and save as JSON (slow on large videos)">
            <Toggle id="write-comments" checked={local.writeComments} onChange={(v) => set('writeComments', v)} />
          </SettingRow>

          {/* Speed Limiter */}
          <SectionHeader icon={Gauge} label="Speed Limit" />
          <SettingRow label="Max Download Speed" description="Limit speed so other apps still work smoothly">
            <div className="flex flex-wrap gap-1 justify-end">
              {RATE_LIMITS.map((r) => (
                <Pill key={r.value} active={local.rateLimit === r.value} onClick={() => set('rateLimit', r.value)}>
                  {r.label}
                </Pill>
              ))}
            </div>
          </SettingRow>

          {/* Subtitles */}
          <SectionHeader icon={Captions} label="Subtitles" />
          <SettingRow label="Download Subtitles" description="Get subtitles alongside your video">
            <Toggle id="subtitles" checked={local.subtitles} onChange={(v) => set('subtitles', v)} />
          </SettingRow>
          {local.subtitles && (
            <SettingRow label="Subtitle Language" description="Which language subtitles to download">
              <InlineSelect
                value={local.subLang}
                onChange={(e) => set('subLang', e.target.value)}
                options={SUBTITLE_LANGS}
              />
            </SettingRow>
          )}

          {/* Proxy */}
          <SectionHeader icon={Globe} label="VPN / Proxy" />
          <SettingRow label="Proxy Address" description="Use a proxy to access blocked or region-locked content">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <InlineInput
                  value={local.proxy}
                  onChange={(e) => set('proxy', e.target.value)}
                  placeholder="http://127.0.0.1:1080"
                  className="w-44"
                />
                <button
                  onClick={handleTestProxy}
                  disabled={!local.proxy || proxyStatus === 'testing'}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all disabled:opacity-40"
                  style={{ color: '#06b6d4', background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}
                  onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = 'rgba(6,182,212,0.15)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(6,182,212,0.08)'; }}
                >
                  {proxyStatus === 'testing' && <Loader2 size={10} className="animate-spin" />}
                  {proxyStatus === 'ok'      && <CheckCircle2 size={10} style={{ color: '#22c55e' }} />}
                  {proxyStatus === 'fail'    && <AlertCircle  size={10} style={{ color: '#ef4444' }} />}
                  Test
                </button>
              </div>
              
              {/* Optional Auth Fields */}
              <div className="flex items-center gap-2 mt-1">
                <InlineInput
                  value={local.proxyUser || ''}
                  onChange={(e) => set('proxyUser', e.target.value)}
                  placeholder="Username (optional)"
                  className="w-32"
                />
                <InlineInput
                  value={local.proxyPass || ''}
                  onChange={(e) => set('proxyPass', e.target.value)}
                  placeholder="Password (optional)"
                  type="password"
                  className="w-32"
                />
              </div>
            </div>
          </SettingRow>

          {/* Cookie Auth */}
          <SectionHeader icon={Cookie} label="Login / Account Access" />
          <SettingRow label="Use Browser Login" description="Access private or age-restricted videos using your browser account">
            <InlineSelect
              value={local.cookieBrowser}
              onChange={(e) => set('cookieBrowser', e.target.value)}
              options={BROWSERS}
            />
          </SettingRow>

          {/* System */}
          <SectionHeader icon={Bell} label="App & Theme" />
          <SettingRow label="App Look" description="Switch between Dark, Light, or High-Contrast mode">
            <InlineSelect
              value={local.theme}
              onChange={(e) => set('theme', e.target.value)}
              options={THEMES}
            />
          </SettingRow>
          <SettingRow label="Run in Background" description="Keep app running in system tray when you close the window">
            <Toggle id="tray" checked={local.minimizeToTray} onChange={(v) => set('minimizeToTray', v)} />
          </SettingRow>
          <SettingRow label="Enable Remote API" description="Allow adding URLs via local network (Port 9090). Requires restart.">
            <Toggle id="remote-api" checked={local.enableRemoteQueue} onChange={(v) => set('enableRemoteQueue', v)} />
          </SettingRow>
          <SettingRow label="Auto-Paste Link" description="Automatically fetch copied video links from your clipboard">
            <Toggle id="auto-paste" checked={local.autoPasteClipboard} onChange={(v) => set('autoPasteClipboard', v)} />
          </SettingRow>
          <SettingRow label="Run After Download" description="Advanced: run a custom command when each download finishes">
            <InlineInput
              value={local.execCmd}
              onChange={(e) => set('execCmd', e.target.value)}
              placeholder="e.g. echo {}"
              className="w-44 font-mono text-[10px]"
            />
          </SettingRow>
          <SettingRow label="Check for Updates" description="Keep the downloader engine up to date for best compatibility">
            <button
              onClick={handleUpdateYtdlp}
              disabled={isUpdating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all disabled:opacity-40"
              style={{ 
                color: '#a855f7', 
                background: 'rgba(168,85,247,0.08)', 
                border: '1px solid rgba(168,85,247,0.2)' 
              }}
              onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = 'rgba(168,85,247,0.15)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(168,85,247,0.08)'; }}
            >
              {isUpdating ? <Loader2 size={10} className="animate-spin" /> : <Zap size={10} />}
              {isUpdating ? 'Updating...' : 'Update Now'}
            </button>
          </SettingRow>


        </div>

        {/* Privacy Note */}
        <div className="px-6 pb-2 text-[10px] font-medium text-zinc-500 flex items-center justify-center gap-2 text-center opacity-80">
          <CheckCircle2 size={10} className="text-green-500" />
          Privacy-First: No telemetry, no logs, fully offline processing. No account required.
        </div>

        {/* Footer */}
        <div
          className="flex items-center gap-2 px-6 py-4 flex-shrink-0 flex-wrap"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          {/* FEATURE-13: Export / Import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImportSettings}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Import settings from JSON file"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
            style={{ color: '#a855f7', background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(168,85,247,0.15)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(168,85,247,0.08)'; }}
          >
            <Upload size={10} /> Import
          </button>
          <button
            onClick={handleExportSettings}
            title="Export settings to JSON file"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
            style={{ color: '#06b6d4', background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(6,182,212,0.15)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(6,182,212,0.08)'; }}
          >
            <DownloadIcon size={10} /> Export
          </button>

          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-lg transition-colors"
            style={{ color: '#52525b' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#a1a1aa'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#52525b'; }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="relative overflow-hidden px-6 py-2.5 text-xs font-black text-black rounded-xl transition-all"
            style={{
              background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
              boxShadow: '0 0 20px rgba(6,182,212,0.35)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 30px rgba(6,182,212,0.6)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 0 20px rgba(6,182,212,0.35)'; }}
          >
            Save Settings
          </button>
        </div>

        {/* ── Keyboard Shortcuts Overlay (inside panel card, absolute covers it) */}
        {showShortcuts && (
          <div
            className="absolute inset-0 z-50 flex items-center justify-center rounded-2xl"
            style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)' }}
            onClick={() => setShowShortcuts(false)}
          >
          <div
            className="w-80 rounded-2xl overflow-hidden"
            style={{
              background: '#0e0e11',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(6,182,212,0.08)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top gradient */}
            <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, #06b6d4, #a855f7)' }} />

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.2)' }}>
                  <Keyboard size={14} style={{ color: '#06b6d4' }} />
                </div>
                <span className="text-sm font-black uppercase tracking-widest" style={{ color: '#fff' }}>Shortcuts</span>
              </div>
              <button
                onClick={() => setShowShortcuts(false)}
                className="w-6 h-6 flex items-center justify-center rounded-lg transition-all"
                style={{ color: '#52525b', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#52525b'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
              >
                <X size={12} />
              </button>
            </div>

            {/* Shortcut rows */}
            <div className="px-5 py-4 flex flex-col gap-1">
              {[
                { key: 'Ctrl + Enter', desc: 'Start all queued downloads',   color: '#06b6d4' },
                { key: 'Ctrl + D',     desc: 'Switch to Downloads tab',       color: '#a855f7' },
                { key: 'Ctrl + H',     desc: 'Switch to History tab',         color: '#f59e0b' },
                { key: 'Ctrl + S',     desc: 'Switch to Stats tab',           color: '#22c55e' },
                { key: 'Ctrl + V',     desc: 'Focus URL / Batch input',       color: '#06b6d4' },
                { key: 'Esc',          desc: 'Close Settings / modal',        color: '#ef4444' },
              ].map(({ key, desc, color }) => (
                <div key={key}
                  className="flex items-center justify-between py-2.5 px-3 rounded-xl transition-all"
                  style={{ border: '1px solid rgba(255,255,255,0.04)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = `${color}22`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; }}
                >
                  <span className="text-[11px] font-medium" style={{ color: '#a1a1aa' }}>{desc}</span>
                  <kbd
                    className="text-[10px] font-mono font-black px-2 py-1 rounded-lg flex-shrink-0 ml-3"
                    style={{
                      background: `${color}15`,
                      color,
                      border: `1px solid ${color}30`,
                      letterSpacing: '0.05em',
                    }}
                  >
                    {key}
                  </kbd>
                </div>
              ))}
            </div>

            <div className="px-5 pb-4">
              <p className="text-[9px] font-bold text-center" style={{ color: '#3f3f46' }}>
                Click anywhere outside to close
              </p>
            </div>
          </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPanel;
