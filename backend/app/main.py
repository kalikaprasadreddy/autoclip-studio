import os
import uuid
import json
import shutil
import asyncio
from pathlib import Path
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import (
    BASE_DIR, UPLOADS_DIR, AUDIO_DIR, CLIPS_DIR, RENDERS_DIR,
    DEFAULT_OLLAMA_URL, DEFAULT_LMSTUDIO_URL
)
from .models.schemas import (
    VideoInfo,
    TranscriptSegment,
    VideoAnalysisRequest,
    ClipItem,
    RenderRequest,
    RenderStatus,
    TestConnectionRequest,
    TestConnectionResponse,
    TranscriptionConfig,
    LLMProviderConfig
)
from .services.video_processor import VideoProcessor
from .services.subtitle_gen import SubtitleGenerator
from .services.transcriber import Transcriber
from .services.llm_engine import LLMEngine
from .services.downloader import VideoDownloader
from .sample_generator import SampleGenerator

app = FastAPI(
    title="AutoClip Studio API",
    description="AI-powered Video Clipping & Editing Software with BYOK and Local LLM support",
    version="1.0.0"
)

# Enable CORS for Vite dev server and external clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage cache for fast state retrieval
video_store: Dict[str, Dict[str, Any]] = {}
render_store: Dict[str, RenderStatus] = {}

# Mount media static directories for video playback and export downloads
app.mount("/media/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")
app.mount("/media/renders", StaticFiles(directory=str(RENDERS_DIR)), name="renders")
app.mount("/media/clips", StaticFiles(directory=str(CLIPS_DIR)), name="clips")

class URLImportRequest(BaseModel):
    url: str

@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "AutoClip Studio", "version": "1.0.0"}

@app.post("/api/upload", response_model=VideoInfo)
async def upload_video(file: UploadFile = File(...)):
    """Uploads a video file and indexes metadata."""
    video_id = str(uuid.uuid4())[:8]
    ext = Path(file.filename or "video.mp4").suffix or ".mp4"
    dest_filename = f"{video_id}_{file.filename}"
    dest_path = UPLOADS_DIR / dest_filename

    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    info = VideoProcessor.get_video_info(str(dest_path))
    url = f"/media/uploads/{dest_filename}"

    video_data = {
        "id": video_id,
        "filename": file.filename or dest_filename,
        "file_path": str(dest_path),
        "duration": info["duration"],
        "width": info["width"],
        "height": info["height"],
        "fps": info["fps"],
        "size_bytes": info["size_bytes"],
        "has_audio": info["has_audio"],
        "url": url,
        "transcript": []
    }
    video_store[video_id] = video_data

    return VideoInfo(**{k: v for k, v in video_data.items() if k not in ["file_path", "transcript"]})

@app.post("/api/import-url", response_model=VideoInfo)
async def import_video_from_url(req: URLImportRequest):
    """Downloads a video from a YouTube link or any public video URL using yt-dlp."""
    try:
        print(f"Importing video from public link / YouTube: {req.url}")
        video_data = VideoDownloader.download_url(req.url)
        video_id = video_data["id"]
        video_store[video_id] = video_data
        return VideoInfo(**{k: v for k, v in video_data.items() if k not in ["file_path", "transcript"]})
    except Exception as e:
        print(f"Error importing from URL: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to import video from URL: {str(e)}")

@app.post("/api/generate-sample", response_model=VideoInfo)
async def generate_sample_video():
    """Provides a synthetic 16:9 demo video with audio for immediate zero-config testing."""
    sample_path = SampleGenerator.ensure_sample_video()
    video_id = "demo_sample"
    info = VideoProcessor.get_video_info(sample_path)
    filename = os.path.basename(sample_path)
    url = f"/media/uploads/{filename}"

    video_data = {
        "id": video_id,
        "filename": "Sample Tech Podcast (Demo).mp4",
        "file_path": sample_path,
        "duration": info["duration"],
        "width": info["width"],
        "height": info["height"],
        "fps": info["fps"],
        "size_bytes": info["size_bytes"],
        "has_audio": info["has_audio"],
        "url": url,
        "transcript": []
    }
    video_store[video_id] = video_data

    return VideoInfo(**{k: v for k, v in video_data.items() if k not in ["file_path", "transcript"]})

