import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Scissors,
  Settings,
  Upload,
  RefreshCw,
  Flame,
  CheckCircle2,
  AlertCircle,
  FileVideo,
  Layers,
  Wand2,
  Cpu,
  KeyRound,
  Download
} from 'lucide-react';

import {
  VideoInfo,
  TranscriptSegment,
  ClipItem,
  LLMConfig,
  SubtitleStyle,
  RenderRequest,
  RenderStatus,
} from './types';
import {
  loadStoredLLMConfig,
  saveStoredLLMConfig,
  loadStoredSubtitleStyle,
  saveStoredSubtitleStyle,
} from './services/storage';
import {
  uploadVideoFile,
  importVideoUrl,
  loadDemoVideo,
  transcribeVideo,
  analyzeClips,
  renderClip,
  pollRenderStatus,
} from './services/api';

import { Navbar } from './components/Navbar';
import { SettingsModal } from './components/SettingsModal';
import { VideoUploader } from './components/VideoUploader';
import { VideoPreviewPlayer } from './components/VideoPreviewPlayer';
import { ClipCard } from './components/ClipCard';
import { ClipEditorModal } from './components/ClipEditorModal';
import { ExportQueue } from './components/ExportQueue';

export function App() {
  // Config States
  const [llmConfig, setLlmConfig] = useState<LLMConfig>(loadStoredLLMConfig);
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyle>(loadStoredSubtitleStyle);

  // Video & Processing States
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [clips, setClips] = useState<ClipItem[]>([]);
  const [activeClip, setActiveClip] = useState<ClipItem | null>(null);
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number } | undefined>(undefined);
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '1:1' | '16:9'>('9:16');

  // Analysis Preferences
  const [targetLength, setTargetLength] = useState<string>('30-60s');
  const [numClips, setNumClips] = useState<number>(4);
  const [topicFocus, setTopicFocus] = useState<string>('');

  // Renders / Exports
  const [renders, setRenders] = useState<RenderStatus[]>([]);

  // Loading States
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isLoadingDemo, setIsLoadingDemo] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [editingClip, setEditingClip] = useState<ClipItem | null>(null);

  // Save config changes to local storage
  const handleSaveLLMConfig = (newConfig: LLMConfig) => {
    setLlmConfig(newConfig);
    saveStoredLLMConfig(newConfig);
  };

  const handleSaveSubtitleStyle = (newStyle: SubtitleStyle) => {
    setSubtitleStyle(newStyle);
    saveStoredSubtitleStyle(newStyle);
  };

  // Upload local video file
  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setStatusMessage('Uploading video file...');
    try {
      const info = await uploadVideoFile(file);
      setVideoInfo(info);
      setClips([]);
      setActiveClip(null);
      setSelectedRange(undefined);
      await runTranscription(info.id);
    } catch (e: any) {
      alert(`Upload failed: ${e.message}`);
    } finally {
      setIsUploading(false);
      setStatusMessage('');
    }
  };

  // Import from YouTube / public link
  const handleUrlImport = async (url: string) => {
    setIsUploading(true);
    setStatusMessage('Downloading video from link (YouTube / Web)...');
    try {
      const info = await importVideoUrl(url);
      setVideoInfo(info);
      setClips([]);
      setActiveClip(null);
      setSelectedRange(undefined);
      await runTranscription(info.id);
    } catch (e: any) {
      alert(`Failed to import from URL: ${e.message}`);
    } finally {
      setIsUploading(false);
      setStatusMessage('');
    }
  };

  // Load demo synthetic video
  const handleLoadDemo = async () => {
    setIsLoadingDemo(true);
    setStatusMessage('Synthesizing demo podcast video...');
    try {
      const info = await loadDemoVideo();
      setVideoInfo(info);
      setClips([]);
      setActiveClip(null);
      setSelectedRange(undefined);
      await runTranscription(info.id);
    } catch (e: any) {
      alert(`Failed to load demo video: ${e.message}`);
    } finally {
      setIsLoadingDemo(false);
      setStatusMessage('');
    }
  };

  // Run speech-to-text
  const runTranscription = async (videoId: string) => {
    setIsTranscribing(true);
    setStatusMessage('Transcribing speech with word-level timestamps (faster-whisper)...');
    try {
      const res = await transcribeVideo(
        videoId,
        llmConfig.provider === 'groq' ? 'groq' : llmConfig.provider === 'openai' ? 'openai' : 'auto',
        llmConfig.apiKey,
        'base'
      );
      setTranscript(res.segments);
      // Auto-trigger clip analysis right after transcription
      await runClipAnalysis(videoId, res.segments);
    } catch (e: any) {
      console.error('Transcription error:', e);
      alert(`Transcription note: ${e.message}`);
    } finally {
      setIsTranscribing(false);
      setStatusMessage('');
    }
  };

  // Extract clips via LLM (BYOK or Local)
  const runClipAnalysis = async (videoId: string, transcriptSegments?: TranscriptSegment[]) => {
    const currentTranscript = transcriptSegments || transcript;
    setIsAnalyzing(true);
    setStatusMessage(`Running AI clip detection with ${llmConfig.provider.toUpperCase()} (${llmConfig.modelName})...`);
    try {
      const res = await analyzeClips(
        videoId,
        llmConfig,
        targetLength,
        numClips,
        topicFocus,
        currentTranscript
      );
      setClips(res.clips);
      if (res.clips.length > 0) {
        handleSelectClip(res.clips[0]);
      }
    } catch (e: any) {
      alert(`AI clip detection failed: ${e.message}`);
    } finally {
      setIsAnalyzing(false);
      setStatusMessage('');
    }
  };

  // Select clip for player preview
  const handleSelectClip = (clip: ClipItem) => {
    setActiveClip(clip);
    setSelectedRange({ start: clip.start_time, end: clip.end_time });
  };

  // Trigger Render & Export
  const handleStartRender = async (req: RenderRequest) => {
    try {
      const res = await renderClip(req);
      setRenders((prev) => [res, ...prev.filter((r) => r.render_id !== res.render_id)]);
    } catch (e: any) {
      alert(`Render failed to start: ${e.message}`);
    }
  };

  // Polling loop for active render jobs
  useEffect(() => {
    const activeJobs = renders.filter((r) => r.status === 'pending' || r.status === 'processing');
    if (activeJobs.length === 0) return;

    const interval = setInterval(async () => {
      for (const job of activeJobs) {
        try {
          const updated = await pollRenderStatus(job.render_id);
          setRenders((prev) =>
            prev.map((r) => (r.render_id === job.render_id ? updated : r))
          );
        } catch (e) {
          console.error(`Error polling render ${job.render_id}:`, e);
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [renders]);

  return (
    <div className="min-h-screen bg-dark-bg text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        llmConfig={llmConfig}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLoadDemo={handleLoadDemo}
        isLoadingDemo={isLoadingDemo}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8">
        {/* Status Notification Toast */}
        {statusMessage && (
          <div className="mb-6 p-3.5 rounded-xl bg-brand-950/60 border border-brand-500/40 text-brand-300 text-xs font-semibold flex items-center gap-3 animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin text-brand-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* State 1: No Video Loaded -> Hero & Uploader */}
        {!videoInfo ? (
          <div className="max-w-3xl mx-auto py-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs font-bold mb-3">
                <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                <span>Bring Your Own Key & 100% Local LLMs Supported</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-2.5">
                Turn Long Videos Into Viral Vertical Shorts
              </h1>
              <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
                Paste YouTube links or upload videos. AI transcribes speech with exact timestamps, extracts high-retention viral moments, and renders 9:16 vertical clips with Hormozi captions.
              </p>
            </div>

            <VideoUploader
              onFileSelected={handleFileUpload}
              onUrlImport={handleUrlImport}
              onLoadDemo={handleLoadDemo}
              isLoading={isUploading}
              isLoadingDemo={isLoadingDemo}
            />

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <div className="p-4 rounded-xl bg-dark-card/50 border border-slate-800">
                <div className="h-8 w-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center mb-2.5">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-sm text-white mb-1">Bring Your Own Key (BYOK)</h4>
                <p className="text-xs text-slate-400">
                  Connect Google Gemini (3.1 Flash), OpenAI (GPT-4o), Groq (Llama-3.3), or Claude with zero markups.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-dark-card/50 border border-slate-800">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2.5">
                  <Cpu className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-sm text-white mb-1">100% Local & Private</h4>
                <p className="text-xs text-slate-400">
                  Integrate Ollama models (llama3.2, mistral) and faster-whisper on CPU for private offline clipping.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-dark-card/50 border border-slate-800">
                <div className="h-8 w-8 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center mb-2.5">
                  <Wand2 className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-sm text-white mb-1">YouTube & Web Links</h4>
                <p className="text-xs text-slate-400">
                  Paste any YouTube URL, Shorts, Vimeo, or web link to download and clip without manual saving.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* State 2: Video Loaded -> Editing & Clipping Studio */
          <div className="space-y-6">
            {/* Video Header Bar */}
            <div className="p-4 rounded-2xl bg-dark-card border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20 flex items-center justify-center shrink-0">
                  <FileVideo className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base line-clamp-1">{videoInfo.filename}</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 font-mono">
                    <span>{videoInfo.duration.toFixed(1)}s duration</span>
                    <span>•</span>
                    <span>{videoInfo.width}x{videoInfo.height}</span>
                    <span>•</span>
                    <span>{videoInfo.fps} fps</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setVideoInfo(null);
                    setClips([]);
                    setActiveClip(null);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                >
                  Change Video
                </button>

                <button
                  type="button"
                  onClick={() => runClipAnalysis(videoInfo.id)}
                  disabled={isAnalyzing}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-600/30 transition active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                  <span>{isAnalyzing ? 'Analyzing...' : 'Re-run AI Clips'}</span>
                </button>
              </div>
            </div>

            {/* AI Clipper Toolbar / Parameters */}
            <div className="p-4 rounded-2xl bg-dark-card/60 border border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                {/* Target Duration */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-semibold">Clip Length:</span>
                  <select
                    value={targetLength}
                    onChange={(e) => setTargetLength(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-dark-bg border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-brand-500"
                  >
                    <option value="15-30s">15 - 30s (Fast)</option>
                    <option value="30-60s">30 - 60s (Standard)</option>
                    <option value="60-90s">60 - 90s (Longer)</option>
                    <option value="auto">Auto Detect</option>
                  </select>
                </div>

                {/* Number of Clips */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-semibold">Max Clips:</span>
                  <select
                    value={numClips}
                    onChange={(e) => setNumClips(parseInt(e.target.value))}
                    className="px-2.5 py-1.5 rounded-lg bg-dark-bg border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-brand-500"
                  >
                    <option value={2}>2 Clips</option>
                    <option value={4}>4 Clips</option>
                    <option value={6}>6 Clips</option>
                    <option value={8}>8 Clips</option>
                  </select>
                </div>

                {/* Topic Focus Input */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={topicFocus}
                    onChange={(e) => setTopicFocus(e.target.value)}
                    placeholder="Focus: e.g. habit loop, advice..."
                    className="px-3 py-1.5 rounded-lg bg-dark-bg border border-slate-700 text-white text-xs focus:outline-none focus:border-brand-500 w-48"
                  />
                </div>
              </div>

              {/* Model Info Pill */}
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-semibold"
              >
                <span>AI: {llmConfig.provider.toUpperCase()} ({llmConfig.modelName})</span>
                <Settings className="w-3 h-3 ml-0.5" />
              </button>
            </div>

            {/* Studio Workspace: Player on Left, Detected Clips on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Interactive Video Preview Player */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                <VideoPreviewPlayer
                  videoUrl={videoInfo.url}
                  transcript={transcript}
                  subtitleStyle={subtitleStyle}
                  selectedRange={selectedRange}
                  aspectRatio={aspectRatio}
                  onAspectRatioChange={setAspectRatio}
                />

                {/* Active Clip Quick Info Bar */}
                {activeClip && (
                  <div className="p-4 rounded-xl bg-dark-card border border-slate-800 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs text-brand-400 font-bold uppercase tracking-wider">
                        Active Preview Clip
                      </div>
                      <div className="text-sm font-bold text-white mt-0.5">{activeClip.title}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingClip(activeClip)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
                      >
                        Edit & Reframe
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleStartRender({
                            video_id: videoInfo.id,
                            clip_id: activeClip.id,
                            start_time: activeClip.start_time,
                            end_time: activeClip.end_time,
                            aspect_ratio: aspectRatio,
                            crop_mode: 'crop_center',
                            subtitle_style: subtitleStyle,
                            remove_silence: false,
                            title: activeClip.title,
                          })
                        }
                        className="px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-xs font-bold text-white shadow-md shadow-brand-600/30 transition active:scale-95"
                      >
                        Render MP4
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: AI Extracted Clips List */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                      <Flame className="w-4 h-4 fill-current" />
                    </div>
                    <h3 className="font-bold text-white text-base">
                      Detected Viral Clips ({clips.length})
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">Ranked by retention</span>
                </div>

                {isAnalyzing ? (
                  <div className="p-8 rounded-2xl bg-dark-card/40 border border-slate-800 flex flex-col items-center justify-center text-center">
                    <RefreshCw className="w-8 h-8 text-brand-400 animate-spin mb-3" />
                    <h4 className="font-bold text-white text-sm mb-1">
                      Extracting Viral Moments...
                    </h4>
                    <p className="text-xs text-slate-400 max-w-xs">
                      AI is evaluating hooks, narrative peaks, and retention dynamics from the transcript using {llmConfig.provider.toUpperCase()}.
                    </p>
                  </div>
                ) : clips.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-dark-card/40 border border-slate-800 text-center">
                    <p className="text-sm text-slate-400 mb-3">No clips extracted yet.</p>
                    <button
                      type="button"
                      onClick={() => runClipAnalysis(videoInfo.id)}
                      className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold"
                    >
                      Extract Clips Now
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3.5 max-h-[720px] overflow-y-auto pr-1">
                    {clips.map((clip) => (
                      <ClipCard
                        key={clip.id}
                        clip={clip}
                        isActive={activeClip?.id === clip.id}
                        onPreview={handleSelectClip}
                        onEdit={(c) => setEditingClip(c)}
                        onRender={(c) =>
                          handleStartRender({
                            video_id: videoInfo.id,
                            clip_id: c.id,
                            start_time: c.start_time,
                            end_time: c.end_time,
                            aspect_ratio: aspectRatio,
                            crop_mode: 'crop_center',
                            subtitle_style: subtitleStyle,
                            remove_silence: false,
                            title: c.title,
                          })
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Render / Export Queue Section */}
            {renders.length > 0 && (
              <div className="mt-8">
                <ExportQueue
                  renders={renders}
                  onDismiss={(id) => setRenders((prev) => prev.filter((r) => r.render_id !== id))}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Settings Modal (BYOK & Local LLMs) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={llmConfig}
        onSave={handleSaveLLMConfig}
      />

      {/* Clip Fine-Tuning & Subtitle Styler Modal */}
      {editingClip && videoInfo && (
        <ClipEditorModal
          isOpen={true}
          onClose={() => setEditingClip(null)}
          clip={editingClip}
          videoId={videoInfo.id}
          defaultSubtitleStyle={subtitleStyle}
          onStartRender={handleStartRender}
        />
      )}
    </div>
  );
}

export default App;
