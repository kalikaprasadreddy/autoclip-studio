# ==========================================
# Stage 1: Build the React Frontend
# ==========================================
FROM node:20-bookworm-slim AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ==========================================
# Stage 2: Python Backend Runtime with FFmpeg
# ==========================================
FROM python:3.12-slim-bookworm

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    DEBIAN_FRONTEND=noninteractive \
    PORT=10000

# Install FFmpeg, fonts and fontconfig for video subtitles and audio extraction
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    fonts-dejavu-core \
    fonts-freefont-ttf \
    fontconfig \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && fc-cache -fv

WORKDIR /app

# Install Python requirements
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r ./backend/requirements.txt

# Copy built frontend assets from stage 1
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Copy backend application source
COPY backend /app/backend

# Create media storage directories
RUN mkdir -p /app/backend/storage/uploads \
             /app/backend/storage/audio \
             /app/backend/storage/clips \
             /app/backend/storage/renders

WORKDIR /app/backend

# Render listens on the dynamic $PORT environment variable (defaults to 10000)
EXPOSE 10000

# Start unified FastAPI server serving both API and React frontend on $PORT
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}"]