@app.get("/api/videos/{video_id}")
async def get_video(video_id: str):
    """Retrieves video information and current transcript."""
    if video_id not in video_store:
        raise HTTPException(status_code=404, detail="Video not found")
    data = video_store[video_id]
    return {
        "info": {k: v for k, v in data.items() if k not in ["file_path", "transcript"]},
        "transcript": data.get("transcript", [])
    }

@app.post("/api/test-connection", response_model=TestConnectionResponse)
async def test_connection(req: TestConnectionRequest):
    """Pings the chosen BYOK provider or local LLM server to test authentication and discover models."""
    cfg = LLMProviderConfig(
        provider=req.provider,
        api_key=req.api_key,
        base_url=req.base_url,
        model_name=req.model_name
    )
    return await LLMEngine.test_connection(cfg)

@app.get("/api/local-models")
async def discover_local_models():
    """Probes default Ollama and LM Studio endpoints to detect running local instances."""
    results = {"ollama": {"available": False, "models": []}, "lmstudio": {"available": False, "models": []}}
    
    # Probe Ollama
    ollama_res = await LLMEngine.test_connection(LLMProviderConfig(provider="ollama"))
    if ollama_res.success:
        results["ollama"] = {"available": True, "models": ollama_res.models}
        
    # Probe LM Studio
    lm_res = await LLMEngine.test_connection(LLMProviderConfig(provider="lmstudio"))
    if lm_res.success:
        results["lmstudio"] = {"available": True, "models": lm_res.models}

    return results

@app.post("/api/transcribe")
async def transcribe_video(
    video_id: str = Form(...),
    provider: str = Form("auto"),
    api_key: Optional[str] = Form(None),
    model: Optional[str] = Form("base")
):
    """Extracts audio and generates timestamped transcription segments."""
    if video_id not in video_store:
        raise HTTPException(status_code=404, detail="Video not found")
    
    video_info = video_store[video_id]
    video_path = video_info["file_path"]
    audio_path = str(AUDIO_DIR / f"{video_id}.wav")

    # Extract audio using FFmpeg if not already done
    if not os.path.exists(audio_path):
        extracted = VideoProcessor.extract_audio(video_path, audio_path)
        if not extracted and not os.path.exists(audio_path):
            raise HTTPException(status_code=500, detail="Failed to extract audio from video")

    # Run transcription (Groq / OpenAI Whisper or fast Local faster-whisper)
    cfg = TranscriptionConfig(provider=provider, api_key=api_key, model=model)
    segments = await Transcriber.transcribe_audio(audio_path, cfg)
    
    # Save real transcript in store
    video_store[video_id]["transcript"] = [s.model_dump() for s in segments]

    return {
        "video_id": video_id,
        "segments": segments,
        "total_words": sum(len(s.words or s.text.split()) for s in segments)
    }

@app.post("/api/analyze-clips")
async def analyze_clips(req: VideoAnalysisRequest):
    """Analyzes the transcript with BYOK or local LLM to extract viral clips."""
    if req.video_id not in video_store:
        raise HTTPException(status_code=404, detail="Video not found")
    
    transcript_data = req.transcript_override or [
        TranscriptSegment(**s) for s in video_store[req.video_id].get("transcript", [])
    ]

    # If transcript is empty, auto-transcribe first
    if not transcript_data:
        audio_path = str(AUDIO_DIR / f"{req.video_id}.wav")
        if not os.path.exists(audio_path):
            VideoProcessor.extract_audio(video_store[req.video_id]["file_path"], audio_path)
        transcript_data = await Transcriber.transcribe_audio(
            audio_path,
            TranscriptionConfig(provider="auto", api_key=req.llm_config.api_key)
        )
        video_store[req.video_id]["transcript"] = [s.model_dump() for s in transcript_data]

    # Call LLM Engine to extract clips from the ACTUAL video transcript
    clips = await LLMEngine.extract_clips(
        transcript=transcript_data,
        config=req.llm_config,
        target_clip_length=req.target_clip_length,
        num_clips=req.num_clips,
        topic_focus=req.topic_focus
    )

    return {"video_id": req.video_id, "clips": clips}

