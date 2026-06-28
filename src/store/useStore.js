import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useStore = create(
  persist(
    (set, get) => ({
      // ─── Queue ─────────────────────────────────────────────────
      queue: [],
      batchEntries: [],
      setBatchEntries: (entries) => set({ batchEntries: entries }),

      addToQueue: (item) => set((state) => ({
        queue: [...state.queue, {
          ...item,
          id: crypto.randomUUID(),
          status: item.scheduledAt && new Date(item.scheduledAt) > new Date() ? 'scheduled' : 'queued',
          percent: 0,
          speed: '0 B/s',
          eta: '--',
          downloaded_bytes: 0,
          total_bytes: 0,
          filename: '',
          retryCount: 0,
          scheduledAt: item.scheduledAt || null, // FEATURE-04
        }]
      })),

      updateQueueItem: (id, updates) => set((state) => ({
        queue: state.queue.map((item) =>
          item.id === id ? { ...item, ...updates } : item
        )
      })),

      moveQueueItemUp: (id) => set((state) => {
        const index = state.queue.findIndex(item => item.id === id);
        if (index <= 0) return state;
        const newQueue = [...state.queue];
        [newQueue[index - 1], newQueue[index]] = [newQueue[index], newQueue[index - 1]];
        return { queue: newQueue };
      }),

      moveQueueItemDown: (id) => set((state) => {
        const index = state.queue.findIndex(item => item.id === id);
        if (index === -1 || index >= state.queue.length - 1) return state;
        const newQueue = [...state.queue];
        [newQueue[index + 1], newQueue[index]] = [newQueue[index], newQueue[index + 1]];
        return { queue: newQueue };
      }),

      removeFromQueue: (id) => set((state) => ({
        queue: state.queue.filter((item) => item.id !== id)
      })),

      // FEATURE-16: Drag-and-drop reorder
      reorderQueue: (fromId, toId) => set((state) => {
        if (fromId === toId) return state;
        const arr = [...state.queue];
        const fromIdx = arr.findIndex(i => i.id === fromId);
        const toIdx   = arr.findIndex(i => i.id === toId);
        if (fromIdx === -1 || toIdx === -1) return state;
        const [item] = arr.splice(fromIdx, 1);
        arr.splice(toIdx, 0, item);
        return { queue: arr };
      }),

      clearCompleted: () => set((state) => ({
        // BUG-02 fix: also remove cancelled and error items
        queue: state.queue.filter((item) => !['finished', 'cancelled', 'error'].includes(item.status))
      })),

      clearAll: () => set({ queue: [] }),

      // ─── Settings ──────────────────────────────────────────────
      settings: {
        outputPath: '',
        defaultQuality: '1080',
        defaultFormat: 'video',
        concurrentDownloads: 3,
        rateLimit: 'unlimited',
        proxy: '',
        cookieBrowser: '',
        subtitles: false,
        subLang: 'en',
        embedThumbnail: false,
        embedMeta: true,
        minimizeToTray: false,
        organizByPlatform: true,
        advancedMode: false,
        customFormat: '',
        timeRange: '',
        smartDeduplication: true,
        excludeShorts: false,
        fragmentThreads: 4,
        sponsorblock: false,
        sponsorblockCategories: ['sponsor', 'intro', 'outro', 'selfpromo', 'interaction'],
        execCmd: '',
        outputTemplate: '%(title)s.%(ext)s',
        playlistFilter: '',
        generateM3u: false,
        enableRemoteQueue: false,
        dateSubfolders: false,
        proxyUser: '',
        proxyPass: '',
        theme: 'dark',
      },


      setSettings: (settings) => set({ settings }),

      updateSetting: (key, value) => set((state) => ({
        settings: { ...state.settings, [key]: value }
      })),

      // ─── UI State ─────────────────────────────────────────────
      activePanel: 'queue',
      setActivePanel: (panel) => set({ activePanel: panel }),

      // ─── Fetched Qualities ────────────────────────────────────
      fetchedQualities: null,
      setFetchedQualities: (qualities) => set({ fetchedQualities: qualities }),

      // ─── Fetched Video (Single) ───────────────────────────────
      pendingVideo: null,
      setPendingVideo: (video) => set({ pendingVideo: video }),

      // ─── Playlist Modal ───────────────────────────────────────
      pendingPlaylist: null,
      setPendingPlaylist: (playlistData) => set({ pendingPlaylist: playlistData }),

      // ─── Toasts ────────────────────────────────────────────────
      toasts: [],

      addToast: (toast) => {
        const id = crypto.randomUUID();
        set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
        setTimeout(() => {
          set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
        }, toast.duration || 4000);
      },

      removeToast: (id) => set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
      })),

      // ─── Global Actions ────────────────────────────────────────
      triggerDownload: (item, settings) => {
        if (!window.electronAPI) return;
        const AUDIO_QUALITIES = ['MP3', 'AAC', 'FLAC'];

        get().updateQueueItem(item.id, { status: 'downloading', message: null });

        window.electronAPI.startDownload({
          id:             item.id,
          url:            item.url,
          platform:       item.platform || 'Other',
          quality:        item.quality || settings.defaultQuality,
          format:         AUDIO_QUALITIES.includes(item.quality || settings.defaultQuality) ? 'audio' : 'video',
          outputPath:     settings.outputPath,
          subtitles:      (() => {
            if (item.subtitles_override !== undefined) {
              // Per-video override: lang code (FEATURE-12)
              return item.subtitles_override || null;
            }
            return settings.subtitles ? (settings.subLang || 'en') : null;
          })(),
          thumbnail:      item.thumbnail_override !== undefined ? item.thumbnail_override : settings.embedThumbnail,
          embedMeta:      item.embedMeta_override !== undefined ? item.embedMeta_override : settings.embedMeta,
          rateLimit:      settings.rateLimit !== 'unlimited' ? settings.rateLimit : null,
          proxy:          settings.proxy || null,
          proxyUser:      settings.proxyUser || null,
          proxyPass:      settings.proxyPass || null,
          cookieBrowser:  settings.cookieBrowser || null,
          customFormat:   item.customFormat || null,
          timeRange:      item.timeRange || null,
          smartDeduplication: settings.smartDeduplication,
          excludeShorts:  settings.excludeShorts,
          fragmentThreads: settings.fragmentThreads || 4,
          sponsorblock:   settings.sponsorblock,
          sponsorblockCategories: settings.sponsorblockCategories || ['sponsor', 'intro', 'outro', 'selfpromo', 'interaction'],
          execCmd:        item.execCmd || settings.execCmd || null,
          outputTemplate: settings.outputTemplate || '%(title)s.%(ext)s',
          playlistFilter: settings.playlistFilter || null,
          generateM3u:    settings.generateM3u || false,
          audioBitrate:   item.audioBitrate || null,
        });
      },
    }),
    {
      name: 'omnisave-queue-v1',
      // Only persist the queue — not toasts, UI state, or modal state
      partialize: (state) => ({
        queue: state.queue
          // FEATURE-10: reset mid-download items to 'queued' on restore
          .map(item =>
            item.status === 'downloading' || item.status === 'converting'
              ? { ...item, status: 'queued', percent: 0, speed: '0 B/s', eta: '--', message: '⚡ Interrupted — click ▶ to resume' }
              : item
          )
          // Don't persist finished items — they are in history already
          .filter(item => item.status !== 'finished'),
      }),
    }
  )
);

export default useStore;
