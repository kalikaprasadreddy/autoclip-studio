import React, { useState } from 'react';
import {
  Download,
  Play,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { RenderStatus } from '../types';

interface ExportQueueProps {
  renders: RenderStatus[];
  onDismiss: (renderId: string) => void;
}

export const ExportQueue: React.FC<ExportQueueProps> = ({ renders, onDismiss }) => {
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);

  if (renders.length === 0) return null;

  return (
    <div className="bg-dark-card border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Download className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-white text-base">Export Queue & Rendered Clips</h3>
        </div>
        <span className="text-xs font-mono text-slate-400">
          {renders.filter((r) => r.status === 'completed').length} / {renders.length} completed
        </span>
      </div>

      <div className="space-y-3">
        {renders.map((item) => (
          <div
            key={item.render_id}
            className="p-3.5 rounded-xl bg-dark-bg/60 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              {item.status === 'completed' && (
                <div className="h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              )}
              {item.status === 'processing' && (
                <div className="h-9 w-9 rounded-xl bg-brand-500/20 text-brand-400 border border-brand-500/30 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 animate-spin" />
                </div>
              )}
              {item.status === 'pending' && (
                <div className="h-9 w-9 rounded-xl bg-slate-800 text-slate-400 border border-slate-700 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
              )}
              {item.status === 'failed' && (
                <div className="h-9 w-9 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
              )}

              <div>
                <div className="font-bold text-white text-sm">
                  Render #{item.render_id}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">{item.message}</div>
              </div>
            </div>

            {/* Actions & Progress */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {item.status === 'processing' && (
                <div className="w-32 bg-slate-800 rounded-full h-2 overflow-hidden mr-2">
                  <div
                    className="bg-brand-500 h-full transition-all duration-300"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              )}

              {item.status === 'completed' && item.output_url && (
                <>
                  <button
                    type="button"
                    onClick={() => setPlayingUrl(item.output_url || null)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Watch</span>
                  </button>

                  <a
                    href={item.output_url}
                    download={`clip_${item.render_id}.mp4`}
                    className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download MP4</span>
                  </a>
                </>
              )}

              <button
                type="button"
                onClick={() => onDismiss(item.render_id)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Rendered Video Player Modal */}
      {playingUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-dark-card border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <span className="font-bold text-white text-sm">Exported MP4 Preview</span>
              <button
                onClick={() => setPlayingUrl(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-black flex items-center justify-center">
              <video
                src={playingUrl}
                controls
                autoPlay
                className="max-h-[70vh] rounded-xl shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
