import {
  VideoInfo,
  TranscriptSegment,
  ClipItem,
  LLMConfig,
  RenderRequest,
  RenderStatus,
  TestConnectionResult
} from '../types';

const API_BASE = '/api';

export async function uploadVideoFile(file: File): Promise<VideoInfo> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(err.detail || 'Upload failed');
  }
  return res.json();
}

export async function importVideoUrl(url: string): Promise<VideoInfo> {
  const res = await fetch(`${API_BASE}/import-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to import video from URL' }));
    throw new Error(err.detail || 'Failed to import video from URL');
  }
  return res.json();
}

export async function loadDemoVideo(): Promise<VideoInfo> {
  const res = await fetch(`${API_BASE}/generate-sample`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw new Error('Failed to generate sample video');
  }
  return res.json();
}

export async function transcribeVideo(
  videoId: string,
  provider: string = 'auto',
  apiKey?: string,
  model?: string
): Promise<{ video_id: string; segments: TranscriptSegment[]; total_words: number }> {
  const formData = new FormData();
  formData.append('video_id', videoId);
  formData.append('provider', provider);
  if (apiKey) formData.append('api_key', apiKey);
  if (model) formData.append('model', model);

  const res = await fetch(`${API_BASE}/transcribe`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Transcription failed' }));
    throw new Error(err.detail || 'Transcription failed');
  }
  return res.json();
}

export async function testConnection(config: LLMConfig): Promise<TestConnectionResult> {
  const res = await fetch(`${API_BASE}/test-connection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: config.provider,
      api_key: config.apiKey || undefined,
      base_url: config.baseUrl || undefined,
      model_name: config.modelName || undefined,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Connection test failed' }));
    return { success: false, message: err.detail || 'Failed to connect', models: [] };
  }
  return res.json();
}

export async function discoverLocalModels(): Promise<{
  ollama: { available: boolean; models: string[] };
  lmstudio: { available: boolean; models: string[] };
}> {
  const res = await fetch(`${API_BASE}/local-models`);
  if (!res.ok) {
    return {
      ollama: { available: false, models: [] },
      lmstudio: { available: false, models: [] }
    };
  }
  return res.json();
}

export async function analyzeClips(
  videoId: string,
  llmConfig: LLMConfig,
  targetClipLength: string = '30-60s',
  numClips: number = 4,
  topicFocus?: string,
  transcriptOverride?: TranscriptSegment[]
): Promise<{ video_id: string; clips: ClipItem[] }> {
  const res = await fetch(`${API_BASE}/analyze-clips`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      video_id: videoId,
      llm_config: {
        provider: llmConfig.provider,
        api_key: llmConfig.apiKey || undefined,
        base_url: llmConfig.baseUrl || undefined,
        model_name: llmConfig.modelName || undefined,
      },
      target_clip_length: targetClipLength,
      num_clips: numClips,
      topic_focus: topicFocus || undefined,
      transcript_override: transcriptOverride,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Clip analysis failed' }));
    throw new Error(err.detail || 'Clip analysis failed');
  }
  return res.json();
}

export async function renderClip(req: RenderRequest): Promise<RenderStatus> {
  const res = await fetch(`${API_BASE}/render-clip`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Render request failed' }));
    throw new Error(err.detail || 'Render request failed');
  }
  return res.json();
}

export async function pollRenderStatus(renderId: string): Promise<RenderStatus> {
  const res = await fetch(`${API_BASE}/renders/${renderId}/status`);
  if (!res.ok) {
    throw new Error('Failed to fetch render status');
  }
  return res.json();
}

export async function getSilences(videoId: string): Promise<{ silences: Array<{ start: number; end: number; duration: number }> }> {
  const res = await fetch(`${API_BASE}/silences/${videoId}`);
  if (!res.ok) {
    return { silences: [] };
  }
  return res.json();
}
