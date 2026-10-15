# 📱 ChimtuDrop (Mobile Media Downloader)

A high-performance, privacy-first mobile media downloader built with **React Native** and **Expo**. ChimtuDrop allows users to paste media links, preview content, select formats/qualities, and download photos or videos directly to their device storage and photo gallery with full offline history tracking.

---

## 🎯 1. Project Goal & Vision

Social media platforms like **Instagram**, **X (Twitter)**, **YouTube**, and **Facebook** do not offer native direct download options for videos, reels, and photos. Most existing web downloaders are overloaded with spam ads, trackers, and broken redirects.

**ChimtuDrop's goal is to provide:**
- **Zero-spam, clean experience**: Simple paste-and-download interface for **Instagram (Reels/Posts)**, **YouTube (Videos/Shorts)**, **Facebook (Reels/Watch)**, and **X / Twitter**.
- **Safety & Verification**: Validates links and presents preview cards with media dimensions, duration, and thumbnail before downloading.
- **Batch & Quality Selection**: Allows choosing specific images/videos from carousel posts or selecting preferred resolutions (1080p, 720p, 360p, MP4, JPEG).
- **Device & Gallery Integration**: Saves directly to app storage with automated optional sync to Android/iOS Photo Gallery.
- **Offline History**: Stores downloaded media metadata and file locations locally on device with share sheet capabilities.

---

## 🛠️ 2. Tech Stack & Architecture

### **Core Framework & Runtime**
- **Runtime**: React Native `0.86.3` with Expo SDK `57`
- **Language**: TypeScript `6.0.3` (Strict mode)
- **Tooling**: Metro Bundler, Expo CLI

### **UI & Layout**
- **Safe Area**: `react-native-safe-area-context` (edge-to-edge notch & status bar support)
- **Theme System**: Custom Light/Dark theme provider (`src/theme/ThemeContext.ts`) with modern claymorphic card styling and soft shadow gradients.
- **Icons**: `@expo/vector-icons` (Ionicons, MaterialCommunityIcons)
- **Status Bar**: `expo-status-bar` with dynamic light/dark contrast switching.

### **Backend & Extraction Engine**
- **Runtime**: Python `3.10+` with FastAPI & Uvicorn
- **Engine**: Native `yt-dlp` (100% free, no paid APIs or keys needed)
- **Media Processor**: FFmpeg for video+audio stream merging and MP3 conversion
- **Security**: SSRF protection, private IP filtering, strict domain whitelists, in-memory safe extraction sessions
- **Storage**: Ephemeral download directory with automatic periodic TTL cleanup (30-minute default)
- **Deployment**: Production-ready Docker container with multi-stage build, deployable on Render.com free tier or self-hosted

### **Testing & Code Quality**
- **Mobile Client Testing**: `jest` + `ts-jest` (43 passing unit tests across 5 test suites).
- **Backend Testing**: `pytest` covering health, SSRF prevention, extraction, direct files, and 404 lifecycle (7 passing tests).
- **Linter & Typecheck**: `expo lint` (0 errors), `tsc --noEmit` (0 errors).

---

## 📂 3. Project Structure

