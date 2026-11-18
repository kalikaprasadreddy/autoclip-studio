import React, { useState } from 'react';
import {
  X,
  Scissors,
  Smartphone,
  Square,
  Monitor,
  Sparkles,
  Download,
  VolumeX,
  Sliders,
  Type
} from 'lucide-react';
import { ClipItem, RenderRequest, SubtitleStyle } from '../types';
import { SubtitleStyler } from './SubtitleStyler';

interface ClipEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  clip: ClipItem;
  videoId: string;
  defaultSubtitleStyle: SubtitleStyle;
  onStartRender: (req: RenderRequest) => void;
}

export const ClipEditorModal: React.FC<ClipEditorModalProps> = ({
  isOpen,
  onClose,
  clip,
  videoId,
  defaultSubtitleStyle,
  onStartRender,
}) => {
  if (!isOpen) return null;

  const [startTime, setStartTime] = useState(clip.start_time);
  const [endTime, setEndTime] = useState(clip.end_time);
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '1:1' | '16:9'>('9:16');
  const [cropMode, setCropMode] = useState<'crop_center' | 'blur_background' | 'fit'>('crop_center');
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyle>({ ...defaultSubtitleStyle });
  const [removeSilence, setRemoveSilence] = useState(false);
  const [clipTitle, setClipTitle] = useState(clip.title);

  const duration = Math.max(0.5, endTime - startTime);

  const handleRender = () => {
    onStartRender({
      video_id: videoId,
      clip_id: clip.id,
      start_time: startTime,
      end_time: endTime,
      aspect_ratio: aspectRatio,
      crop_mode: cropMode,
      subtitle_style: subtitleStyle,
      remove_silence: removeSilence,
      title: clipTitle,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-dark-card border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-dark-bg/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Clip Editor & Reframing Studio</h3>
              <p className="text-xs text-slate-400">Trim timestamps, customize 9:16 framing, and style captions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Title Edit */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Clip Title
            </label>
            <input
              type="text"
              value={clipTitle}
              onChange={(e) => setClipTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-dark-bg border border-slate-700 text-white font-semibold text-sm focus:outline-none focus:border-brand-500 transition"
            />
          </div>

          {/* Timestamp Trimming Controls */}
          <div className="bg-dark-bg/60 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-brand-400" />
                <span>Fine-Tune Timestamps</span>
              </label>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
                Duration: {duration.toFixed(1)}s
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Start Time */}
              <div>
                <span className="text-xs text-slate-400 font-semibold block mb-1">
                  Start Time: <span className="text-white font-mono">{startTime.toFixed(1)}s</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setStartTime(Math.max(0, startTime - 1))}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300"
                  >
                    -1s
                  </button>
                  <button
                    type="button"
                    onClick={() => setStartTime(Math.max(0, startTime - 0.2))}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300"
                  >
                    -0.2s
                  </button>
                  <button
                    type="button"
                    onClick={() => setStartTime(Math.min(endTime - 1, startTime + 0.2))}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300"
                  >
                    +0.2s
                  </button>
                  <button
                    type="button"
                    onClick={() => setStartTime(Math.min(endTime - 1, startTime + 1))}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300"
                  >
                    +1s
                  </button>
                </div>
              </div>

              {/* End Time */}
              <div>
                <span className="text-xs text-slate-400 font-semibold block mb-1">
                  End Time: <span className="text-white font-mono">{endTime.toFixed(1)}s</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEndTime(Math.max(startTime + 1, endTime - 1))}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300"
                  >
                    -1s
                  </button>
                  <button
                    type="button"
                    onClick={() => setEndTime(Math.max(startTime + 0.5, endTime - 0.2))}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300"
                  >
                    -0.2s
                  </button>
                  <button
                    type="button"
                    onClick={() => setEndTime(endTime + 0.2)}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300"
                  >
                    +0.2s
                  </button>
                  <button
                    type="button"
                    onClick={() => setEndTime(endTime + 1)}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300"
                  >
                    +1s
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Aspect Ratio & Framing Mode */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Output Aspect Ratio
            </label>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { id: '9:16', label: '9:16 Vertical', desc: 'Shorts, TikTok, Reels', icon: Smartphone },
                { id: '1:1', label: '1:1 Square', desc: 'Feed & LinkedIn', icon: Square },
                { id: '16:9', label: '16:9 Landscape', desc: 'YouTube & Desktop', icon: Monitor },
              ].map((r) => {
                const Icon = r.icon;
                const isSelected = aspectRatio === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setAspectRatio(r.id as any)}
                    className={`p-3 rounded-xl border text-left transition ${
                      isSelected
                        ? 'border-brand-500 bg-brand-950/40 ring-1 ring-brand-500 shadow-md shadow-brand-500/10'
                        : 'border-slate-800 bg-dark-bg/60 hover:border-slate-700'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mb-1.5 ${isSelected ? 'text-brand-400' : 'text-slate-400'}`} />
                    <div className="text-xs font-bold text-white">{r.label}</div>
                    <div className="text-[10px] text-slate-400">{r.desc}</div>
                  </button>
                );
              })}
            </div>

            {/* Crop Framing Mode */}
            {aspectRatio !== '16:9' && (
              <div className="bg-dark-bg/40 p-3 rounded-xl border border-slate-800/80">
                <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                  Framing Strategy
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'crop_center', label: 'Smart Center Crop', desc: 'Fills entire 9:16 canvas' },
                    { id: 'blur_background', label: 'Blurred Backdrop', desc: 'Shows full video with blurred edges' },
                    { id: 'fit', label: 'Pillarbox Fit', desc: 'Clean black letterboxing' },
                  ].map((cm) => (
                    <button
                      key={cm.id}
                      type="button"
                      onClick={() => setCropMode(cm.id as any)}
                      className={`p-2 rounded-lg text-left border transition text-xs ${
                        cropMode === cm.id
                          ? 'border-brand-500 bg-brand-900/30 text-white font-semibold'
                          : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div>{cm.label}</div>
                      <div className="text-[10px] opacity-70 mt-0.5">{cm.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Subtitle Customizer */}
          <div className="border-t border-slate-800 pt-4">
            <SubtitleStyler style={subtitleStyle} onChange={setSubtitleStyle} />
          </div>

          {/* Silence Removal Toggle */}
          <div className="p-3.5 rounded-xl bg-dark-bg/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                <VolumeX className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Auto-cut Pauses & Silences</div>
                <div className="text-[11px] text-slate-400">
                  Automatically jump-cuts awkward dead air gaps (&gt;0.6s) to maximize watch time.
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={removeSilence}
              onChange={(e) => setRemoveSilence(e.target.checked)}
              className="w-4 h-4 rounded accent-brand-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-dark-bg/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 text-sm font-medium transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleRender}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm shadow-xl shadow-brand-600/30 transition active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Render Final Clip MP4</span>
          </button>
        </div>
      </div>
    </div>
  );
};
