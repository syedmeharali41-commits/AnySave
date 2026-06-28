const { app, BrowserWindow, ipcMain, dialog, Tray, Menu, Notification, clipboard, nativeImage, shell, powerSaveBlocker, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');
const { autoUpdater } = require('electron-updater');
const express = require('express');
const cors = require('cors');

// ── Minimal Store Implementation (Avoids ESM electron-store issues) ──
const settingsPath = path.join(app.getPath('userData'), 'settings.json');
const historyPath = path.join(app.getPath('userData'), 'history.json');

const store = {
    get: (key, def) => {
        try {
            const data = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            return data[key] !== undefined ? data[key] : def;
        } catch { return def; }
    },
        set: (key, val) => {
            try {
                let data = {};
                try { data = JSON.parse(fs.readFileSync(settingsPath, 'utf8')); } catch {}
                data[key] = val;
                const tempPath = settingsPath + '.tmp';
                fs.writeFileSync(tempPath, JSON.stringify(data, null, 2));
                fs.renameSync(tempPath, settingsPath);
            } catch (e) { console.error('Store save failed', e); }
        }
};

const historyStore = {
    get: () => {
        try { return JSON.parse(fs.readFileSync(historyPath, 'utf8')); }
        catch { return []; }
    },
    set: (data) => {
        try { 
            const tempPath = historyPath + '.tmp';
            fs.writeFileSync(tempPath, JSON.stringify(data, null, 2)); 
            fs.renameSync(tempPath, historyPath);
        } catch {}
    }
};


let mainWindow = null;
let tray = null;
const activeProcesses = new Map();
let sleepBlockerId = null; // FEATURE-18: system sleep prevention

function updateSleepBlocker() {
    // Block sleep when any download is active; unblock when idle
    if (activeProcesses.size > 0 && sleepBlockerId === null) {
        sleepBlockerId = powerSaveBlocker.start('prevent-app-suspension');
        console.log('[AnySave] Sleep prevention: ON');
    } else if (activeProcesses.size === 0 && sleepBlockerId !== null) {
        powerSaveBlocker.stop(sleepBlockerId);
        sleepBlockerId = null;
        console.log('[AnySave] Sleep prevention: OFF');
    }
}

// ─────────────────────────────────────────────
// WINDOW CREATION
// ─────────────────────────────────────────────
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        resizable: false,
        maximizable: false,
        minimizable: true,
        frame: false,
        backgroundColor: '#050508',
        icon: path.join(__dirname, 'logo.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            webSecurity: true,
        },
    });

    // Only open DevTools in dev mode
    if (process.env.NODE_ENV !== 'production' && process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }
    
    if (app.isPackaged) {
        mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
    } else {
        let retryCount = 0;
        const maxRetries = 20; // ~30 seconds

        const tryLoad = () => {
            if (!mainWindow) return;
            mainWindow.loadURL('http://localhost:5173').catch(() => {
                retryCount++;
                if (retryCount >= maxRetries) {
                    dialog.showMessageBox(mainWindow, {
                        type: 'error',
                        title: 'Dev Server Not Found',
                        message: 'The Vite development server (localhost:5173) is not responding.\n\nPlease make sure to run "npm start" and wait for Vite to finish starting.',
                        buttons: ['Retry', 'Quit']
                    }).then(({ response }) => {
                        if (response === 0) {
                            retryCount = 0;
                            tryLoad();
                        } else {
                            app.quit();
                        }
                    });
                } else {
                    setTimeout(tryLoad, 1500);
                }
            });
        };
        tryLoad();
    }
    mainWindow.on('close', (e) => {
        const settings = store.get('settings', {});
        if (settings.minimizeToTray && tray && !app.isQuitting) {
            e.preventDefault();
            mainWindow.hide();
        }
    });
}

// ─────────────────────────────────────────────
// SYSTEM TRAY
// ─────────────────────────────────────────────
function createTray() {
    const iconPath = path.join(__dirname, 'logo.ico');
    let icon;
    try {
        icon = nativeImage.createFromPath(iconPath);
        if (icon.isEmpty()) icon = nativeImage.createEmpty();
    } catch {
        icon = nativeImage.createEmpty();
    }

    tray = new Tray(icon);
    tray.setToolTip('AnySave Advanced');

    const buildContextMenu = () => {
        return Menu.buildFromTemplate([
            { label: 'Show AnySave', click: () => { mainWindow?.show(); mainWindow?.focus(); } },
            { type: 'separator' },
            {
                label: 'Pause All Downloads',
                click: () => { mainWindow?.webContents.send('tray-pause-all'); }
            },
            {
                label: 'Resume All Downloads',
                click: () => { mainWindow?.webContents.send('tray-resume-all'); }
            },
            { type: 'separator' },
            {
                label: 'Open Downloads Folder',
                click: () => {
                    const s = store.get('settings', {});
                    if (s.outputPath) shell.openPath(s.outputPath);
                }
            },
            { type: 'separator' },
            {
                label: `Active Downloads: ${activeProcesses.size}`,
                enabled: false
            },
            { type: 'separator' },
            { label: 'Quit AnySave', click: () => { app.isQuitting = true; app.quit(); } },
        ]);
    };

    tray.setContextMenu(buildContextMenu());
    
    // Rebuild context menu on right-click to get fresh active downloads count
    tray.on('right-click', () => {
        tray.setContextMenu(buildContextMenu());
    });
    
    // Also show/focus on single left click
    tray.on('click', () => {
        mainWindow?.show();
        mainWindow?.focus();
    });
}

// ─────────────────────────────────────────────
// IPC: UTILITY
// ─────────────────────────────────────────────
ipcMain.on('join-paths', (event, parts) => {
    event.returnValue = path.join(...parts);
});

