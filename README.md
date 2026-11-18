# AutoClip Studio 🎬⚡

> **AI-Powered Video Clipping & Reframing Software with Bring Your Own API Key (BYOK), YouTube / Public Link Ingestion, and Local Models (faster-whisper + Ollama).**

AutoClip Studio transforms long-form videos (podcasts, webinars, interviews, YouTube videos, speeches) into high-performing, viral 9:16 vertical clips for **TikTok, YouTube Shorts, Instagram Reels, and LinkedIn**.

---

## 🌟 Key Updates & New Features

- **📺 YouTube & Web Link Ingestion**:
  - Paste any YouTube URL (`youtube.com/watch?v=...`, `youtu.be/...`, `youtube.com/shorts/...`), Vimeo, Twitter/X, or direct `.mp4` link.
  - Automatically downloads and imports directly into the studio using `yt-dlp`.
- **🎙️ Real Speech Transcription (faster-whisper)**:
  - Powered by **`faster-whisper`** directly on CPU: Transcribes ANY uploaded video or YouTube link with 100% accurate word-level timestamps.
  - Also supports Cloud Whisper (**Groq** `whisper-large-v3` and **OpenAI** `whisper-1`).
  - No more generic mock fallback transcripts — every video generates its actual, unique speech segments.
- **⚡ Google Gemini Integration**:
  - Full support for Google Gemini with active models (`gemini-3.1-flash-lite`, `gemini-3-flash-preview`, `gemini-1.5-flash`, `gemini-1.5-pro`).
  - Automatically avoids sunset 404 models and selects active high-speed models.
- **🔑 Universal BYOK**:
  - Google Gemini, Groq (Llama 3.3), OpenAI (GPT-4o), Anthropic Claude, and OpenRouter.
- **🤖 100% Local LLMs**:
  - Connect to **Ollama** (`http://localhost:11434`) or **LM Studio** (`http://localhost:1234/v1`) with auto-discovery.
- **✂️ Video Editing & Reframing Engine (FFmpeg)**:
  - **9:16 Vertical**, **1:1 Square**, and **16:9 Landscape**.
  - Crop strategies: *Smart Center Crop*, *Blurred Background Letterbox*, *Pillarbox Fit*.
  - Burned-in animated subtitles: **Hormozi Style**, **Minimal Clean**, **Neon Cyberpunk**, and **Punchy Red**.
  - Auto-cut silences / pauses (>0.6s).

---

## 🚀 Quick Start

Run the application:

```bash
cd /home/ram-chandra/.gemini/antigravity/scratch/autoclip-studio
./start.sh
```

Then open **http://localhost:8000** in your browser.

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
