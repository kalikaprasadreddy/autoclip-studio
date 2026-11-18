#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "============================================================"
echo "      🚀 AutoClip Studio — AI Video Clipper & Editor        "
echo "  (Bring Your Own Key & 100% Local LLM / Ollama Support)    "
echo "============================================================"

# Ensure common local bin directories are in PATH if present
for BIN_DIR in "$HOME/.gemini/antigravity/bin" "$HOME/.local/bin" "/usr/local/bin"; do
  if [ -d "$BIN_DIR" ]; then
    export PATH="$BIN_DIR:$PATH"
  fi
done

# Check FFmpeg
if ! command -v ffmpeg &> /dev/null; then
  echo "⚠️ FFmpeg not detected in PATH. Please ensure FFmpeg is installed."
fi

# Ensure Python venv
if [ ! -d "backend/venv" ]; then
  echo "📦 Creating backend Python virtual environment..."
  python3 -m venv backend/venv
  backend/venv/bin/pip install -r backend/requirements.txt
fi

# Ensure frontend build exists
if [ ! -d "frontend/dist" ]; then
  echo "📦 Building frontend React app..."
  cd frontend
  npm install
  npm run build
  cd "$DIR"
fi

echo ""
echo "✨ Starting AutoClip Studio Unified Server on http://localhost:8000"
echo "👉 Open http://localhost:8000 in your browser to start clipping!"
echo "   (Press Ctrl+C to stop)"
echo ""

cd backend
exec ./venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