// ─────────────────────────────────────────────
// CLIPBOARD AUTO-DETECTION
// ─────────────────────────────────────────────
const PLATFORM_REGEXES = [
    { name: 'YouTube',     regex: /youtube\.com\/(watch|shorts|playlist)|youtu\.be\// },
    { name: 'Instagram',   regex: /instagram\.com\/(p|reel|reels|stories|tv)\// },
    { name: 'TikTok',     regex: /tiktok\.com|vt\.tiktok\.com/ },
    { name: 'Twitter/X',  regex: /twitter\.com\/\w+\/status|x\.com\/\w+\/status/ },
    { name: 'Facebook',   regex: /facebook\.com\/(watch|video|reel)|fb\.watch/ },
    { name: 'Reddit',     regex: /reddit\.com\/r\/\w+\/comments|v\.redd\.it/ },
    { name: 'Vimeo',      regex: /vimeo\.com\/\d+/ },
    { name: 'Twitch',     regex: /twitch\.tv\/(videos|clips|\.+\/clip)/ },
    { name: 'Dailymotion',regex: /dailymotion\.com\/video/ },
    { name: 'SoundCloud', regex: /soundcloud\.com\/[\w-]+\/[\w-]+/ },
];

let lastClipboardText = '';

function checkClipboardForURL() {
    const s = store.get('settings', {});
    if (s.autoPasteClipboard === false) return;
    
    try {
        const text = clipboard.readText().trim();
        // Don't spam — only fire if text changed
        if (!text || text === lastClipboardText) return;
        for (const p of PLATFORM_REGEXES) {
            if (p.regex.test(text) && mainWindow) {
                lastClipboardText = text;
                mainWindow.webContents.send('clipboard-url', { url: text, platform: p.name });
                break;
            }
        }
    } catch {}
}

// ─────────────────────────────────────────────
// APP LIFECYCLE
// ─────────────────────────────────────────────
// ── yt-dlp.exe path resolver ─────────────────────────────────
function getYtdlpPath() {
    const exe = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
    if (app.isPackaged) return path.join(process.resourcesPath, 'bin', exe);
    return path.join(__dirname, 'bin', exe);
}

let ffmpegPath = null;
try {
    ffmpegPath = require('ffmpeg-static');
} catch (e) {
    console.log('[AnySave] ffmpeg-static not found, relying on system PATH.');
}

// ── Video/audio format strings ────────────────────────────────
// Each format uses a robust fallback chain:
//   1. Best separate video+audio streams at target resolution (any container)
//   2. Best combined format at target resolution
//   3. Overall best available
// Removing [ext=mp4]/[ext=m4a] constraints — they only exist on YouTube;
// other sites (Dailymotion, Facebook, etc.) use combined formats or different containers.
const FORMAT_MAP = {
    '8K':   'bestvideo[height<=4320]+bestaudio/bestvideo[height<=4320]/best[height<=4320]/best',
    '4K':   'bestvideo[height<=2160]+bestaudio/bestvideo[height<=2160]/best[height<=2160]/best',
    '1440': 'bestvideo[height<=1440]+bestaudio/bestvideo[height<=1440]/best[height<=1440]/best',
    '1080': 'bestvideo[height<=1080]+bestaudio/bestvideo[height<=1080]/best[height<=1080]/best',
    '720':  'bestvideo[height<=720]+bestaudio/bestvideo[height<=720]/best[height<=720]/best',
    '480':  'bestvideo[height<=480]+bestaudio/bestvideo[height<=480]/best[height<=480]/best',
    '360':  'bestvideo[height<=360]+bestaudio/bestvideo[height<=360]/best[height<=360]/best',
    'MP3':  'bestaudio/best',
    'AAC':  'bestaudio/best',
    'FLAC': 'bestaudio/best',
    'OPUS': 'bestaudio/best',
};

// ── Regex patterns for yt-dlp stdout/stderr parsing ──────────
const RE_PROGRESS = /\[download\]\s+([\d.]+)%\s+of\s+~?\s*([\d.]+\s*\S+)\s+at\s+([\d.]+\s*\S+\/s)\s+ETA\s+(\S+)/;
const RE_DEST     = /\[download\] Destination:\s+(.+)/;
const RE_MERGE    = /\[Merger\] Merging formats into "(.+)"/;
const RE_AUDIO    = /\[(?:ExtractAudio|MoveFiles)\] Destination:\s+(.+)/;
const RE_ERROR    = /ERROR:\s+(.+)/;
const RE_FFTIME   = /time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/;
const RE_FFSPEED  = /speed=\s*([\d.]+x)/;

// ── Progress value formatters ─────────────────────────────
function fmtSpeed(bps) {
    const n = parseFloat(bps);
    if (!n || isNaN(n)) return 'N/A';
    if (n >= 1073741824) return `${(n / 1073741824).toFixed(2)} GB/s`;
    if (n >= 1048576)    return `${(n / 1048576).toFixed(1)} MB/s`;
    if (n >= 1024)       return `${(n / 1024).toFixed(0)} KB/s`;
    return `${n.toFixed(0)} B/s`;
}
function fmtEta(sec) {
    const s = parseInt(sec);
    if (isNaN(s) || sec === 'None' || sec === null || sec === undefined) return 'N/A';
    if (s <= 0)   return '—'; // nearly done or done
    if (s >= 3600) return `${Math.floor(s/3600)}:${String(Math.floor((s%3600)/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
    return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
}
function fmtBytes(b) {
    const n = parseFloat(b);
    if (!n || isNaN(n)) return '?';
    if (n >= 1073741824) return `${(n / 1073741824).toFixed(2)} GB`;
    if (n >= 1048576)    return `${(n / 1048576).toFixed(1)} MB`;
    if (n >= 1024)       return `${(n / 1024).toFixed(0)} KB`;
    return `${n.toFixed(0)} B`;
}

// ── Kill process properly on Windows (kills entire child tree) ──
function killProc(proc) {
    if (!proc) return;
    if (process.platform === 'win32' && proc.pid) {
        // taskkill /F /T kills the process AND all its children (ffmpeg, etc.)
        try { require('child_process').execSync(`taskkill /PID ${proc.pid} /T /F`, { windowsHide: true }); } catch {}
    } else {
        try { proc.kill('SIGKILL'); } catch {}
    }
}

// ── Quality parser (replaces playlist_fetch.py logic in JS) ──
function getAvailableQualities(formats, duration) {
    const qi = {};
    for (const f of (formats || [])) {
        const vc = f.vcodec || 'none', ac = f.acodec || 'none';
        let fs = f.filesize || f.filesize_approx || 0;
        if (!fs && duration) { const tbr = f.tbr || f.vbr || f.abr; if (tbr) fs = Math.floor(tbr * 1000 / 8) * duration; }
        if (vc !== 'none' && f.height) {
            let q = f.height >= 4320 ? '8K' : f.height >= 2160 ? '4K' : f.height >= 1440 ? '1440' : f.height >= 1080 ? '1080' : f.height >= 720 ? '720' : f.height >= 480 ? '480' : f.height >= 360 ? '360' : null;
            if (q && (!qi[q] || fs > qi[q].bytes)) qi[q] = { id: q, bytes: fs };
        }
        if (ac !== 'none' && vc === 'none') {
            const q = f.ext === 'm4a' ? 'AAC' : f.ext === 'mp3' ? 'MP3' : f.ext === 'flac' ? 'FLAC' : ['webm','weba','opus'].includes(f.ext) ? 'OPUS' : 'MP3';
            if (!qi[q] || fs > qi[q].bytes) qi[q] = { id: q, bytes: fs };
        }
    }
    let bestAb = 0;
    for (const f of (formats || [])) {
        if (f.acodec && f.acodec !== 'none' && (!f.vcodec || f.vcodec === 'none')) {
            let fs = f.filesize || f.filesize_approx || 0;
            if (!fs && duration) { const a = f.abr || f.tbr || 0; if (a) fs = Math.floor(a * 1000 / 8) * duration; }
            if (fs > bestAb) bestAb = fs;
        }
    }
    if ((formats || []).some(f => f.acodec && f.acodec !== 'none')) {
        for (const [q, kbps] of Object.entries({ MP3:320, AAC:256, FLAC:1411, OPUS:160 })) {
            if (!qi[q]) { let e = duration ? Math.floor(kbps*1000/8)*duration : bestAb ? Math.floor(bestAb*kbps/128) : 0; qi[q] = { id:q, bytes:e }; }
        }
    }
    const sz = b => { if (!b) return 'Unknown Size'; const mb = b/1048576; return mb >= 1024 ? `${(mb/1024).toFixed(2)} GB` : `${mb.toFixed(2)} MB`; };
    return ['8K','4K','1440','1080','720','480','360','FLAC','MP3','AAC','OPUS'].filter(q => qi[q]).map(q => ({ id:q, size:sz(qi[q].bytes), bytes:qi[q].bytes }));
}

// ── Platform name resolver (replaces playlist_fetch.py logic) ─
function getPlatform(extractor) {
    if (!extractor) return 'Unknown';
    const ex = extractor.toLowerCase();
    if (ex.includes('youtube'))    return 'YouTube';
    if (ex.includes('instagram'))  return 'Instagram';
    if (ex.includes('tiktok'))     return 'TikTok';
    if (ex.includes('twitter') || ex.includes('x.com')) return 'Twitter/X';
    if (ex.includes('facebook'))   return 'Facebook';
    if (ex.includes('vimeo'))      return 'Vimeo';
    if (ex.includes('dailymotion')) return 'Dailymotion';
    if (ex.includes('soundcloud')) return 'SoundCloud';
    if (ex.includes('twitch'))     return 'Twitch';
    if (ex.includes('reddit'))     return 'Reddit';
    return 'Web';
}

// Fix Windows Notification Header (electron.app.Electron)
if (process.platform === 'win32') {
    app.setAppUserModelId('AnySave');
}

app.whenReady().then(() => {
    createWindow();
    createTray();

    // ── Auto-update yt-dlp.exe on startup (no Python needed) ──
    const ytdlpExe = getYtdlpPath();
    if (!fs.existsSync(ytdlpExe)) {
        console.warn('[AnySave] yt-dlp.exe not found at:', ytdlpExe);
        mainWindow?.webContents.once('did-finish-load', () => {
            mainWindow?.webContents.send('ytdlp-status', { status: 'error' });
            mainWindow?.webContents.send('toast', {
                type: 'error', title: 'yt-dlp Missing',
                message: 'yt-dlp.exe not found in bin/ folder. Download from github.com/yt-dlp/yt-dlp'
            });
        });
    } else {
        mainWindow?.webContents.once('did-finish-load', () => {
            mainWindow?.webContents.send('ytdlp-status', { status: 'updating' });
        });
        const upgradeProcess = spawn(ytdlpExe, ['-U']);
        let upgradeOut = '';
        upgradeProcess.stdout.on('data', d => { upgradeOut += d.toString(); });
        upgradeProcess.stderr.on('data', d => { upgradeOut += d.toString(); });
        upgradeProcess.on('error', err => {
            console.error('[AnySave] yt-dlp -U error:', err.message);
            mainWindow?.webContents.send('ytdlp-status', { status: 'error' });
        });
        upgradeProcess.on('close', code => {
            console.log('[AnySave] yt-dlp update:', upgradeOut.trim().split('\n').pop());
            mainWindow?.webContents.send('ytdlp-status', { status: code === 0 ? 'done' : 'error' });
        });
    }



    mainWindow.webContents.once('did-finish-load', () => {
        checkClipboardForURL();
    });

    mainWindow.on('focus', () => {
        checkClipboardForURL();
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });

    // ── One-Click Self-Update ──────────────────────
    autoUpdater.checkForUpdatesAndNotify();

    autoUpdater.on('update-available', () => {
        mainWindow?.webContents.send('toast', { type: 'info', title: 'Update Available', message: 'Downloading new version...' });
    });
    
    autoUpdater.on('update-downloaded', () => {
        mainWindow?.webContents.send('toast', { type: 'success', title: 'Update Ready', message: 'Restart app to install.' });
        // Optionally prompt user to install now
    });

    // ── Remote Queue Management (Express Server) ───
    const settings = store.get('settings', {});
    if (settings.enableRemoteQueue) {
        try {
            const expressApp = express();
            expressApp.use(cors({ origin: '127.0.0.1' }));
            expressApp.use(express.json());

            // Retrieve or generate a persistent secret token for auth
            let remoteToken = store.get('remoteToken');
            if (!remoteToken) {
                remoteToken = require('crypto').randomBytes(16).toString('hex');
                store.set('remoteToken', remoteToken);
            }
            console.log(`[Remote API] Secret token: ${remoteToken}`);
            mainWindow?.webContents.once('did-finish-load', () => {
                mainWindow?.webContents.send('toast', {
                    type: 'info',
                    title: 'Remote API Active',
                    message: `Token: ${remoteToken} (see console)`
                });
            });

            // Auth middleware — require X-OmniSave-Token header
            const requireAuth = (req, res, next) => {
                if (req.headers['x-anysave-token'] !== remoteToken) {
                    return res.status(401).json({ success: false, message: 'Unauthorized' });
                }
                next();
            };

            expressApp.post('/api/add-url', requireAuth, (req, res) => {
                const { url } = req.body;
                if (url && mainWindow) {
                    mainWindow.webContents.send('clipboard-url', { url, platform: 'Remote' });
                    res.json({ success: true, message: 'URL sent to AnySave queue' });
                } else {
                    res.status(400).json({ success: false, message: 'URL missing or app not ready' });
                }
            });

            expressApp.get('/api/status', requireAuth, (req, res) => {
                res.json({ 
                    status: 'running', 
                    activeDownloads: activeProcesses.size,
                    version: app.getVersion()
                });
            });

            // Try port 9090, fallback to 9091, then 9092
            const tryListen = (port) => {
                const server = expressApp.listen(port, '127.0.0.1', () => {
                    console.log(`Remote Queue API listening on 127.0.0.1:${port}`);
                });
                server.on('error', (err) => {
                    if (err.code === 'EADDRINUSE' && port < 9093) {
                        console.warn(`Port ${port} in use, trying ${port + 1}...`);
                        tryListen(port + 1);
                    } else {
                        console.error('Remote Queue server failed:', err.message);
                        mainWindow?.webContents.send('toast', {
                            type: 'error',
                            title: 'Remote API Failed',
                            message: `Port ${port} already in use. Disable Remote API in settings.`
                        });
                    }
                });
            };
            tryListen(9090);
        } catch (err) {
            console.error('Failed to start Remote Queue server:', err);
        }
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
    for (const [id, proc] of activeProcesses.entries()) {
        try { proc.kill(); } catch {}
    }
});

// ─────────────────────────────────────────────
// IPC: DOWNLOAD LOGIC
// ─────────────────────────────────────────────
const cancelledProcesses = new Set();
const pendingDownloads = [];
const pausedDownloads = new Map(); // id -> options (for resume with --continue)

// Per-download retry state
const retryAttempts = new Map(); // id -> attempt count
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = [3000, 8000, 20000]; // exponential backoff

function killProc(proc) {
    if (!proc) return;
    if (process.platform === 'win32' && proc.pid) {
        // taskkill /F /T kills the process AND all its children (ffmpeg, etc.)
        try {
            require('child_process').execSync(`taskkill /PID ${proc.pid} /T /F`, { windowsHide: true });
        } catch (err) {
            try { proc.kill('SIGKILL'); } catch {}
        }
    } else {
        try { proc.kill('SIGKILL'); } catch {}
    }
}

function processQueue() {
    const settings = store.get('settings', {});
    const limit = settings.concurrentDownloads || 3;
    while (activeProcesses.size < limit && pendingDownloads.length > 0) {
        const nextJob = pendingDownloads.shift();
        spawnDownload(nextJob);
    }
}

ipcMain.on('start-download', (event, options) => {
    // If it's already running or pending, ignore
    if (activeProcesses.has(options.id) || pendingDownloads.some(p => p.id === options.id)) return;
    
    pendingDownloads.push(options);
    processQueue();
});

function spawnDownload(options) {
    const { id, url, platform, quality, format, outputPath, subtitles, thumbnail, embedMeta,
            rateLimit, proxy, proxyUser, proxyPass, cookieBrowser, customFormat, timeRange,
            smartDeduplication, excludeShorts, fragmentThreads, sponsorblock, sponsorblockCategories,
            execCmd, outputTemplate, playlistFilter, generateM3u, continueDownload, audioBitrate,
            finalOutputPath: existingFinalPath,
            // yt-dlp power settings (batch 1)
            mergeOutputFormat, defaultAudioBitrate, subtitleFormat, preferFreeFormats,
            writeThumbnail, writeDescription, writeInfoJson, noOverwrite,
            geoBypass, geoBypassCountry, sleepInterval, minDuration, maxDuration,
            // yt-dlp power settings (batch 2)
            playlistStart, playlistEnd, splitChapters,
            ageLimit, videoPassword,
            liveFromStart, writeComments } = options;

    // Build organised output folder: [chosen path]/OmniSave/[Platform]/[date optional]
    const settings = store.get('settings', {});
    const safePlatform = (platform || 'Other').replace(/[^a-zA-Z0-9_-]/g, '') || 'Other';
    let finalOutputPath = existingFinalPath || path.join(outputPath, 'AnySave', safePlatform);
    if (!existingFinalPath && settings.dateSubfolders) {
        const now = new Date();
        const fmt = (settings.dateFormat || 'YYYY-MM')
            .replace('YYYY', now.getFullYear())
            .replace('MM', String(now.getMonth()+1).padStart(2,'0'))
            .replace('DD', String(now.getDate()).padStart(2,'0'));
        finalOutputPath = path.join(finalOutputPath, ...fmt.split('/').filter(Boolean));
        options.finalOutputPath = finalOutputPath;
    }
    try { fs.mkdirSync(finalOutputPath, { recursive: true }); }
    catch (e) { console.error('[AnySave] mkdir failed:', e.message); finalOutputPath = outputPath; }

    // Build proxy string with auth
    let finalProxy = proxy;
    if (proxy && proxyUser) {
        try {
            const pu = new URL(proxy);
            pu.username = proxyUser;
            if (proxyPass) pu.password = proxyPass;
            finalProxy = pu.toString();
        } catch { finalProxy = proxy; }
    }

    // ── Detect browser cookie for auth ─────────────────────────────────────
    // Only use cookies if explicitly configured by user in Settings.
    // Auto-chrome was removed: it locks when Chrome is running (yt-dlp issue #7271).
    // If _stripCookies is set (from cookie-lock retry), force no cookies.
    const autoBrowser = options._stripCookies ? '' : (settings.cookieBrowser || '');
    const finalBrowser = options._stripCookies ? '' : (cookieBrowser || autoBrowser);

    // ── Build yt-dlp argument list ──────────────────────────────
    const isAudioQuality = ['MP3','AAC','FLAC','OPUS'].includes(quality);
    const tmpl = outputTemplate || '%(title)s.%(ext)s';
    const ytdlpPath = getYtdlpPath();

    const args = [
        url,
        // Format: use explicit map or universal best fallback
        '--format',  customFormat || FORMAT_MAP[quality] || 'bestvideo+bestaudio/best',
        // Sort by resolution, fps, bitrate — no codec preference that may break non-YouTube sites
        '--format-sort', 'res,fps,br',
        '--output',  path.join(finalOutputPath, tmpl),
        // Progress via structured template: PROG|dl|totalActual|totalEstimate|speed|eta
        '--progress-template', 'download:PROG|%(progress.downloaded_bytes)s|%(progress.total_bytes)s|%(progress.total_bytes_estimate)s|%(progress.speed)s|%(progress.eta)s',
        '--newline',            // flush each progress line
        '--no-colors',          // no ANSI codes
        '--ignore-errors',      // skip unavailable entries instead of crashing
        '--restrict-filenames',
        '--windows-filenames',
        // Fragment & retry settings
        '--concurrent-fragments', String(Math.max(fragmentThreads || 4, 1)),
        '--fragment-retries',  '10',    // retry each fragment up to 10x
        '--retries',           '10',    // retry entire download 10x
        '--file-access-retries', '5',   // retry file access (useful on Windows)
        '--socket-timeout',    '30',
        // NOTE: --http-chunk-size removed — breaks sites that don't support HTTP range requests
        // HLS: always use MPEG-TS container for live/hls streams
        '--hls-use-mpegts',
        '--continue',
    ];

    // Browser cookies (only if explicitly configured and not stripped)
    if (finalBrowser) args.push('--cookies-from-browser', finalBrowser);

    // FFmpeg location
    if (ffmpegPath) {
        const ffLoc = ffmpegPath.replace(/app\.asar/g, 'app.asar.unpacked');
        args.push('--ffmpeg-location', ffLoc);
    }

    // Merge to configured container format for video downloads
    if (!isAudioQuality) {
        const container = mergeOutputFormat || settings.mergeOutputFormat || 'mp4';
        if (container !== 'auto') args.push('--merge-output-format', container);
    }

    // Audio extraction
    if (isAudioQuality) {
        args.push('--extract-audio');
        const codec = quality.toLowerCase();
        args.push('--audio-format', codec);
        const bitrate = audioBitrate || defaultAudioBitrate || settings.defaultAudioBitrate || '320';
        if (quality !== 'FLAC') args.push('--audio-quality', String(bitrate) + 'K');
    }

    // Subtitles
    if (subtitles) {
        args.push('--write-subs', '--write-auto-subs', '--embed-subs');
        args.push('--sub-langs', subtitles.toLowerCase() === 'all' ? 'all' : subtitles);
        const subFmt = subtitleFormat || settings.subtitleFormat || 'srt';
        args.push('--convert-subs', subFmt);
    }

    // Thumbnail embed (user setting from download item)
    if (thumbnail) {
        args.push('--convert-thumbnails', 'jpg');
        if (embedMeta) args.push('--embed-thumbnail');
    }

    // Write thumbnail as separate file (global setting)
    if (writeThumbnail || settings.writeThumbnail) args.push('--write-thumbnail', '--convert-thumbnails', 'jpg');

    // Write description / info JSON (global settings)
    if (writeDescription || settings.writeDescription) args.push('--write-description');
    if (writeInfoJson    || settings.writeInfoJson)    args.push('--write-info-json');

    // No overwrite
    if (noOverwrite || settings.noOverwrite) args.push('--no-overwrites');

    // Geo-bypass
    if (geoBypass || settings.geoBypass) {
        args.push('--geo-bypass');
        const country = geoBypassCountry || settings.geoBypassCountry;
        if (country && country.length === 2) args.push('--geo-bypass-country', country.toUpperCase());
    }

    // Sleep interval between downloads (polite mode)
    const sleep = sleepInterval ?? settings.sleepInterval ?? 0;
    if (sleep > 0) args.push('--sleep-interval', String(sleep), '--max-sleep-interval', String(sleep * 3));

    // Prefer free codecs (VP9/AV1 over H.264)
    if (preferFreeFormats || settings.preferFreeFormats) args.push('--prefer-free-formats');

    // Duration filter (min/max seconds)
    const minDur = parseInt(minDuration ?? settings.minDuration ?? 0);
    const maxDur = parseInt(maxDuration ?? settings.maxDuration ?? 0);
    const durFilters = [];
    if (minDur > 0) durFilters.push(`duration>=${minDur}`);
    if (maxDur > 0) durFilters.push(`duration<=${maxDur}`);
    if (durFilters.length) args.push('--match-filter', durFilters.join('&'));

    // Metadata — safe for all sites
    if (embedMeta) args.push('--embed-metadata');

    // Rate limit
    if (rateLimit && rateLimit !== 'unlimited') args.push('--limit-rate', rateLimit);

    // Proxy
    if (finalProxy) args.push('--proxy', finalProxy);

    // Time range: "start-end" → --download-sections "*start-end"
    if (timeRange) args.push('--download-sections', `*${timeRange.replace(/\s/g, '')}`);

    // Smart deduplication (download archive)
    if (smartDeduplication) args.push('--download-archive', path.join(finalOutputPath, 'anysave_archive.txt'));

    // ── Consolidated --match-filter (yt-dlp only accepts one) ──────
    // Merge: excludeShorts, min/max duration, playlist keyword into one expression
    const matchFilters = [];
    if (excludeShorts) matchFilters.push('duration>60');
    if (minDur > 0)    matchFilters.push(`duration>=${minDur}`);
    if (maxDur > 0)    matchFilters.push(`duration<=${maxDur}`);
    if (playlistFilter && playlistFilter.trim()) matchFilters.push(`title~=${playlistFilter.trim()}`);
    if (matchFilters.length) args.push('--match-filter', matchFilters.join('&'));

    // SponsorBlock
    if (sponsorblock) {
        const cats = (sponsorblockCategories && sponsorblockCategories.length)
            ? sponsorblockCategories.join(',') : 'sponsor,intro,outro,selfpromo,interaction';
        args.push('--sponsorblock-remove', cats);
    }

    // Post-exec command
    if (execCmd) args.push('--exec', execCmd);

    // ── Playlist controls ────────────────────────────
    const pStart = parseInt(playlistStart ?? settings.playlistStart ?? 0);
    const pEnd   = parseInt(playlistEnd   ?? settings.playlistEnd   ?? 0);
    if (pStart > 1 || pEnd > 0) {
        // User wants a specific range → allow playlist, restrict to range
        if (pStart > 1) args.push('--playlist-start', String(pStart));
        if (pEnd   > 0) args.push('--playlist-end',   String(pEnd));
    } else {
        // No range set → lock to single video (don't accidentally download whole playlist)
        args.push('--no-playlist');
    }

    // Split by chapters (each chapter = separate file)
    if (splitChapters || settings.splitChapters) args.push('--split-chapters');

    // Age limit bypass (e.g. 18 bypasses age-gate)
    const ageLimitVal = parseInt(ageLimit ?? settings.ageLimit ?? 0);
    if (ageLimitVal > 0) args.push('--age-limit', String(ageLimitVal));

    // Video password (password-protected videos/channels)
    const vPass = videoPassword || settings.videoPassword || '';
    if (vPass) args.push('--video-password', vPass);

    // Live stream: record from actual start
    if (liveFromStart || settings.liveFromStart) args.push('--live-from-start');

    // Write comments (YouTube)
    if (writeComments || settings.writeComments) args.push('--write-comments');

    // ── Spawn yt-dlp.exe ──────────────────────────────────────
    const ytProc = spawn(ytdlpPath, args);
    ytProc._options = options;
    activeProcesses.set(id, ytProc);
    updateSleepBlocker();

    ytProc.on('error', err => {
        console.error('[AnySave] Failed to start yt-dlp:', err.message);
        mainWindow?.webContents.send('download-error', { id, message: `yt-dlp launch failed: ${err.message}` });
        activeProcesses.delete(id);
        updateSleepBlocker();
    });

    // ── Duration for ffmpeg progress calculation ───────────────
    let durationSec = 0;
    if (timeRange) {
        const parts = timeRange.split(/[-\u2013\u2014]/).map(p => p.trim());
        const parseT = s => { if (!s) return 0; return s.split(':').reduce((a,v) => a*60 + parseFloat(v||0), 0); };
        const start = parseT(parts[0]), end = parts[1] ? parseT(parts[1]) : 0;
        if (end > start) durationSec = end - start;
    }

    let lastFilename = '';
    const m3uFiles = [];

    // ── Parse stdout: structured progress + info messages ─────
    let outBuf = '';
    let totalBytes = 0;
    ytProc.stdout.on('data', data => {
        if (cancelledProcesses.has(id)) return;
        outBuf += data.toString();
        const lines = outBuf.split(/[\r\n]+/);
        outBuf = lines.pop();
        for (const line of lines) {
            const t = line.trim();
            if (!t) continue;

            // ── Structured progress template output ──────────────
            // Format: PROG|downloaded|totalActual|totalEstimate|speed|eta
            if (t.startsWith('PROG|')) {
                const parts       = t.split('|');
                const dl          = parseFloat(parts[1]) || 0;
                const totalActual = parseFloat(parts[2]);  // NaN when 'None'
                const totalEst    = parseFloat(parts[3]);  // NaN when 'None'
                // Use actual total first, then estimate, then last known — never fall back to 1
                const total = !isNaN(totalActual) && totalActual > 0 ? totalActual
                            : !isNaN(totalEst)    && totalEst > 0    ? totalEst
                            : totalBytes;                             // 0 = truly unknown
                if (total > 0) totalBytes = total;
                // -1 = indeterminate (total unknown); capped 99.9% when known
                const pct = total > 0 ? Math.min((dl / total) * 100, 99.9) : -1;
                mainWindow?.webContents.send('download-progress', {
                    id, status: 'downloading',
                    percent:          parseFloat(pct.toFixed(1)),
                    speed:            fmtSpeed(parts[4]),
                    eta:              fmtEta(parts[5]),
                    downloaded_bytes: dl,
                    total_bytes:      total, // 0 = unknown, frontend shows indeterminate
                    filename:         path.basename(lastFilename)
                });
                continue;
            }

            // ── Fallback: legacy [download] progress line ─────────
            const pm = t.match(RE_PROGRESS);
            if (pm) {
                mainWindow?.webContents.send('download-progress', {
                    id, status: 'downloading',
                    percent: parseFloat(pm[1]),
                    speed: pm[3], eta: pm[4],
                    filename: path.basename(lastFilename)
                });
                continue;
            }

            // Destination file
            const dm = t.match(RE_DEST);
            if (dm) { lastFilename = dm[1].trim(); if (generateM3u) m3uFiles.push(lastFilename); continue; }
            const mm = t.match(RE_MERGE);
            if (mm) { lastFilename = mm[1].trim(); continue; }
            const am = t.match(RE_AUDIO);
            if (am) { lastFilename = am[1].trim(); continue; }

            // Post-processing notification
            if (t.includes('[FFmpegExtractAudio]') || t.includes('[Merger]') || t.includes('[ffmpeg]') ||
                t.includes('[EmbedThumbnail]') || t.includes('[MetadataFromField]')) {
                mainWindow?.webContents.send('download-progress', {
                    id, status: 'converting', percent: 99,
                    filename: path.basename(lastFilename)
                });
            }
        }
    });

    // ── Parse stderr: ffmpeg progress + errors ────────────────
    let errBuf = '';
    ytProc.stderr.on('data', data => {
        if (cancelledProcesses.has(id)) return;
        errBuf += data.toString();
        const lines = errBuf.split(/[\r\n]+/);
        errBuf = lines.pop();
        for (const line of lines) {
            const t = line.trim();
            if (!t) continue;
            console.error('[yt-dlp]', t);

            // Fallback progress from stderr
            const pm = t.match(RE_PROGRESS);
            if (pm) {
                mainWindow?.webContents.send('download-progress', {
                    id, status: 'downloading',
                    percent: parseFloat(pm[1]), speed: pm[3], eta: pm[4]
                });
                continue;
            }
            const dm = t.match(RE_DEST); if (dm) { lastFilename = dm[1].trim(); continue; }
            const mm = t.match(RE_MERGE); if (mm) { lastFilename = mm[1].trim(); continue; }
            const am = t.match(RE_AUDIO); if (am) { lastFilename = am[1].trim(); continue; }

            // FFmpeg time-based progress (for time-range/conversion)
            const tm = t.match(RE_FFTIME);
            if (tm && durationSec > 0) {
                const cur = parseInt(tm[1])*3600 + parseInt(tm[2])*60 + parseFloat(tm[3]);
                const sm = t.match(RE_FFSPEED);
                mainWindow?.webContents.send('download-progress', {
                    id, status: 'converting',
                    percent: Math.min((cur/durationSec)*100, 99),
                    speed: sm ? sm[1] : 'N/A'
                });
                continue;
            }

            // Chrome cookie DB locked — user has Chrome open
            if (t.includes('Could not copy') && t.includes('cookie')) {
                console.warn('[yt-dlp] Chrome cookie DB locked — will retry without cookies');
                // Mark so close handler knows to strip cookies on retry
                ytProc._cookieLocked = true;
                continue;
            }

            // Auth/sign-in error — helpful message
            if (t.includes('Please sign in') || t.includes('Sign in to confirm')) {
                mainWindow?.webContents.send('download-error', {
                    id, message: 'YouTube login required. Set Cookie Browser in Settings (Chrome/Firefox).'
                });
                continue;
            }

            // General errors
            const em = t.match(RE_ERROR);
            if (em) mainWindow?.webContents.send('download-error', { id, message: em[1] });
        }
    });

    // ── Process close handler ──────────────────────────────────
    ytProc.on('close', code => {
        activeProcesses.delete(id);
        updateSleepBlocker();

        if (cancelledProcesses.has(id)) {
            cancelledProcesses.delete(id);
            retryAttempts.delete(id);
            return;
        }

        if (code !== 0 && code !== null) {
            // ── Smart error recovery ────────────────────────────────
            // Chrome cookie DB locked: retry immediately without cookies (no delay)
            if (ytProc._cookieLocked ||
                errBuf.includes('Could not copy Chrome cookie database') ||
                errBuf.includes('Could not copy Firefox cookie')) {

                retryAttempts.delete(id);
                const noCookieOpts = { ...options, cookieBrowser: '' };
                // Save patched options so resume also works without cookies
                noCookieOpts._stripCookies = true;

                mainWindow?.webContents.send('toast', {
                    type: 'warning',
                    title: 'Browser Cookie Locked',
                    message: 'Chrome is open and cookies are locked. Retrying without cookies. Close Chrome for full auth support.'
                });
                console.warn('[AnySave] Cookie DB locked — retrying without --cookies-from-browser');
                pendingDownloads.push(noCookieOpts);
                processQueue();
                return;
            }

            const attempt = (retryAttempts.get(id) || 0) + 1;
            retryAttempts.set(id, attempt);
            if (attempt <= MAX_RETRIES) {
                const delay = RETRY_DELAY_MS[attempt-1] || 20000;
                console.log(`[Retry] ${id} failed (code ${code}), retry ${attempt}/${MAX_RETRIES} in ${delay}ms`);
                mainWindow?.webContents.send('download-retry', { id, attempt, total: MAX_RETRIES, delay });
                setTimeout(() => {
                    if (!cancelledProcesses.has(id)) { pendingDownloads.push(options); processQueue(); }
                }, delay);
            } else {
                retryAttempts.delete(id);
                const msg = errBuf.trim().split('\n').pop() || `Process exited (code ${code}) after ${MAX_RETRIES} retries`;
                mainWindow?.webContents.send('download-error', { id, message: msg });
            }
        } else {
            retryAttempts.delete(id);

            // Generate .m3u playlist file if requested
            if (generateM3u && m3uFiles.length > 0) {
                const m3uPath = path.join(finalOutputPath, 'playlist.m3u');
                try {
                    const m3uContent = '#EXTM3U\n' + m3uFiles.map(f => `#EXTINF:-1,${path.basename(f)}\n${f}`).join('\n');
                    fs.writeFileSync(m3uPath, m3uContent, 'utf-8');
                } catch (e) { console.error('[AnySave] m3u write failed:', e.message); }
            }

            mainWindow?.webContents.send('download-finished', { id, filename: lastFilename });

            if (Notification.isSupported()) {
                const cleanName = lastFilename ? path.parse(lastFilename).name.replace(/_/g, ' ') : 'Video file';
                const notif = new Notification({
                    title: '\u2705 Download Successful',
                    body: `${cleanName}\nClick to open folder.`,
                    icon: path.join(__dirname, 'logo.ico')
                });
                notif.on('click', () => {
                    if (lastFilename && fs.existsSync(lastFilename)) shell.showItemInFolder(lastFilename);
                    else shell.openPath(outputPath);
                });
                notif.show();
            }
        }
        processQueue();
    });
}