async def process_render_task(render_id: str, req: RenderRequest, video_path: str, transcript: List[TranscriptSegment]):
    """Background task to trim, reframe, generate subtitles, and render final MP4."""
    try:
        render_store[render_id].status = "processing"
        render_store[render_id].progress = 15
        render_store[render_id].message = "Generating styled subtitles..."

        output_filename = f"clip_{render_id}_{req.aspect_ratio.replace(':', 'x')}.mp4"
        output_path = RENDERS_DIR / output_filename

        subtitle_path = None
        if req.subtitle_style.enabled:
            ass_filename = f"sub_{render_id}.ass"
            ass_path = str(CLIPS_DIR / ass_filename)
            SubtitleGenerator.generate_ass(
                segments=transcript,
                clip_start=req.start_time,
                clip_end=req.end_time,
                style=req.subtitle_style,
                output_ass_path=ass_path
            )
            subtitle_path = ass_path

        render_store[render_id].progress = 40
        render_store[render_id].message = f"Encoding video ({req.aspect_ratio} with {req.crop_mode})..."

        success = await VideoProcessor.render_clip(
            video_path=video_path,
            output_path=str(output_path),
            start_time=req.start_time,
            end_time=req.end_time,
            aspect_ratio=req.aspect_ratio,
            crop_mode=req.crop_mode,
            subtitle_file=subtitle_path,
            remove_silence=req.remove_silence
        )

        if success and output_path.exists() and output_path.stat().st_size > 0:
            render_store[render_id].status = "completed"
            render_store[render_id].progress = 100
            render_store[render_id].message = "Render completed successfully!"
            render_store[render_id].output_url = f"/media/renders/{output_filename}"
            render_store[render_id].file_path = str(output_path)
        else:
            render_store[render_id].status = "failed"
            render_store[render_id].message = "FFmpeg render failed."
    except Exception as e:
        render_store[render_id].status = "failed"
        render_store[render_id].message = f"Error during rendering: {str(e)}"
        print(f"Render failed: {e}")

@app.post("/api/render-clip", response_model=RenderStatus)
async def render_clip_endpoint(req: RenderRequest, background_tasks: BackgroundTasks):
    """Queues a clip render job with selected framing, subtitles, and silence removal."""
    if req.video_id not in video_store:
        raise HTTPException(status_code=404, detail="Video not found")

    render_id = str(uuid.uuid4())[:10]
    video_path = video_store[req.video_id]["file_path"]
    transcript_segments = [
        TranscriptSegment(**s) for s in video_store[req.video_id].get("transcript", [])
    ]

    status = RenderStatus(
        render_id=render_id,
        status="pending",
        progress=5,
        message="Render job queued..."
    )
    render_store[render_id] = status

    background_tasks.add_task(
        process_render_task,
        render_id=render_id,
        req=req,
        video_path=video_path,
        transcript=transcript_segments
    )

    return status

@app.get("/api/renders/{render_id}/status", response_model=RenderStatus)
async def get_render_status(render_id: str):
    """Polls status of a render job."""
    if render_id not in render_store:
        raise HTTPException(status_code=404, detail="Render job not found")
    return render_store[render_id]

@app.get("/api/silences/{video_id}")
async def get_video_silences(video_id: str):
    """Detects silences/pauses in the video for jump-cut preview."""
    if video_id not in video_store:
        raise HTTPException(status_code=404, detail="Video not found")
    video_path = video_store[video_id]["file_path"]
    silences = VideoProcessor.detect_silences(video_path)
    return {"video_id": video_id, "silences": silences}

# Mount Built React Frontend if dist folder exists
FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")
