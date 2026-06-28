const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Downloads
    startDownload:  (data) => ipcRenderer.send('start-download', data),
    cancelDownload: (data) => ipcRenderer.send('cancel-download', data),
    pauseDownload:  (data) => ipcRenderer.send('pause-download', data),
    resumeDownload: (data) => ipcRenderer.send('resume-download', data),
    
    onDownloadProgress: (callback) => {
        const listener = (_, v) => callback(v);
        ipcRenderer.on('download-progress', listener);
        return () => ipcRenderer.removeListener('download-progress', listener);
    },
    onDownloadFinished: (callback) => {
        const listener = (_, v) => callback(v);
        ipcRenderer.on('download-finished', listener);
        return () => ipcRenderer.removeListener('download-finished', listener);
    },
    onDownloadPaused: (callback) => {
        const listener = (_, v) => callback(v);
        ipcRenderer.on('download-paused', listener);
        return () => ipcRenderer.removeListener('download-paused', listener);
    },
    onDownloadError: (callback) => {
        const listener = (_, v) => callback(v);
        ipcRenderer.on('download-error', listener);
        return () => ipcRenderer.removeListener('download-error', listener);
    },

    onDownloadRetry: (callback) => {
        const listener = (_, v) => callback(v);
        ipcRenderer.on('download-retry', listener);
        return () => ipcRenderer.removeListener('download-retry', listener);
    },

    onDownloadCancelled: (callback) => {
        const listener = (_, v) => callback(v);
        ipcRenderer.on('download-cancelled', listener);
        return () => ipcRenderer.removeListener('download-cancelled', listener);
    },

    onToast: (callback) => {
        const listener = (_, v) => callback(v);
        ipcRenderer.on('toast', listener);
        return () => ipcRenderer.removeListener('toast', listener);
    },

    // Clipboard auto-detect
    onClipboardUrl: (callback) => {
        const listener = (_, v) => callback(v);
        ipcRenderer.on('clipboard-url', listener);
        return () => ipcRenderer.removeListener('clipboard-url', listener);
    },

    // Tray controls
    onTrayPauseAll: (callback) => {
        const listener = () => callback();
        ipcRenderer.on('tray-pause-all', listener);
        return () => ipcRenderer.removeListener('tray-pause-all', listener);
    },
    onTrayResumeAll: (callback) => {
        const listener = () => callback();
        ipcRenderer.on('tray-resume-all', listener);
        return () => ipcRenderer.removeListener('tray-resume-all', listener);
    },

    // BUG-10: yt-dlp update status events
    onYtdlpStatus: (callback) => {
        const listener = (_, v) => callback(v);
        ipcRenderer.on('ytdlp-status', listener);
        return () => ipcRenderer.removeListener('ytdlp-status', listener);
    },

    // Info fetch
    fetchInfo: (data) => ipcRenderer.invoke('fetch-info', data),
    updateYtdlp: () => ipcRenderer.invoke('update-ytdlp'),

    // Proxy
    testProxy: (proxy) => ipcRenderer.invoke('test-proxy', proxy),

    // Clipboard
    readClipboard: () => ipcRenderer.invoke('read-clipboard'),

    // Directory
    openDirectory: () => ipcRenderer.invoke('open-directory'),
    openItemFolder: (title) => ipcRenderer.invoke('open-item-folder', title),

    // Settings
    getSettings: () => ipcRenderer.invoke('get-settings'),
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),

    // History
    getHistory: () => ipcRenderer.invoke('get-history'),
    addHistory: (item) => ipcRenderer.invoke('add-history', item),
    clearHistory: () => ipcRenderer.invoke('clear-history'),

    // File save dialog (BUG-09 fix — native save for history export)
    saveFile: (data) => ipcRenderer.invoke('save-file', data),

    // Window
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    // FEATURE-08: open URL in default browser
    openExternal: (url) => ipcRenderer.send('open-external', url),


    // Cleanup listeners
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),

    // Path utilities (cross-platform)
    joinPaths: (...parts) => ipcRenderer.sendSync('join-paths', parts),

});
