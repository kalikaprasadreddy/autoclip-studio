import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
STORAGE_DIR = BASE_DIR / "storage"
UPLOADS_DIR = STORAGE_DIR / "uploads"
AUDIO_DIR = STORAGE_DIR / "audio"
CLIPS_DIR = STORAGE_DIR / "clips"
RENDERS_DIR = STORAGE_DIR / "renders"

for d in [STORAGE_DIR, UPLOADS_DIR, AUDIO_DIR, CLIPS_DIR, RENDERS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# Default Local endpoints
DEFAULT_OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
DEFAULT_LMSTUDIO_URL = os.getenv("LMSTUDIO_URL", "http://localhost:1234/v1")

# FFmpeg binary paths
FFMPEG_BIN = os.getenv("FFMPEG_PATH", "ffmpeg")
FFPROBE_BIN = os.getenv("FFPROBE_PATH", "ffprobe")
