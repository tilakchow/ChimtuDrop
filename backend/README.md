# 🚀 ChimtuDrop Backend (FastAPI + yt-dlp + FFmpeg)

A completely free, self-hosted media extraction and download REST API powered by **yt-dlp**, **FastAPI**, and **FFmpeg**.

---

## 🌟 Features

- **100% Free & Open-Source**: No paid APIs, no subscriptions, no third-party keys required.
- **Platforms Supported**:
  - **Instagram**: Reels, public video posts.
  - **YouTube**: Videos, Shorts, format quality streams (1080p, 720p, 360p, audio only).
  - **X (Twitter)**: Public video tweets.
  - **Facebook**: Public reels and watch videos.
  - **Direct Media**: MP4, WebM, JPG, PNG links.
- **Security & Reliability**:
  - Full Anti-SSRF protection blocking private IPs, link-local, loopback, and cloud metadata.
  - Subprocess-free in-process extraction via the native `yt_dlp` Python library.
  - Automatic temporary file cleanup (30-minute TTL).
  - 250MB file size limit to prevent memory exhaustion on free-tier containers.

---

## 🛠️ API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Health check, yt-dlp version, and FFmpeg verification |
| `POST` | `/api/extract` | Accepts `{"url": "..."}`, returns media metadata, formats, and download ID |
| `POST` | `/api/download` | Accepts `{"extraction_id": "...", "format_id": "..."}`, prepares download |
| `GET` | `/api/download/{id}` | Streams the completed media file to client with auto-cleanup |

---

## 💻 Local Development Setup

### Prerequisites
- Python 3.10+
- FFmpeg installed and accessible in `PATH`

### 1. Set Up Virtual Environment & Dependencies
```bash
# In the backend directory
python -m venv venv

# Windows
.\venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Run the Development Server
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation (Swagger UI) is available at: `http://localhost:8000/docs`

### 3. Run Automated Tests
```bash
pytest tests/ -v
```

---

## ☁️ Free Tier Deployment Guide

### Option 1: Render.com (Recommended Free Tier)

Render offers a generous free tier suitable for running the ClipDrop Docker container:

1. Push your repository to **GitHub** or **GitLab**.
2. Sign in to [Render.com](https://render.com).
3. Click **New +** > **Web Service**.
4. Connect your ClipDrop repository.
5. Configure the service:
   - **Name**: `clipdrop-backend`
   - **Root Directory**: `backend`
   - **Runtime**: **Docker**
   - **Instance Type**: **Free** (0.1 CPU, 512 MB RAM)
6. Click **Deploy Web Service**.
7. Once deployed, Render will provide a public HTTPS URL (e.g. `https://clipdrop-backend.onrender.com`).
8. Open your **ClipDrop mobile app** > **Settings** > enter your Render URL into **Backend Server URL** > tap **Test Connection**!

> [!NOTE]
> **Free Tier Cold Starts**: Render's free tier spins down after 15 minutes of inactivity. When a user pastes a link after the server was idle, the first request may take ~30–50 seconds to wake up the container.

---

### Option 2: Railway.app / Fly.io

- **Railway**: Connect repo, set root directory to `backend`, Railway automatically detects the `Dockerfile` and deploys it with FFmpeg.
- **Fly.io**:
  ```bash
  cd backend
  fly launch --now
  ```

---

### Option 3: Local Self-Hosting via Docker
```bash
cd backend
docker build -t clipdrop-backend .
docker run -d -p 8000:8000 --name clipdrop clipdrop-backend
```
Access locally at `http://localhost:8000` or on your Wi-Fi LAN at `http://<YOUR_IP>:8000`.