// Pause = kill process tree (yt-dlp + ffmpeg children), resume uses --continue
ipcMain.on('pause-download', (event, { id }) => {
    // Check if in queue (not yet started)
    const queueIdx = pendingDownloads.findIndex(p => p.id === id);
    if (queueIdx !== -1) {
        // Just remove from queue and mark paused
        const [opts] = pendingDownloads.splice(queueIdx, 1);
        pausedDownloads.set(id, opts);
        mainWindow?.webContents.send('download-paused', { id });
        return;
    }

    const proc = activeProcesses.get(id);
    if (proc) {
        // Save options for resume
        const queueOpts = proc._options;
        if (queueOpts) pausedDownloads.set(id, { ...queueOpts, continueDownload: true });

        // Mark as intentional stop (prevents auto-retry)
        cancelledProcesses.add(id);

        // Kill entire process tree (yt-dlp + spawned ffmpeg)
        killProc(proc);

        // Cleanup — close handler will also delete but that's idempotent
        activeProcesses.delete(id);
        updateSleepBlocker();
        mainWindow?.webContents.send('download-paused', { id });
        processQueue();
    }
});

// Resume = restart download with --continue flag (yt-dlp resumes partial files)
ipcMain.on('resume-download', (event, { id, options }) => {
    if (activeProcesses.has(id) || pendingDownloads.some(p => p.id === id)) return;

    let savedOptions = pausedDownloads.get(id);
    if (!savedOptions) {
        // Reconstruct options from frontend item and current settings (fixes resume after app restart)
        const s = store.get('settings', {});
        const AUDIO_QUALITIES = ['MP3', 'AAC', 'FLAC', 'OPUS'];
        const isAudio = AUDIO_QUALITIES.includes(options.quality || s.defaultQuality);
        savedOptions = {
            id: options.id,
            url: options.url,
            platform: options.platform || 'Other',
            quality: options.quality || s.defaultQuality,
            format: isAudio ? 'audio' : 'video',
            outputPath: s.outputPath || path.join(app.getPath('downloads'), 'AnySave'),
            subtitles: options.subtitles_override !== undefined ? options.subtitles_override : (s.subtitles ? (s.subLang || 'en') : null),
            thumbnail: options.thumbnail_override !== undefined ? options.thumbnail_override : s.embedThumbnail,
            embedMeta: options.embedMeta_override !== undefined ? options.embedMeta_override : s.embedMeta,
            rateLimit: s.rateLimit !== 'unlimited' ? s.rateLimit : null,
            proxy: s.proxy || null,
            proxyUser: s.proxyUser || null,
            proxyPass: s.proxyPass || null,
            cookieBrowser: s.cookieBrowser || null,
            customFormat: options.customFormat || null,
            timeRange: options.timeRange || null,
            smartDeduplication: s.smartDeduplication,
            excludeShorts: s.excludeShorts,
            fragmentThreads: s.fragmentThreads || 4,
            sponsorblock: s.sponsorblock,
            sponsorblockCategories: s.sponsorblockCategories || ['sponsor', 'intro', 'outro', 'selfpromo', 'interaction'],
            execCmd: options.execCmd || s.execCmd || null,
            outputTemplate: s.outputTemplate || '%(title)s.%(ext)s',
            playlistFilter: s.playlistFilter || null,
            generateM3u: s.generateM3u || false,
            audioBitrate: options.audioBitrate || null,
            // yt-dlp power settings (batch 1)
            mergeOutputFormat: s.mergeOutputFormat || 'mp4',
            defaultAudioBitrate: s.defaultAudioBitrate || '320',
            subtitleFormat: s.subtitleFormat || 'srt',
            preferFreeFormats: s.preferFreeFormats || false,
            writeThumbnail: s.writeThumbnail || false,
            writeDescription: s.writeDescription || false,
            writeInfoJson: s.writeInfoJson || false,
            noOverwrite: s.noOverwrite || false,
            geoBypass: s.geoBypass || false,
            geoBypassCountry: s.geoBypassCountry || '',
            sleepInterval: s.sleepInterval || 0,
            minDuration: s.minDuration || 0,
            maxDuration: s.maxDuration || 0,
            // yt-dlp power settings (batch 2)
            playlistStart: s.playlistStart || 0,
            playlistEnd: s.playlistEnd || 0,
            splitChapters: s.splitChapters || false,
            ageLimit: s.ageLimit || 0,
            videoPassword: s.videoPassword || '',
            liveFromStart: s.liveFromStart || false,
            writeComments: s.writeComments || false,
            continueDownload: true
        };
    }
    
    pausedDownloads.delete(id);
    cancelledProcesses.delete(id);
    
    // Mark as continuing so spawnDownload adds --continue
    const resumeOptions = { ...savedOptions, continueDownload: true };
    pendingDownloads.push(resumeOptions);
    processQueue();
});

