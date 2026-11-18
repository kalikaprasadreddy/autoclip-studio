# AutoClip Studio 🎬⚡

> **AI-Powered Video Clipping & Reframing Software with Bring Your Own API Key (BYOK), YouTube / Public Link Ingestion, and Local Models (faster-whisper + Ollama).**

AutoClip Studio transforms long-form videos (podcasts, webinars, interviews, YouTube videos, speeches) into high-performing, viral 9:16 vertical clips for **TikTok, YouTube Shorts, Instagram Reels, and LinkedIn**.

---

## 🌟 Key Features

- **📺 YouTube & Web Link Ingestion**:
  - Paste any YouTube URL (`youtube.com/watch?v=...`, `youtu.be/...`, `youtube.com/shorts/...`), Vimeo, Twitter/X, or direct `.mp4` link.
  - Automatically downloads and imports directly into the studio using `yt-dlp`.
- **🎙️ Real Speech Transcription (faster-whisper)**:
  - Powered by **`faster-whisper`** directly on CPU: Transcribes ANY uploaded video or YouTube link with accurate word-level timestamps.
  - Also supports Cloud Whisper (**Groq** `whisper-large-v3` and **OpenAI** `whisper-1`).
  - No generic mock fallback transcripts — every video generates its actual, unique speech segments.
- **⚡ Google Gemini Integration**:
  - Full support for Google Gemini with active models (`gemini-3.1-flash-lite`, `gemini-3-flash-preview`, `gemini-1.5-flash`, `gemini-1.5-pro`).
  - Automatically selects active high-speed models.
- **🔑 Universal BYOK (Bring Your Own Key)**:
  - Google Gemini, Groq (Llama 3.3), OpenAI (GPT-4o), Anthropic Claude, and OpenRouter. Keys can be set in the UI or via environment variables.
- **🤖 100% Local LLMs**:
  - Connect to **Ollama** (`http://localhost:11434`) or **LM Studio** (`http://localhost:1234/v1`) with automatic model probing.
- **✂️ Video Editing & Reframing Engine (FFmpeg)**:
  - **9:16 Vertical**, **1:1 Square**, and **16:9 Landscape**.
  - Crop strategies: *Smart Center Crop*, *Blurred Background Letterbox*, *Pillarbox Fit*.
  - Burned-in animated subtitles: **Hormozi Style**, **Minimal Clean**, **Neon Cyberpunk**, and **Punchy Red**.
  - Auto-cut silences / pauses (>0.6s).

---

## 🚀 How to Run

### Option 1: Run with Docker (Recommended)

Docker provides an isolated, zero-dependency environment with FFmpeg, system fonts, Node.js frontend, and Python backend bundled into a single container.

#### 1. Clone the repository
```bash
git clone https://github.com/kalikaprasadreddy/autoclip-studio.git
cd autoclip-studio
```

#### 2. Build the Docker image
```bash
docker build -t autoclip-studio .
```

#### 3. Run the container
```bash
docker run -d -p 8000:10000 --name autoclip autoclip-studio
```

*(Optional)* You can pass default API keys or configure the Whisper model size via environment variables:
```bash
docker run -d -p 8000:10000 \
  -e WHISPER_MODEL=tiny \
  -e GEMINI_API_KEY="your-gemini-api-key" \
  --name autoclip \
  autoclip-studio
```

#### 4. Open in browser
Open **[http://localhost:8000](http://localhost:8000)** in your browser.

To stop the container:
```bash
docker stop autoclip && docker rm autoclip
```

---

### Option 2: Run with Startup Script (`./start.sh`)

If you want to run directly on your host machine without Docker:

#### 1. Prerequisites
Ensure you have the following installed on your system:
- **Python 3.10+**
- **Node.js 18+** & `npm`
- **FFmpeg** in your system `PATH`
  - **Ubuntu/Debian**: `sudo apt update && sudo apt install -y ffmpeg`
  - **macOS** (Homebrew): `brew install ffmpeg`
  - **Windows**: Install via `winget install Gyan.FFmpeg` or download from official site and add to PATH.

#### 2. Run the script
```bash
git clone https://github.com/kalikaprasadreddy/autoclip-studio.git
cd autoclip-studio
chmod +x start.sh
./start.sh
```

#### What `start.sh` does automatically:
1. Detects `ffmpeg` from your PATH or common binary directories.
2. Creates a Python virtual environment in `backend/venv` and installs all dependencies.
3. Installs frontend dependencies with `npm install` and compiles the React production build (`frontend/dist`).
4. Launches the unified FastAPI server on **http://localhost:8000**.

---

### Option 3: Manual Development Setup (Dual-Server)

For active frontend or backend development:

#### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```
The Vite dev server will run on **http://localhost:5173** and proxy API calls to the backend on port 8000.

---

## ☁️ Cloud Deployment (Render.com)

This repository includes a production-ready **`Dockerfile`** and **`render.yaml`** blueprint for 1-click deployment on [Render](https://render.com).

### 1-Click Blueprint Deployment:
1. Push your repository to GitHub.
2. In the [Render Dashboard](https://dashboard.render.com), click **New +** $\rightarrow$ **Blueprint**.
3. Select your repository. Render will automatically detect `render.yaml`.
4. Click **Apply**.

### Manual Web Service Deployment:
1. In Render, click **New +** $\rightarrow$ **Web Service**.
2. Connect your GitHub repository.
3. Set **Runtime** to **Docker**.
4. Set **Instance Type** to **Free** or **Starter**.
5. In **Environment Variables**, set:
   - `WHISPER_MODEL` = `tiny` *(Uses ~120MB RAM, optimized for Render's 512MB free tier)*
   - `PYTHONUNBUFFERED` = `1`
6. Click **Deploy Web Service**.

---

## 🛠️ API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/import-url` | `POST` | Import video from YouTube or public link (`{"url": "..."}`) |
| `/api/upload` | `POST` | Upload local video file (`.mp4`, `.mov`, `.webm`, `.mkv`) |
| `/api/transcribe` | `POST` | Transcribe speech using faster-whisper or Cloud Whisper |
| `/api/test-connection` | `POST` | Test API key or ping local Ollama/LM Studio server |
| `/api/local-models` | `GET` | Probe running local Ollama & LM Studio instances |
| `/api/analyze-clips` | `POST` | Extract viral clips from real transcript using LLM |
| `/api/render-clip` | `POST` | Queue FFmpeg 9:16 render with burned-in subtitles |
| `/api/renders/{id}/status` | `GET` | Poll render progress and download URL |

---

## 📄 License

MIT License. Open source and free to use for personal and commercial projects.
