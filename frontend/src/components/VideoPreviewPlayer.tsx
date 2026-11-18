import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Smartphone,
  Square,
  Monitor
} from 'lucide-react';
import { TranscriptSegment, SubtitleStyle } from '../types';

interface VideoPreviewPlayerProps {
  videoUrl: string;
  transcript?: TranscriptSegment[];
  subtitleStyle?: SubtitleStyle;
  selectedRange?: { start: number; end: number };
  aspectRatio: '9:16' | '1:1' | '16:9';
  onAspectRatioChange: (ratio: '9:16' | '1:1' | '16:9') => void;
}

export const VideoPreviewPlayer: React.FC<VideoPreviewPlayerProps> = ({
  videoUrl,
  transcript = [],
  subtitleStyle,
  selectedRange,
  aspectRatio,
  onAspectRatioChange,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [activeSubtitle, setActiveSubtitle] = useState<string>('');

  // Handle Play/Pause
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Seek to clip start when selectedRange changes
  useEffect(() => {
    if (selectedRange && videoRef.current) {
      videoRef.current.currentTime = selectedRange.start;
      setCurrentTime(selectedRange.start);
    }
  }, [selectedRange?.start]);

  // Sync current subtitle with currentTime
  useEffect(() => {
    if (!subtitleStyle?.enabled || transcript.length === 0) {
      setActiveSubtitle('');
      return;
    }

    const currentSeg = transcript.find(
      (s) => currentTime >= s.start && currentTime <= s.end
    );

    if (currentSeg) {
      // If words exist, check for active 3-word chunk
      if (currentSeg.words && currentSeg.words.length > 0 && subtitleStyle.show_karaoke) {
        const activeWord = currentSeg.words.find(
          (w) => currentTime >= w.start && currentTime <= w.end
        );
        if (activeWord) {
          const wText = subtitleStyle.uppercase ? activeWord.word.toUpperCase() : activeWord.word;
          setActiveSubtitle(wText);
        } else {
          setActiveSubtitle(subtitleStyle.uppercase ? currentSeg.text.toUpperCase() : currentSeg.text);
        }
      } else {
        setActiveSubtitle(subtitleStyle.uppercase ? currentSeg.text.toUpperCase() : currentSeg.text);
      }
    } else {
      setActiveSubtitle('');
    }
  }, [currentTime, transcript, subtitleStyle]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    setCurrentTime(t);

    // Auto-loop clip range if selectedRange is set
    if (selectedRange && t >= selectedRange.end) {
      videoRef.current.currentTime = selectedRange.start;
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Get Aspect Ratio Container Sizing
  const getAspectContainerStyle = () => {
    switch (aspectRatio) {
      case '9:16':
        return 'aspect-[9/16] max-h-[520px] w-auto mx-auto shadow-2xl rounded-2xl overflow-hidden ring-2 ring-brand-500/40';
      case '1:1':
        return 'aspect-square max-h-[460px] w-auto mx-auto shadow-2xl rounded-2xl overflow-hidden ring-2 ring-brand-500/40';
      case '16:9':
      default:
        return 'aspect-video w-full rounded-2xl overflow-hidden ring-1 ring-slate-800';
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Aspect Ratio Selector Toolbar */}
      <div className="flex items-center gap-1.5 p-1 bg-dark-bg/80 border border-slate-800 rounded-xl mb-3 shadow-sm">
        <button
          type="button"
          onClick={() => onAspectRatioChange('9:16')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            aspectRatio === '9:16'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>9:16 Vertical (Shorts/Reels)</span>
        </button>

        <button
          type="button"
          onClick={() => onAspectRatioChange('1:1')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            aspectRatio === '1:1'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Square className="w-3.5 h-3.5" />
          <span>1:1 Square</span>
        </button>

        <button
          type="button"
          onClick={() => onAspectRatioChange('16:9')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            aspectRatio === '16:9'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>16:9 Full</span>
        </button>
      </div>

      {/* Video Viewport with Live Aspect Framing and Dynamic Captions */}
      <div className="w-full bg-black/60 rounded-2xl p-2 sm:p-4 flex items-center justify-center border border-slate-800/80">
        <div className={`relative ${getAspectContainerStyle()} bg-black flex items-center justify-center`}>
          <video
            ref={videoRef}
            src={videoUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onClick={togglePlay}
            className={`w-full h-full object-cover cursor-pointer select-none`}
            playsInline
          />

          {/* Dynamic Burned-in Subtitles Overlay Preview */}
          {subtitleStyle?.enabled && activeSubtitle && (
            <div
              className={`absolute left-0 right-0 px-4 text-center pointer-events-none transition-all duration-75 z-20 ${
                subtitleStyle.position === 'middle' ? 'top-1/2 -translate-y-1/2' : 'bottom-10'
              }`}
            >
              <span
                style={{
                  fontSize: `${Math.max(16, subtitleStyle.font_size * 0.85)}px`,
                  color: subtitleStyle.preset === 'hormozi' ? subtitleStyle.highlight_color : subtitleStyle.primary_color,
                }}
                className={`inline-block px-3 py-1 rounded-md ${
                  subtitleStyle.preset === 'hormozi'
                    ? 'font-caption-hormozi tracking-wide'
                    : subtitleStyle.preset === 'neon'
                    ? 'font-caption-neon tracking-wide'
                    : 'font-sans font-bold bg-black/60 backdrop-blur-sm'
                }`}
              >
                {activeSubtitle}
              </span>
            </div>
          )}

          {/* Center Play Overlay when Paused */}
          {!isPlaying && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-brand-600/90 text-white flex items-center justify-center shadow-xl shadow-brand-600/40 hover:scale-110 transition active:scale-95"
            >
              <Play className="w-6 h-6 ml-0.5" />
            </button>
          )}
        </div>
      </div>

      {/* Scrubber & Player Controls */}
      <div className="w-full mt-3 bg-dark-card/90 border border-slate-800/80 rounded-xl p-3 flex flex-col gap-2">
        {/* Timeline Range Bar */}
        <div className="relative w-full flex items-center">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setCurrentTime(val);
              if (videoRef.current) videoRef.current.currentTime = val;
            }}
            className="w-full accent-brand-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
          />

          {/* Range highlight if selectedRange exists */}
          {selectedRange && duration > 0 && (
            <div
              className="absolute h-1.5 bg-brand-400/40 pointer-events-none rounded"
              style={{
                left: `${(selectedRange.start / duration) * 100}%`,
                width: `${((selectedRange.end - selectedRange.start) / duration) * 100}%`,
              }}
            />
          )}
        </div>

        {/* Action Controls & Timestamps */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = selectedRange ? selectedRange.start : 0;
                }
              }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Restart Clip"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.muted = !isMuted;
                  setIsMuted(!isMuted);
                }
              }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <span className="font-mono text-slate-300 font-semibold">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {selectedRange && (
            <div className="font-mono text-xs px-2.5 py-1 rounded-md bg-brand-500/10 border border-brand-500/30 text-brand-300">
              Active Clip: <span className="font-bold">{formatTime(selectedRange.start)} - {formatTime(selectedRange.end)}</span> ({(selectedRange.end - selectedRange.start).toFixed(1)}s)
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