ipcMain.on('cancel-download', (event, { id }) => {
    const pendingIdx = pendingDownloads.findIndex(p => p.id === id);
    if (pendingIdx !== -1) {
        pendingDownloads.splice(pendingIdx, 1);
        mainWindow?.webContents.send('download-cancelled', { id });
        return;
    }
    const proc = activeProcesses.get(id);
    if (proc) {
        cancelledProcesses.add(id);
        pausedDownloads.delete(id);
        killProc(proc); // kill full process tree
        activeProcesses.delete(id);
        updateSleepBlocker();
        mainWindow?.webContents.send('download-cancelled', { id });
    }
});

// ── fetch-info: replaces playlist_fetch.py ───────────────────────
ipcMain.handle('fetch-info', async (event, { url, proxy, cookieBrowser }) => {
    return new Promise((resolve) => {
        const ytdlp    = getYtdlpPath();
        const settings = store.get('settings', {});
        const browser  = cookieBrowser || settings.cookieBrowser || '';
        const isYT     = url.includes('youtube.com') || url.includes('youtu.be');

        // Build args with optional cookie browser
        const makeArgs = (cookiesFrom) => {
            // For playlists, apply start/end range so we don't fetch all 1000 entries
            const pStart = parseInt(settings.playlistStart || 0);
            const pEnd   = parseInt(settings.playlistEnd   || 0);
            const a = [
                url,
                '--dump-single-json',
                '--flat-playlist',
                '--no-colors',
                '--no-warnings',
                '--ignore-errors',      // don't abort if one entry fails
                '--extractor-retries', '1', // fail fast for fetching
                '--socket-timeout', '10',   // don't hang on bad connections
                '--force-ipv4',             // bypasses ISP IPv6 routing delays (huge speedup)
                '--no-check-certificates',  // slightly faster SSL handshakes
            ];
            // Apply playlist range during fetch if user has set it
            if (pStart > 1 || pEnd > 0) {
                const startN = pStart > 1 ? pStart : 1;
                const endN   = pEnd > 0   ? pEnd   : 'last';
                a.push('--playlist-items', `${startN}-${endN}`);
            }
            if (proxy)       a.push('--proxy', proxy);
            if (cookiesFrom) a.push('--cookies-from-browser', cookiesFrom);
            return a;
        };

        // Attempt: 1 = no cookies, 2 = with configured browser, 3 = auto-Chrome fallback
        const runFetch = (args, attempt) => {
            const proc  = spawn(ytdlp, args);
            let out = '', err = '', finished = false;
            const finish = (r) => { if (!finished) { finished = true; clearTimeout(timer); resolve(r); } };
            const timer  = setTimeout(() => { try { proc.kill(); } catch {} finish({ status: 'error', message: 'Timed out fetching info (120s). Large playlists may take longer.' }); }, 120000);

            proc.stdout.on('data', d => out += d.toString());
            proc.stderr.on('data', d => {
                const l = d.toString().trim();
                if (l) { err += l + '\n'; console.error(`[fetch-info][attempt${attempt}]`, l); }
            });
            proc.on('error', e => finish({ status: 'error', message: `yt-dlp failed to start: ${e.message}` }));

            proc.on('close', () => {
                const needsAuth = !out.trim() &&
                    (err.includes('sign in') || err.includes('Sign in') ||
                     err.includes('Please sign') || err.includes('login'));

                // Retry with cookies if auth required
                if (needsAuth && attempt === 1) {
                    const cookieSrc = browser || (isYT ? 'chrome' : '');
                    if (cookieSrc) {
                        console.log(`[fetch-info] Auth required, retrying with --cookies-from-browser ${cookieSrc}`);
                        finished = true; clearTimeout(timer);
                        runFetch(makeArgs(cookieSrc), 2);
                        return;
                    }
                }
                // If Chrome cookies failed (locked), try Firefox as last resort
                if (needsAuth && attempt === 2 && err.includes('unable to read') && isYT) {
                    console.log('[fetch-info] Chrome cookies locked, trying firefox...');
                    finished = true; clearTimeout(timer);
                    runFetch(makeArgs('firefox'), 3);
                    return;
                }

                // ── Parse result ───────────────────────────────────────
                try {
                    // Robustly find the JSON start — --ignore-errors may
                    // print warnings before the JSON object
                    const rawOut = out.trim();
                    const jsonStart = rawOut.indexOf('{');
                    if (jsonStart === -1) throw new Error('No JSON in yt-dlp output');
                    const info     = JSON.parse(rawOut.slice(jsonStart));
                    const duration = info.duration || 0;
                    const formats  = info.formats  || [];

                    if (info.entries) {
                        // Playlist
                        const entries = info.entries.filter(Boolean).map(e => ({
                            title:     e.title || 'Unknown',
                            url:       e.url || e.webpage_url,
                            duration:  e.duration,
                            thumbnail: e.thumbnail || (e.thumbnails?.slice(-1)[0]?.url),
                            id:        e.id,
                            formats:   [],
                        }));
                        let qualities = getAvailableQualities(formats, duration);
                        // Removed the secondary yt-dlp probe here. 
                        // It was adding 15-20 seconds of delay just to get format options.
                        // The UI already has a nice fallback dropdown when qualities is empty.
                        finish({ type:'playlist', title: info.title||'Unknown Playlist', platform: getPlatform(info.extractor||''), count: entries.length, entries, qualities });
                    } else {
                        finish({
                            type:        'video',
                            title:       info.title || 'Unknown',
                            platform:    getPlatform(info.extractor || ''),
                            url:         info.webpage_url || url,
                            duration:    info.duration,
                            thumbnail:   info.thumbnail,
                            uploader:    info.uploader,
                            description: (info.description || '').slice(0, 200),
                            view_count:  info.view_count,
                            like_count:  info.like_count,
                            upload_date: info.upload_date,
                            id:          info.id,
                            qualities:   getAvailableQualities(formats, duration),
                        });
                    }
                } catch {
                    const msg = needsAuth
                        ? (isYT ? 'YouTube requires login. Close Chrome/Firefox then set Cookie Browser in Settings.'
                                : 'Login required. Set Cookie Browser in Settings.')
                        : err.includes('private')   ? 'Private content — login required'
                        : err.includes('age')       ? 'Age-restricted — login required'
                        : err.includes('429')       ? 'Rate limited — please wait or use a proxy'
                        : err.includes('geo') || err.includes('not available') ? 'Geo-restricted — try a VPN/Proxy'
                        : out.trim() ? 'Failed to parse video info' : 'Failed to fetch video info';
                    console.error('[fetch-info] stderr:', err.slice(0, 400));
                    finish({ status: 'error', message: msg });
                }
            });
        };

        runFetch(makeArgs(null), 1); // always start without cookies
    });
});




