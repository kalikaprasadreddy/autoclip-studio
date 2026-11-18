export interface VideoInfo {
  id: string;
  filename: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
  size_bytes: number;
  has_audio: boolean;
  url: string;
}

export interface SubtitleWord {
  word: string;
  start: number;
  end: number;
}

export interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  words?: SubtitleWord[];
}

export interface ClipItem {
  id: string;
  title: string;
  hook: string;
  summary: string;
  start_time: number;
  end_time: number;
  duration: number;
  virality_score: number;
  virality_reason: string;
  hashtags: string[];
  social_caption: string;
  transcript_segment: string;
}

export type LLMProvider = 
  | 'mock'
  | 'groq'
  | 'openai'
  | 'gemini'
  | 'anthropic'
  | 'ollama'
  | 'lmstudio'
  | 'openrouter'
  | 'custom';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  baseUrl: string;
  modelName: string;
}

export interface SubtitleStyle {
  enabled: boolean;
  preset: 'hormozi' | 'minimal' | 'neon' | 'punchy';
  font_size: number;
  primary_color: string;
  highlight_color: string;
  stroke_color: string;
  position: 'bottom' | 'middle';
  uppercase: boolean;
  show_karaoke: boolean;
}

export interface RenderRequest {
  video_id: string;
  clip_id: string;
  start_time: number;
  end_time: number;
  aspect_ratio: '9:16' | '1:1' | '16:9';
  crop_mode: 'crop_center' | 'blur_background' | 'fit';
  subtitle_style: SubtitleStyle;
  remove_silence: boolean;
  title?: string;
}

export interface RenderStatus {
  render_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  output_url?: string;
  file_path?: string;
  created_at?: string;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  models: string[];
  latency_ms?: number;
}
