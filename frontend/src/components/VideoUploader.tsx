import React, { useRef, useState } from 'react';
import { UploadCloud, Link as LinkIcon, PlayCircle, Sparkles, Video, ArrowRight } from 'lucide-react';

interface VideoUploaderProps {
  onFileSelected: (file: File) => void;
  onUrlImport: (url: string) => void;
  onLoadDemo: () => void;
  isLoading: boolean;
  isLoadingDemo: boolean;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({
  onFileSelected,
  onUrlImport,
  onLoadDemo,
  isLoading,
  isLoadingDemo,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('video/')) {
        onFileSelected(file);
      } else {
        alert('Please upload a video file (.mp4, .mov, .webm, .mkv)');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelected(e.target.files[0]);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = videoUrl.trim();
    if (!trimmed) return;
    setIsImporting(true);
    onUrlImport(trimmed);
  };

  return (
    <div className="w-full space-y-4">
      {/* 1. Drag & Drop File Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-6 lg:p-10 text-center cursor-pointer transition flex flex-col items-center justify-center ${
          isDragging
            ? 'border-brand-500 bg-brand-950/20 shadow-2xl shadow-brand-500/20'
            : 'border-slate-800 bg-dark-card/50 hover:border-slate-700 hover:bg-dark-card/80'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/x-matroska"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="h-14 w-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 mb-3 group-hover:scale-105 transition">
          <UploadCloud className="w-7 h-7" />
        </div>

        <h3 className="text-base font-bold text-white mb-1">
          {isLoading ? 'Processing video file...' : 'Drop your video file here or click to browse'}
        </h3>
        <p className="text-xs text-slate-400 max-w-md mb-3">
          Upload any podcast, interview, speech, webinar, or tutorial (.mp4, .mov, .webm, .mkv)
        </p>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
          <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60">MP4</span>
          <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60">MOV</span>
          <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60">WEBM</span>
          <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60">MKV</span>
        </div>
      </div>

      {/* 2. YouTube / Public URL Import Bar */}
      <div className="p-4 rounded-xl bg-dark-card border border-slate-800 shadow-sm">
        <form onSubmit={handleUrlSubmit} className="flex flex-col sm:flex-row items-center gap-2.5">
          <div className="relative w-full flex-1">
            <div className="absolute left-3.5 top-3 text-red-500">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </div>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="Paste YouTube or public video URL (e.g., https://www.youtube.com/watch?v=...)"
              className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-dark-bg border border-slate-700 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-brand-500 transition font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={!videoUrl.trim() || isLoading}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-red-600/20 flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50 shrink-0"
          >
            <span>{isLoading ? 'Importing...' : 'Import Video'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
        <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
          <LinkIcon className="w-3 h-3 text-slate-400" />
          <span>Supports YouTube links, Shorts, Vimeo, Twitter/X, and direct .mp4/.webm video URLs</span>
        </p>
      </div>

      {/* 3. Instant Demo Quick-Start Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-brand-950/40 via-dark-card to-dark-bg border border-brand-900/40 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-left">
          <div className="p-2.5 rounded-xl bg-brand-500/20 text-brand-400 border border-brand-500/30 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>Try without uploading?</span>
              <span className="text-[10px] uppercase font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                Instant Demo
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Load our sample Tech Founder podcast with sound & visual cards to test clipping immediately.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLoadDemo}
          disabled={isLoadingDemo}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50 shrink-0"
        >
          <PlayCircle className="w-4 h-4 text-brand-400" />
          <span>{isLoadingDemo ? 'Generating Demo...' : 'Load Sample Video'}</span>
        </button>
      </div>
    </div>
  );
};