// ── update-ytdlp: yt-dlp -U (self-update, no Python) ──────────
ipcMain.handle('update-ytdlp', async () => {
    return new Promise((resolve) => {
        const proc = spawn(getYtdlpPath(), ['-U']);
        let out = '';
        proc.stdout.on('data', d => out += d.toString());
        proc.stderr.on('data', d => out += d.toString());
        proc.on('error', err => resolve({ success: false, message: err.message }));
        proc.on('close', code => {
            if (code === 0) resolve({ success: true,  message: out.trim().split('\n').pop() || 'yt-dlp is up to date!' });
            else            resolve({ success: false, message: 'yt-dlp update failed. Check internet connection.' });
        });
    });
});

// ── test-proxy: use yt-dlp --simulate (no Python needed) ─────
ipcMain.handle('test-proxy', async (event, { proxy, proxyUser, proxyPass }) => {
    return new Promise((resolve) => {
        let finalProxy = proxy;
        if (proxy && proxyUser) {
            try {
                const pu = new URL(proxy);
                pu.username = proxyUser;
                if (proxyPass) pu.password = proxyPass;
                finalProxy = pu.toString();
            } catch {}
        }
        const proc = spawn(getYtdlpPath(), [
            'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            '--simulate', '--quiet', '--no-warnings',
            '--proxy', finalProxy,
            '--socket-timeout', '15',
        ]);
        let stderr = '';
        proc.stderr.on('data', d => stderr += d.toString());
        proc.on('error', err => resolve({ success: false, message: err.message }));
        proc.on('close', code => {
            if (code === 0) resolve({ success: true, message: `Proxy OK: ${proxy}` });
            else resolve({ success: false, message: stderr.trim().split('\n').pop() || 'Proxy test failed' });
        });
    });
});