```
chimtu-downloader/
├── App.tsx                     # Root application navigator with SafeAreaProvider & ThemeProvider
├── index.ts                    # Entry point registering root component
├── app.json                    # Expo config (permissions, bundle IDs, icons)
├── package.json                # Dependencies and project scripts (npm run backend, npm test, etc.)
├── jest.config.js              # Unit testing configuration
├── assets/                     # App icons, splash screens, adaptive icons
├── backend/                    # Python FastAPI + yt-dlp Media Extraction Backend
│   ├── Dockerfile              # Production Dockerfile (python:3.12-slim + ffmpeg)
│   ├── requirements.txt        # fastapi, uvicorn, yt-dlp, httpx, pydantic, pytest
│   ├── README.md               # Backend documentation and Render.com deployment guide
│   ├── app/
│   │   ├── main.py             # FastAPI entry point & CORS configuration
│   │   ├── config.py           # Environment variables, TTL, size limits
│   │   ├── schemas.py          # Pydantic request & response schemas
│   │   ├── security.py         # Anti-SSRF and URL domain validation
│   │   ├── storage.py          # Extraction session manager & background file cleanup
│   │   ├── extractor.py        # Native yt-dlp metadata & format extraction
│   │   ├── downloader.py       # Format muxing (FFmpeg) and direct streaming download
│   │   └── routers/            # /health, /api/extract, /api/download endpoints
│   └── tests/                  # Pytest unit tests (test_api.py)
└── src/
    ├── types/                  # TypeScript domain models (media, download, theme, settings)
    ├── theme/                  # Color palettes, typography, theme context
    ├── utils/                  # URL sanitizers, platform formatters, share utilities
    ├── services/
    │   ├── retrieval/          # URL validators & adapters (Instagram, YouTube, Facebook, X, Direct)
    │   ├── download/           # DownloadManager engine & cross-platform MediaLibrary adapter
    │   └── storage/            # Local AsyncStorage history & settings management
    ├── components/             # Reusable UI components (ClayButton, ClayInput, Header, Badge, etc.)
    ├── screens/
    │   ├── HomeScreen.tsx            # URL input, clipboard paste, YouTube/FB/IG/X badges
    │   ├── MediaPreviewScreen.tsx    # Thumbnail preview, quality selector, rename modal
    │   ├── DownloadManagerScreen.tsx # Live progress bar, speed, cancel & share controls
    │   ├── HistoryScreen.tsx         # Download records with search, filter, and quick share
    │   └── SettingsScreen.tsx        # Backend URL configuration, connection test, storage controls
    └── __tests__/              # Jest unit test suites
```

---

## ✅ 4. What Is Completed & Working

1. **Free Backend Media Extraction & Download API**:
   - `GET /health` with yt-dlp and FFmpeg status validation.
   - `POST /api/extract` resolving YouTube, Instagram, Facebook, X (Twitter), and direct media URLs.
   - `POST /api/download` and `GET /api/download/{id}` streaming media files with auto-cleanup.
   - Anti-SSRF protection blocking private IPs, loopback, and internal networks.
2. **Four Major Social Platforms Supported**:
   - **YouTube**: Videos, Shorts, 1080p/720p/360p quality selection and audio options.
   - **Instagram**: Public Reels and video posts.
   - **Facebook**: Public Reels and watch videos.
   - **X (Twitter)**: Public video posts.
   - **Direct links**: MP4, WebM, JPG, PNG direct streaming and gallery saving.
3. **Modern Responsive Design**:
   - Soft claymorphic cards, responsive input with one-tap clipboard paste.
   - Dynamic Light and Dark modes.
   - Edge-to-edge support with `react-native-safe-area-context`.
4. **Resumable Download Engine**:
   - Download progress tracking (percentage, bytes received vs total).
   - Cancellation handle and download directory management.
5. **Configurable Backend in Settings**:
   - Customizable backend URL in app Settings with one-tap "Test Connection" button.
6. **Local History & Management**:
   - Persistent history in `AsyncStorage`.
   - File existence validation, deletion, and sharing directly from history.

---

## 💻 5. How To Run & Test Locally

### 1. Start the FastAPI Backend:
```bash
# Easy npm shortcut
npm run backend

# Or directly in Python
.\backend\venv\Scripts\uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000 --reload
```
API Documentation (Swagger UI) is available at: `http://localhost:8000/docs`

### 2. Start Metro Bundler for Mobile App:
```bash
# Standard local development
npx expo start

# Run in Web Browser
npm run web
```

### 3. Run Automated Verification Tests:
```bash
# Mobile client tests (Jest)
npm test

# Mobile client typecheck
npm run typecheck

# Mobile client lint
npm run lint

# Backend tests (Pytest)
npm run backend:test
```
