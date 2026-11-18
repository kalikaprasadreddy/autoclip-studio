from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class LLMProviderConfig(BaseModel):
    provider: str = Field(..., description="openai, anthropic, gemini, groq, openrouter, ollama, lmstudio, custom, or mock")
    api_key: Optional[str] = Field(None, description="API Key for cloud providers")
    base_url: Optional[str] = Field(None, description="Custom base URL for local or proxy endpoints")
    model_name: Optional[str] = Field(None, description="Model identifier (e.g., gpt-4o-mini, llama3.2, gemini-2.0-flash)")

class TranscriptionConfig(BaseModel):
    provider: str = Field("auto", description="groq, openai, local, or mock")
    api_key: Optional[str] = Field(None, description="API Key if using cloud Whisper")
    model: Optional[str] = Field("whisper-large-v3", description="Whisper model name")

class SubtitleWord(BaseModel):
    word: str
    start: float
    end: float

class TranscriptSegment(BaseModel):
    id: int
    start: float
    end: float
    text: str
    words: Optional[List[SubtitleWord]] = []

class VideoInfo(BaseModel):
    id: str
    filename: str
    duration: float
    width: int
    height: int
    fps: float
    size_bytes: int
    has_audio: bool
    url: str

class ClipItem(BaseModel):
    id: str
    title: str
    hook: str
    summary: str
    start_time: float
    end_time: float
    duration: float
    virality_score: int
    virality_reason: str
    hashtags: List[str] = []
    social_caption: str = ""
    transcript_segment: str = ""

class VideoAnalysisRequest(BaseModel):
    video_id: str
    llm_config: LLMProviderConfig
    target_clip_length: str = "30-60s"  # "15-30s", "30-60s", "60-90s", "auto"
    num_clips: int = 5
    topic_focus: Optional[str] = None
    transcript_override: Optional[List[TranscriptSegment]] = None

class SubtitleStyle(BaseModel):
    enabled: bool = True
    preset: str = "hormozi"  # "hormozi", "minimal", "neon", "punchy"
    font_size: int = 24
    primary_color: str = "#FFFFFF"
    highlight_color: str = "#FFE600"
    stroke_color: str = "#000000"
    position: str = "bottom"  # "bottom", "middle"
    uppercase: bool = True
    show_karaoke: bool = True

class RenderRequest(BaseModel):
    video_id: str
    clip_id: str
    start_time: float
    end_time: float
    aspect_ratio: str = "9:16"  # "9:16", "1:1", "16:9"
    crop_mode: str = "crop_center"  # "crop_center", "blur_background", "fit"
    subtitle_style: SubtitleStyle = SubtitleStyle()
    remove_silence: bool = False
    title: Optional[str] = None

class RenderStatus(BaseModel):
    render_id: str
    status: str  # "pending", "processing", "completed", "failed"
    progress: int = 0
    message: str = ""
    output_url: Optional[str] = None
    file_path: Optional[str] = None

class TestConnectionRequest(BaseModel):
    provider: str
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model_name: Optional[str] = None

class TestConnectionResponse(BaseModel):
    success: bool
    message: str
    models: List[str] = []
    latency_ms: Optional[int] = None