// ─────────────────────────────────────────────
// IPC: SETTINGS & HISTORY
// ─────────────────────────────────────────────
ipcMain.handle('read-clipboard', () => {
    return clipboard.readText();
});

ipcMain.handle('open-directory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    return canceled ? null : filePaths[0];
});

ipcMain.handle('open-item-folder', async (e, folderPath) => {
    if (folderPath && fs.existsSync(folderPath)) {
        const stat = fs.statSync(folderPath);
        if (stat.isFile()) {
            shell.showItemInFolder(folderPath);
        } else {
            await shell.openPath(folderPath);
        }
    } else {
        // fallback: open downloads folder
        await shell.openPath(app.getPath('downloads'));
    }
});

ipcMain.handle('get-settings', () => {
    return store.get('settings', {
        outputPath: path.join(app.getPath('downloads'), 'AnySave'),
        defaultQuality: '1080',
        defaultFormat: 'video',
        concurrentDownloads: 3,
        rateLimit: 'unlimited',
        embedMeta: true,
        embedThumbnail: false,
        subtitles: false,
        subLang: 'en',
        smartDeduplication: true,
        excludeShorts: false,
        fragmentThreads: 4,
        sponsorblock: false,
        proxy: '',
        proxyUser: '',
        proxyPass: '',
        cookieBrowser: '',
        minimizeToTray: false,
        autoPasteClipboard: true,
        organizByPlatform: true,
        advancedMode: false,
        outputTemplate: '%(title)s.%(ext)s',
        playlistFilter: '',
        generateM3u: false,
        execCmd: '',
        theme: 'dark',
        dateSubfolders: false,
        // New yt-dlp power settings
        mergeOutputFormat: 'mp4',
        defaultAudioBitrate: '320',
        subtitleFormat: 'srt',
        preferFreeFormats: false,
        writeThumbnail: false,
        writeDescription: false,
        writeInfoJson: false,
        noOverwrite: false,
        geoBypass: false,
        geoBypassCountry: '',
        sleepInterval: 0,
        minDuration: 0,
        maxDuration: 0,
        // yt-dlp power settings (batch 2)
        playlistStart: 0,
        playlistEnd: 0,
        splitChapters: false,
        ageLimit: 0,
        videoPassword: '',
        liveFromStart: false,
        writeComments: false,
    });
});

