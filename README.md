# 🎬 AnySave Advanced

🌐 **Official Website**: [omnitool.site](https://www.omnitool.site/)

[![Electron](https://img.shields.io/badge/Electron-v28.2.0-blue?style=for-the-badge&logo=electron)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-v19.2.5-cyan?style=for-the-badge&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-v8.0.10-9063FF?style=for-the-badge&logo=vite)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v3.4.1-38B2AC?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge)](LICENSE)
[![Platform Support](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-green?style=for-the-badge)](#-platform-support)

**AnySave Advanced** is a premium, high-performance desktop application designed for downloading media from YouTube, Instagram, TikTok, Twitter/X, Facebook, Vimeo, and over 1,000 other websites. Built with **Electron**, **React 19**, **Vite**, and **Tailwind CSS**, it leverages the powerful downloading capabilities of [yt-dlp](https://github.com/yt-dlp/yt-dlp) and combines them with a clean, modern, and highly interactive user interface.


---

## 📺 Demo Video

[![Watch AnySave Demo Video](src/assets/hero.png)](https://pub-ed45bcfe138f43059e17714556deba2a.r2.dev/AnySave/AnySave.mp4)

*(Click the image above to watch the demo video)*

---

## 🌐 Need Help, Demos, or More Tools?

If you run into any issues, want to see high-quality screenshot previews and walkthrough videos, or want to check out other cool tools we have built, please visit our official website:

👉 **[OmniTool Official Website](https://www.omnitool.site/)**

* **🔧 Quick Support & Solutions**: Find instant solutions to any errors, setup issues, or download failures.
* **🎥 Demos & Guides**: Access step-by-step videos and detailed visual guides for using all features.
* **🚀 Discover New Tools**: Explore and download our other latest products and applications.

---

## ✨ Key Features


### 🎬 Video Downloading & Processing
* **High-Definition Resolution**: Download in 4K, 1080p, 720p, 480p, and 360p.
* **Auto-Merge**: Automatically combines high-quality video and audio streams using `ffmpeg`.
* **Interactive Playlist Downloader**: Scan entire playlists, select specific items, and choose individual quality options per video.
* **Time-Range Trimming**: Trim or clip specific segments of a video before downloading (requires `ffmpeg`).

### 🎵 Audio Extraction
* **High Quality Formats**: Extract audio track directly into **MP3**, **AAC**, or **FLAC** format.
* **Metadata & Art**: Embed album art (thumbnails) and ID3 tags directly into extracted audio files.

### ⚙️ Advanced Downloader Controls
* **Pause & Resume**: Pause active downloads and resume them seamlessly without losing progress.
* **Concurrent Downloads**: Control download speed by setting concurrent download limits (1 to 5 downloads at a time).
* **Batch Downloads**: Queue multiple URLs simultaneously.
* **SponsorBlock Integration**: Automatically skip sponsored segments, intros, and outros in YouTube videos.

### 🌐 Proxy & Authentication
* **Proxy Support**: Route downloads through HTTP/HTTPS/SOCKS5 proxies with full username and password authentication.
* **Browser Cookies Auth**: Authenticate private or age-restricted videos using cookies from Chrome, Firefox, Edge, and other major browsers.

### 🎨 User Interface & UX
* **Sleek Themes**: Seamless switching between **Dark Mode**, **Light Mode**, and **High-Contrast Mode**.
* **System Tray integration**: Minimize the app to the system tray with controls to *Pause All* or *Resume All* downloads.
* **Drag-and-Drop**: Drag a media URL directly into the app window to instantly parse and load download options.
* **Detailed History**: A complete history of past downloads with options to filter, search, and export logs to JSON.

---

## 🔒 Security & Source Code Protection

* **V8 Bytecode Compilation**: To protect proprietary intellectual property, the Electron main process is compiled into raw V8 bytecode (`main.jsc`) using **Bytenode**. The loader script manages loading the compiled bytecode securely and falls back to plain `main.js` only during local development.
* **IPC Isolation**: Renderer context isolation (`contextIsolation: true`) and node integration disabled (`nodeIntegration: false`) to ensure the frontend has no direct shell or operating system access.
* **Secure API Integration**: The internal Express-based API server binds strictly to the local loopback interface (`127.0.0.1`) and requires a unique session token (`X-AnySave-Token`) for every remote request.

---

## 🛠️ Tech Stack & Dependencies

* **Frontend**: React 19, Tailwind CSS, Framer Motion (for smooth micro-animations), Lucide React (icons), Zustand (global state management).
* **Backend (Electron)**: Electron 28.2.0, Express (internal API), ffmpeg-static (fallback ffmpeg binary), Bytenode (code protection), Node Machine ID (device-based licensing).
* **Builder**: Electron Builder 24.9.1.

---

## 🚀 Getting Started

### Prerequisites

Please ensure the following are installed on your machine before running the application:

1. **Node.js (v18 or higher)**: Download and install from [Node.js Official Site](https://nodejs.org/).
2. **Python (v3.9 or higher)**: Download from [Python Official Site](https://www.python.org/).
   > ⚠️ **Windows Users**: Check the option **"Add Python to PATH"** during installation.
3. **yt-dlp**: Install the package globally via pip:
   ```bash
   pip install yt-dlp
   ```
4. **ffmpeg**: Required for audio conversion, merging streams, and clipping videos:
   * **Windows**: Download from [FFmpeg Official site](https://ffmpeg.org/download.html) and add the `bin/` folder to your System PATH variables.
   * **macOS**: Install using brew: `brew install ffmpeg`
   * **Linux**: Install via package manager: `sudo apt install ffmpeg`

---

### Development Setup

Follow these steps to run the application locally in development mode:

1. **Clone the repository** and navigate to the project directory:
   ```bash
   cd anysave
   ```
2. **Install all dependencies**:
   ```bash
   npm install
   ```
3. **Run the developer environment**:
   ```bash
   npm start
   ```
   This command starts the Vite development server on `http://localhost:5173` and boots Electron simultaneously using concurrently.

---

## 🏗️ Packaging for Distribution

AnySave is configured with **electron-builder** to package the application into production installers.

### 1. Compile V8 Bytecode
Before packaging, compile the main process to V8 bytecode:
```bash
npm run compile-bytecode
```

### 2. Package App
Run the build script to compile and package the app for distribution:
```bash
npm run dist
```
This builds the React frontend, compiles the main process bytecode, and packages everything into an installer.

### Supported Build Targets
* **Windows**: `.exe` NSIS installer (supports single-click installations, custom installation paths, and desktop shortcuts).
* **macOS**: `.dmg` package.
* **Linux**: `.AppImage` package.

---

## 🔄 Auto-Updates
The app supports automatic updates via `electron-updater`.
To set up auto-updates for your releases:
1. Update `publish.provider` in `package.json` to `"github"`.
2. Configure the GitHub repository field in `package.json`.
3. Package and upload your installer releases to your GitHub repository's release page. The app will automatically prompt users when a newer version is detected on startup.

---

## 🐛 Troubleshooting

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| **Downloads stuck at 0%** | `yt-dlp` executable not found or broken. | Run `pip install --upgrade yt-dlp` to ensure yt-dlp is installed and up-to-date. |
| **No audio in downloaded videos** | System is missing `ffmpeg` binaries. | Download `ffmpeg`, add its bin folder to your Environment PATH, and restart the app. |
| **"Python not found" error** | Python is not added to the System Path. | Reinstall Python and make sure to check the **"Add Python to PATH"** checkbox. |
| **Private or Member-only video fails** | Session authentication required. | Open Settings, navigate to **Browser Login**, and select the browser where you are logged in to load your credentials cookies. |
| **App fails to start (dev mode)** | Port conflict or vite server delay. | Stop any running Node processes and run `npm start` again. |