ipcMain.handle('save-settings', (e, s) => { store.set('settings', s); return true; });

ipcMain.handle('get-history', () => historyStore.get());

ipcMain.handle('add-history', (e, item) => {
    const h = historyStore.get();
    h.unshift({ ...item, date: new Date().toISOString() });
    historyStore.set(h.slice(0, 100));
    return true;
});

ipcMain.handle('clear-history', () => { historyStore.set([]); return true; });

// ─────────────────────────────────────────────
// IPC: WINDOW CONTROLS
// ─────────────────────────────────────────────

// BUG-09 fix: native save dialog instead of browser download hack
ipcMain.handle('save-file', async (event, { filename, defaultName, content, filters }) => {
    const saveName = filename || defaultName || 'file.txt';
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        defaultPath: path.join(app.getPath('downloads'), saveName),
        filters: filters || [{ name: 'All Files', extensions: ['*'] }],
    });
    if (canceled || !filePath) return { success: false };
    try {
        fs.writeFileSync(filePath, content, 'utf-8');
        return { success: true, path: filePath };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// FEATURE-08: Open URL in default browser
ipcMain.on('open-external', (event, url) => {
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        shell.openExternal(url).catch(console.error);
    }
});

ipcMain.on('window-minimize', () => {

    const s = store.get('settings', {});
    if (s.minimizeToTray && tray) mainWindow?.hide();
    else mainWindow?.minimize();
});

ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
});

ipcMain.on('window-close', () => {
    const s = store.get('settings', {});
    if (s.minimizeToTray && tray) mainWindow?.hide();
    else { app.isQuitting = true; mainWindow?.close(); }
});

